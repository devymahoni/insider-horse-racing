import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { createUseRacingStore } from '../state/racingStore'
import { createBrowserRaceRuntime } from './browserRaceRuntime'
import type { BrowserRuntimeEnvironment } from './browserRaceRuntime'
import type { RuntimeCallbacks } from './raceRuntime'

function setup() {
  let time = 0
  let hidden = false
  let next = 1
  const frames = new Map<number, () => void>()
  const listeners = new Set<() => void>()
  let requestFailure = false
  let cancelFailure = false
  let removeFailure = false
  let clockFailure = false
  const environment: BrowserRuntimeEnvironment = {
    now: () => { if (clockFailure) throw new Error('clock'); return time },
    requestFrame(callback) { if (requestFailure) throw new Error('request'); const id = next++; frames.set(id, callback); return id },
    cancelFrame(id) { frames.delete(id); if (cancelFailure) throw new Error('cancel') },
    isHidden: () => hidden,
    addVisibilityListener(listener) { listeners.add(listener) },
    removeVisibilityListener(listener) { listeners.delete(listener); if (removeFailure) throw new Error('remove') },
  }
  const runtime = createBrowserRaceRuntime(environment)
  const ticks: number[] = []
  const visibility: boolean[] = []
  const errors: unknown[] = []
  const callbacks: RuntimeCallbacks = { onFrame: (timestamp) => ticks.push(timestamp), onVisibility: (value) => visibility.push(value), onError: (error) => errors.push(error) }
  return {
    runtime, callbacks, ticks, visibility, errors, frames, listeners,
    frame(timestamp: number) { time = timestamp; const [id, cb] = [...frames][0]!; frames.delete(id); cb() },
    hidden(value: boolean) { hidden = value; [...listeners].forEach((listener) => listener()) },
    fail(kind: 'request' | 'cancel' | 'remove' | 'clock') {
      if (kind === 'request') requestFailure = true
      if (kind === 'cancel') cancelFailure = true
      if (kind === 'remove') removeFailure = true
      if (kind === 'clock') clockFailure = true
    },
  }
}

describe('browser race runtime', () => {
  it('uses a single clock and does not synchronously deliver frames', () => {
    const context = setup()
    context.runtime.start(context.callbacks)
    expect(context.ticks).toEqual([])
    expect(context.visibility).toEqual([false])
    context.frame(100)
    expect(context.ticks).toEqual([100])
    expect(context.runtime.now()).toBe(100)
    expect(context.frames.size).toBe(1)
  })
  it('duplicate start does not create another loop or listener', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.runtime.start(context.callbacks)
    expect(context.frames.size).toBe(1)
    expect(context.listeners.size).toBe(1)
  })
  it('stop is idempotent and cancels frames and listeners', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.runtime.stop(); context.runtime.stop()
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
  it('does not re-arm after stop during a callback', () => {
    const context = setup()
    context.runtime.start({ ...context.callbacks, onFrame: () => context.runtime.stop() })
    context.frame(100)
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
  it('old queued frames and visibility cannot affect a restarted stream', () => {
    const context = setup()
    context.runtime.start(context.callbacks)
    const old = [...context.frames.values()][0]!
    const listener = [...context.listeners][0]!
    context.runtime.stop(); context.runtime.start(context.callbacks)
    old(); listener()
    expect(context.ticks).toEqual([])
    expect(context.visibility).toEqual([false, false])
    expect(context.frames.size).toBe(1)
  })
  it('does not duplicate scheduling if restarted during a callback', () => {
    const context = setup()
    context.runtime.start({ ...context.callbacks, onFrame: () => {
      context.runtime.stop(); context.runtime.start(context.callbacks)
    } })
    context.frame(100)
    expect(context.frames.size).toBe(1)
  })
  it('reports hidden visibility immediately and permits cancellation before first frame', () => {
    const context = setup()
    context.hidden(true)
    context.runtime.start({ ...context.callbacks, onVisibility: (hidden) => { if (hidden) context.runtime.stop() } })
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
  it('reports visibility changes', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.hidden(true); context.hidden(false)
    expect(context.visibility).toEqual([false, true, false])
  })
  it('contains frame callback failures and cleans resources', () => {
    const context = setup()
    context.runtime.start({ ...context.callbacks, onFrame: () => { throw new Error('callback') } })
    context.frame(10)
    expect(context.errors).toHaveLength(1)
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
  it('reports later frame scheduling failures', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.fail('request'); context.frame(10)
    expect(context.errors).toHaveLength(1)
    expect(context.listeners.size).toBe(0)
  })
  it('reports clock failures through the callback', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.fail('clock'); context.frame(10)
    expect(context.errors).toHaveLength(1)
    expect(context.frames.size).toBe(0)
  })
  it('throws synchronous startup failure after cleanup', () => {
    const context = setup(); context.fail('request')
    expect(() => context.runtime.start(context.callbacks)).toThrow('request')
    expect(context.listeners.size).toBe(0)
    expect(context.frames.size).toBe(0)
  })
  it('attempts both cleanup operations even when cancellation fails', () => {
    const context = setup()
    context.runtime.start(context.callbacks); context.fail('cancel'); context.fail('remove')
    expect(() => context.runtime.stop()).toThrow('Runtime cleanup failed')
    expect(context.listeners.size).toBe(0)
    expect(context.frames.size).toBe(0)
  })
  it('dispose is terminal and queued callbacks do nothing', () => {
    const context = setup()
    context.runtime.start(context.callbacks)
    const old = [...context.frames.values()][0]!
    context.runtime.dispose(); context.runtime.dispose(); old()
    expect(context.ticks).toEqual([])
    expect(() => context.runtime.start(context.callbacks)).toThrow('disposed')
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
})


describe('browser driver and real Pinia integration', () => {
  function integrated() {
    const context = setup()
    const useStore = createUseRacingStore({ random: () => 0.5, createRuntime: () => context.runtime })
    const store = useStore(createPinia())
    return { ...context, store }
  }
  it('starts initially hidden in Paused without a pending frame', () => {
    const context = integrated()
    context.hidden(true)
    context.store.generate(); context.store.start()
    expect(context.store.state.phase).toBe('Paused')
    expect(context.store.state.pauseReason).toBe('hidden')
    expect(context.frames.size).toBe(0)
    context.hidden(false)
    expect(context.store.state.phase).toBe('Paused')
    context.store.resume()
    expect(context.frames.size).toBe(1)
  })
  it('pauses hidden and resumes one stream without restoring cancelled callbacks', () => {
    const context = integrated()
    context.store.generate(); context.store.start(); context.frame(100)
    const queued = [...context.frames.values()][0]!
    context.hidden(true)
    expect(context.store.state.phase).toBe('Paused')
    expect(context.frames.size).toBe(0)
    context.hidden(false); context.store.resume(); queued()
    expect(context.frames.size).toBe(1)
    expect(context.store.state.elapsedMs).toBe(100)
    context.frame(300)
    expect(context.store.state.elapsedMs).toBe(300)
  })
  it('restarts at each round boundary without duplicate re-arming', () => {
    const context = integrated()
    context.store.generate(); context.store.start()
    for (let time = 1000; time <= 5000; time += 1000) context.frame(time)
    expect(context.store.state.results).toHaveLength(1)
    expect(context.store.state.activeRoundIndex).toBe(1)
    expect(context.frames.size).toBe(1)
    expect(context.listeners.size).toBe(1)
    context.store.dispose()
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
  it('runtime scheduling failure reaches Error with no remaining effects', () => {
    const context = integrated()
    context.store.generate(); context.store.start(); context.fail('request'); context.frame(100)
    expect(context.store.state.phase).toBe('Error')
    expect(context.store.state.error?.operation).toBe('runtime')
    expect(context.frames.size).toBe(0)
    expect(context.listeners.size).toBe(0)
  })
})
