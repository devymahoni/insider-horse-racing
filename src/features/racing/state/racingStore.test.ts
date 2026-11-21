import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { watch } from 'vue'
import { createUseRacingStore } from './racingStore'
import type { RaceRuntime, RuntimeCallbacks } from '../runtime/raceRuntime'

class FakeRuntime implements RaceRuntime {
  time = 0
  starts = 0
  stops = 0
  disposals = 0
  current: RuntimeCallbacks | null = null
  callbacks: RuntimeCallbacks[] = []
  clockError: unknown
  startError: unknown
  stopError: unknown
  disposeError: unknown
  now() { if (this.clockError) throw this.clockError; return this.time }
  start(callbacks: RuntimeCallbacks) {
    this.starts++
    if (this.startError) throw this.startError
    this.current = callbacks
    this.callbacks.push(callbacks)
  }
  stop() { this.stops++; this.current = null; if (this.stopError) throw this.stopError }
  dispose() { this.disposals++; this.current = null; if (this.disposeError) throw this.disposeError }
  tick(delta = 1000) { this.time += delta; this.current?.onFrame(this.time) }
  hidden() { this.current?.onVisibility(true) }
}

function setup() {
  const runtime = new FakeRuntime()
  let calls = 0
  let randomFailure = false
  const useStore = createUseRacingStore({
    createRuntime: () => runtime,
    random: () => { calls++; if (randomFailure) throw new Error('Random failed'); return 0.5 },
  })
  const store = useStore(createPinia())
  return { store, runtime, calls: () => calls, failRandom: (fail = true) => { randomFailure = fail } }
}

function finishCurrentRound(context: ReturnType<typeof setup>) {
  const index = context.store.state.activeRoundIndex
  for (let step = 0; step < 20 && context.store.state.phase === 'Running' &&
    context.store.state.activeRoundIndex === index; step++) context.runtime.tick()
}

function finishSchedule(context: ReturnType<typeof setup>) {
  for (let frame = 0; frame < 100 && context.store.state.phase === 'Running'; frame++) context.runtime.tick()
}

describe('racing lifecycle store', () => {
  it('starts Idle with derived controls and no effects', () => {
    const { store, runtime, calls } = setup()
    expect(store.state.phase).toBe('Idle')
    expect(store.canGenerate).toBe(true)
    expect([store.canStart, store.canPause, store.canResume]).toEqual([false, false, false])
    expect(store.positions).toEqual([])
    expect(runtime.starts).toBe(0)
    expect(calls()).toBe(0)
  })

  it('generates a valid pool and balanced schedule atomically without profiles', () => {
    const { store, calls } = setup()
    const snapshots: number[] = []
    watch(() => store.state, (value) => snapshots.push(value.horses.length), { flush: 'sync' })
    store.generate()
    expect(snapshots).toEqual([20])
    expect(store.state.phase).toBe('Ready')
    expect(store.state.schedule?.rounds).toHaveLength(6)
    expect(store.state.activeProfile).toBeNull()
    const scheduleCalls = calls()
    store.start()
    expect(calls() - scheduleCalls).toBe(100)
  })

  it('regenerates a fresh pool and schedule while Ready', () => {
    const { store } = setup()
    store.generate()
    const pool = store.state.horses
    const schedule = store.state.schedule
    store.generate()
    expect(store.state.horses).not.toBe(pool)
    expect(store.state.schedule).not.toBe(schedule)
    expect(store.state.results).toEqual([])
  })

  it('guards invalid actions in Idle', () => {
    const { store, runtime, calls } = setup()
    store.start(); store.pause(); store.resume()
    expect(store.state.phase).toBe('Idle')
    expect(runtime.starts).toBe(0)
    expect(calls()).toBe(0)
  })

  it('rejects Generate during Running and Paused without consuming randomness', () => {
    const { store, runtime, calls } = setup()
    store.generate(); store.start(); runtime.tick(100)
    const before = store.state
    const used = calls()
    store.generate()
    expect(store.state).toBe(before)
    store.pause()
    const paused = store.state
    store.generate()
    expect(store.state).toBe(paused)
    expect(calls()).toBe(used)
  })

  it('duplicate Start and invalid Resume create no additional stream/profile', () => {
    const { store, runtime, calls } = setup()
    store.generate(); store.start()
    const used = calls()
    store.start(); store.start(); store.resume()
    expect(runtime.starts).toBe(1)
    expect(calls()).toBe(used)
  })

  it('runs six rounds sequentially and publishes exactly once', () => {
    const context = setup()
    context.store.generate(); context.store.start()
    const startCalls = context.calls()
    for (let round = 0; round < 6; round++) {
      expect(context.store.state.activeRoundIndex).toBe(round)
      expect(context.store.state.results).toHaveLength(round)
      finishCurrentRound(context)
      expect(context.store.state.results).toHaveLength(round + 1)
      expect(context.store.state.results[round]?.finishers.map((f) => f.rank)).toEqual([1,2,3,4,5,6,7,8,9,10])
    }
    expect(context.store.state.phase).toBe('Completed')
    expect(context.calls() - startCalls).toBe(500)
    expect(context.runtime.starts).toBe(6)
    context.runtime.callbacks.forEach((callbacks) => callbacks.onFrame(999999))
    expect(context.store.state.results).toHaveLength(6)
  })

  it('discards surplus frame time at a round boundary', () => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    for (let i = 0; i < 4; i++) runtime.tick()
    runtime.tick(900)
    runtime.tick(200)
    expect(store.state.results).toHaveLength(1)
    expect(store.state.activeRoundIndex).toBe(1)
    expect(store.state.elapsedMs).toBe(0)
    expect(store.positions.every((p) => p.progress === 0)).toBe(true)
  })

  it('pauses at the current clock and resumes without counting paused time', () => {
    const { store, runtime, calls } = setup()
    store.generate(); store.start(); runtime.tick(400)
    runtime.time += 100
    const profile = store.state.activeProfile
    store.pause()
    expect(store.state.elapsedMs).toBe(500)
    expect(store.state.phase).toBe('Paused')
    expect(store.state.activeProfile).toBe(profile)
    const positions = store.positions
    runtime.time += 10000
    const used = calls()
    store.pause(); store.start(); store.resume(); store.resume()
    expect(calls()).toBe(used)
    expect(store.state.elapsedMs).toBe(500)
    expect(store.positions).toEqual(positions)
    expect(runtime.starts).toBe(2)
    runtime.tick(200)
    expect(store.state.elapsedMs).toBe(700)
  })

  it('pause at completion publishes once and defers the next profile until Resume', () => {
    const { store, runtime, calls } = setup()
    store.generate(); store.start()
    for (let i = 0; i < 4; i++) runtime.tick()
    const used = calls()
    runtime.time += 1000
    store.pause()
    expect(store.state.phase).toBe('Paused')
    expect(store.state.results).toHaveLength(1)
    expect(store.state.activeProfile).toBeNull()
    expect(store.state.elapsedMs).toBe(0)
    expect(calls()).toBe(used)
    runtime.time += 5000
    store.resume()
    expect(calls() - used).toBe(100)
    expect(store.state.activeRoundIndex).toBe(1)
    expect(store.state.elapsedMs).toBe(0)
  })

  it('pause completing the final round enters Completed', () => {
    const context = setup()
    context.store.generate(); context.store.start()
    for (let round = 0; round < 5; round++) finishCurrentRound(context)
    for (let i = 0; i < 8; i++) context.runtime.tick()
    context.runtime.time += 1000
    context.store.pause()
    expect(context.store.state.phase).toBe('Completed')
    expect(context.store.state.results).toHaveLength(6)
  })

  it('auto-pauses hidden sessions, settles progress and requires explicit Resume', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); runtime.tick(200)
    runtime.time += 100
    const callbacks = runtime.current!
    runtime.hidden()
    expect(store.state.phase).toBe('Paused')
    expect(store.state.pauseReason).toBe('hidden')
    expect(store.state.elapsedMs).toBe(300)
    callbacks.onVisibility(false)
    expect(store.state.phase).toBe('Paused')
    store.resume()
    expect(store.state.phase).toBe('Running')
  })

  it('oversized gaps pause without consuming their elapsed time', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); runtime.tick(200)
    runtime.tick(1001)
    expect(store.state.phase).toBe('Paused')
    expect(store.state.pauseReason).toBe('frame-gap')
    expect(store.state.elapsedMs).toBe(200)
  })

  it('exactly 1000ms and repeated timestamps are safe', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); runtime.tick(1000); runtime.tick(0)
    expect(store.state.phase).toBe('Running')
    expect(store.state.elapsedMs).toBe(1000)
  })

  it.each([NaN, Infinity, -Infinity, -1])('rejects invalid frame timestamp %s safely', (timestamp) => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    runtime.current!.onFrame(timestamp)
    expect(store.state.phase).toBe('Error')
    expect(store.state.error?.operation).toBe('frame')
    expect(runtime.current).toBeNull()
  })

  it('rejects backwards timestamps', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); runtime.tick(500)
    runtime.current!.onFrame(499)
    expect(store.state.phase).toBe('Error')
    expect(store.state.elapsedMs).toBe(500)
  })

  it('stale frame/visibility/error callbacks cannot alter resumed or regenerated sessions', () => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    const old = runtime.current!
    store.pause(); store.resume()
    const current = store.state
    old.onFrame(999999); old.onVisibility(true); old.onError(new Error('old'))
    expect(store.state).toBe(current)
    runtime.current!.onError(new Error('new'))
    store.generate()
    const ready = store.state
    old.onFrame(999999)
    expect(store.state).toBe(ready)
  })

  it('regeneration clears completed results and replay is forbidden', () => {
    const context = setup()
    context.store.generate(); context.store.start(); finishSchedule(context)
    const completed = context.store.state
    context.store.start(); context.store.resume(); context.store.pause()
    expect(context.store.state).toBe(completed)
    context.store.generate()
    expect(context.store.state.phase).toBe('Ready')
    expect(context.store.state.results).toEqual([])
    expect(context.store.state.elapsedMs).toBe(0)
  })

  it('generation failure preserves prior pool/schedule/results and can recover', () => {
    const context = setup()
    context.store.generate(); context.store.start(); finishSchedule(context)
    const prior = context.store.state
    context.failRandom(); context.store.generate()
    expect(context.store.state.phase).toBe('Error')
    expect(context.store.state.horses).toBe(prior.horses)
    expect(context.store.state.schedule).toBe(prior.schedule)
    expect(context.store.state.results).toBe(prior.results)
    context.failRandom(false); context.store.generate()
    expect(context.store.state.phase).toBe('Ready')
    expect(context.store.state.error).toBeNull()
    expect(context.store.state.results).toEqual([])
  })

  it('profile generation failure stops scheduling and retains coherent data', () => {
    const context = setup()
    context.store.generate(); context.failRandom(); context.store.start()
    expect(context.store.state.phase).toBe('Error')
    expect(context.store.state.error?.message).toContain('Random failed')
    expect(context.runtime.starts).toBe(0)
  })

  it('next-profile failure retains the newly published result', () => {
    const context = setup()
    context.store.generate(); context.store.start(); context.failRandom()
    finishCurrentRound(context)
    expect(context.store.state.phase).toBe('Error')
    expect(context.store.state.results).toHaveLength(1)
    expect(context.store.state.activeProfile).toBeNull()
  })

  it.each(['clock', 'start', 'stop'] as const)('contains %s failures and diagnostics', (operation) => {
    const { store, runtime } = setup()
    store.generate()
    if (operation === 'clock') runtime.clockError = new Error('clock failed')
    if (operation === 'start') runtime.startError = new Error('start failed')
    store.start()
    if (operation === 'stop') { runtime.stopError = new Error('stop failed'); store.pause() }
    expect(store.state.phase).toBe('Error')
    expect(store.state.error?.message).toContain(`${operation} failed`)
    expect(runtime.current).toBeNull()
  })

  it('contains asynchronous runtime failures and stale failures after recovery', () => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    const callbacks = runtime.current!
    callbacks.onError(new Error('scheduler failed'))
    expect(store.state.error?.operation).toBe('runtime')
    store.generate()
    callbacks.onError(new Error('stale'))
    expect(store.state.phase).toBe('Ready')
  })

  it.each(['Idle', 'Ready', 'Running', 'Paused', 'Completed', 'Error'] as const)('disposes terminally from %s', (phase) => {
    const context = setup()
    if (phase !== 'Idle') context.store.generate()
    if (['Running', 'Paused', 'Completed', 'Error'].includes(phase)) context.store.start()
    if (phase === 'Paused') context.store.pause()
    if (phase === 'Completed') finishSchedule(context)
    if (phase === 'Error') context.runtime.current!.onError(new Error('failure'))
    const callbacks = context.runtime.callbacks.slice()
    const used = context.calls()
    context.store.dispose()
    const disposed = context.store.state
    context.store.generate(); context.store.start(); context.store.pause(); context.store.resume(); context.store.dispose()
    callbacks.forEach((cb) => { cb.onFrame(99999); cb.onVisibility(true); cb.onError(new Error('late')) })
    expect(context.store.state).toBe(disposed)
    expect(context.calls()).toBe(used)
    expect(context.runtime.disposals).toBe(1)
  })

  it('disposal stays terminal even when cleanup fails', () => {
    const { store, runtime } = setup()
    runtime.disposeError = new Error('cleanup failed')
    store.dispose()
    expect(store.state.phase).toBe('Disposed')
    expect(store.state.error?.operation).toBe('dispose')
    expect(store.state.error?.message).toContain('cleanup failed')
  })

  it('Pinia scope disposal cleans up runtime resources', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); store.$dispose()
    expect(runtime.disposals).toBe(1)
    expect(store.state.phase).toBe('Disposed')
  })

  it('isolates resources and state between Pinia instances', () => {
    const drivers: FakeRuntime[] = []
    const useStore = createUseRacingStore({ random: () => 0.5, createRuntime: () => {
      const runtime = new FakeRuntime(); drivers.push(runtime); return runtime
    } })
    const first = useStore(createPinia())
    const second = useStore(createPinia())
    first.generate(); first.start(); drivers[0]!.tick(300)
    expect(second.state.phase).toBe('Idle')
    second.generate(); second.start()
    expect(first.state.horses).not.toBe(second.state.horses)
    expect(first.state.elapsedMs).toBe(300)
    expect(second.state.elapsedMs).toBe(0)
    first.dispose()
    expect(second.state.phase).toBe('Running')
  })
})

describe('lifecycle re-entry and failure boundaries', () => {
  it('does not start a driver if a synchronous observer disposes on Running', () => {
    const { store, runtime } = setup()
    store.generate()
    watch(() => store.state.phase, (phase) => { if (phase === 'Running') store.dispose() }, { flush: 'sync' })
    store.start()
    expect(store.state.phase).toBe('Disposed')
    expect(runtime.starts).toBe(0)
  })

  it('does not advance another round if disposed during progress publication', () => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    watch(() => store.state.elapsedMs, (elapsed) => { if (elapsed > 0) store.dispose() }, { flush: 'sync' })
    runtime.tick(1000)
    expect(store.state.phase).toBe('Disposed')
    expect(store.state.results).toEqual([])
    expect(runtime.current).toBeNull()
  })

  it('does not begin a next profile when disposed during result publication', () => {
    const { store, runtime, calls } = setup()
    store.generate(); store.start()
    const used = calls()
    watch(() => store.state.results.length, (count) => { if (count) store.dispose() }, { flush: 'sync' })
    for (let frame = 0; frame < 5; frame++) runtime.tick()
    expect(store.state.phase).toBe('Disposed')
    expect(store.state.results).toHaveLength(1)
    expect(calls()).toBe(used)
    expect(runtime.starts).toBe(1)
  })

  it('guards repeated intents dispatched during state publication', () => {
    const { store, runtime } = setup()
    store.generate()
    watch(() => store.state, () => { store.start(); store.resume(); store.pause() }, { flush: 'sync' })
    store.start(); runtime.tick(100)
    expect(store.state.phase).toBe('Running')
    expect(runtime.starts).toBe(1)
    expect(store.state.elapsedMs).toBe(100)
  })

  it('does not revive a store disposed by an injected random callback', () => {
    const runtime = new FakeRuntime()
    let dispose: () => void = () => {}
    const useStore = createUseRacingStore({ createRuntime: () => runtime, random: () => { dispose(); return 0.5 } })
    const store = useStore(createPinia())
    dispose = store.dispose
    store.generate()
    expect(store.state.phase).toBe('Disposed')
    expect(store.state.horses).toEqual([])
  })

  it('a late schedule-generation failure retains the prior snapshot', () => {
    const runtime = new FakeRuntime()
    let samples = 0
    let failAfter = Infinity
    const useStore = createUseRacingStore({ createRuntime: () => runtime, random: () => {
      if (++samples > failAfter) throw new Error('late generation failure')
      return 0.5
    } })
    const store = useStore(createPinia())
    store.generate()
    const old = store.state
    failAfter = samples + 20
    store.generate()
    expect(store.state.phase).toBe('Error')
    expect(store.state.horses).toBe(old.horses)
    expect(store.state.schedule).toBe(old.schedule)
    expect(store.state.error?.message).toContain('late generation failure')
  })

  it.each([NaN, Infinity, -1])('invalid now() %s fails before starting frames', (timestamp) => {
    const { store, runtime } = setup()
    store.generate(); runtime.time = timestamp; store.start()
    expect(store.state.phase).toBe('Error')
    expect(runtime.starts).toBe(0)
  })

  it('cleanup errors are retained with the original runtime failure', () => {
    const { store, runtime } = setup()
    store.generate(); store.start()
    runtime.stopError = new Error('cancel failed')
    runtime.current!.onError(new Error('frame failed'))
    expect(store.state.error?.message).toBe('frame failed')
    expect(store.state.error?.cleanupMessages).toEqual(['cancel failed'])
  })
})

describe('monotonic clock across pauses', () => {
  it('rejects a backwards Resume clock rather than rewinding the session', () => {
    const { store, runtime } = setup()
    store.generate(); store.start(); runtime.tick(400); store.pause()
    runtime.time = 300
    store.resume()
    expect(store.state.phase).toBe('Error')
    expect(store.state.elapsedMs).toBe(400)
    expect(runtime.starts).toBe(1)
  })
})
