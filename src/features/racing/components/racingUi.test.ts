import { describe, it, expect, vi } from 'vitest'
import { createRenderer, createSSRApp, h, nextTick, ref } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from '@vue/server-renderer'
import type { RuntimeCallbacks } from '../runtime/raceRuntime'
import RacingPage from './RacingPage.vue'
import RaceControls from './RaceControls.vue'
import type { RacePhase } from '../state/racingStore'
import HorsePool from './HorsePool.vue'
import RaceProgram from './RaceProgram.vue'
import RaceTrack from './RaceTrack.vue'
import RaceResults from './RaceResults.vue'
import GallopingHorse from './GallopingHorse.vue'
import { generateHorses } from '../engine/generateHorses'
import { generateSchedule } from '../engine/generateSchedule'

const runtime = vi.hoisted(() => ({ callbacks: null as RuntimeCallbacks | null, time: 0, disposed: 0 }))
vi.mock('../runtime/browserRaceRuntime', () => ({
  createBrowserRaceRuntime: () => ({
    now: () => runtime.time,
    start: (callbacks: RuntimeCallbacks) => { runtime.callbacks = callbacks },
    stop: () => { runtime.callbacks = null },
    dispose: () => {
      runtime.callbacks = null
      runtime.disposed++
    },
  }),
}))

type HostNode = {
  type: string
  text: string
  props: Record<string, unknown>
  children: HostNode[]
  parent: HostNode | null
}
const node = (type: string, text = ''): HostNode => ({ type, text, props: {}, children: [], parent: null })
// Minimal host operations let these integration tests exercise Vue events without a DOM dependency.
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => node(tag),
  createText: (value) => node('#text', value),
  createComment: (value) => node('#comment', value),
  setText: (target, value) => { target.text = value },
  setElementText: (target, value) => {
    target.text = value
    target.children = []
  },
  parentNode: (target) => target.parent,
  nextSibling: (target) => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _previous, value) => { target.props[key] = value },
  insert: (target, parent, anchor) => {
    if (target.parent) {
      target.parent.children.splice(target.parent.children.indexOf(target), 1)
    }
    target.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(target)
    else parent.children.splice(index, 0, target)
  },
  remove: (target) => {
    if (target.parent) {
      target.parent.children.splice(target.parent.children.indexOf(target), 1)
    }
    target.parent = null
  },
})
const descendants = (root: HostNode): HostNode[] => [root, ...root.children.flatMap(descendants)]
const text = (root: HostNode): string => root.text + root.children.map(text).join('')
function buttonByName(root: HostNode, label: string): HostNode {
  // The renderer stores raw SFC text; browser button names trim this whitespace.
  const result = descendants(root).find((item) => item.type === 'button' && text(item).trim() === label)
  if (!result) throw new Error(`Button not found: ${label}`)
  return result
}

const horses = generateHorses(() => .5)
const schedule = generateSchedule(horses.map((horse) => horse.id), () => .5)

describe('racing presentation', () => {
  it('keeps one state-derived action element and ignores duplicate native activation', async () => {
    const phase = ref<RacePhase>('Idle')
    const events: string[] = []
    const root = node('root')
    const app = renderer.createApp({
      setup: () => () => h(RaceControls, {
        phase: phase.value,
        canGenerate: ['Idle', 'Ready', 'Completed', 'Error'].includes(phase.value),
        canStart: phase.value === 'Ready',
        canPause: phase.value === 'Running',
        canResume: phase.value === 'Paused',
        onGenerate: () => { events.push('generate') },
        onStart: () => { events.push('start'); phase.value = 'Running' },
        onPause: () => { events.push('pause'); phase.value = 'Paused' },
        onResume: () => { events.push('resume'); phase.value = 'Running' },
      }),
    })
    app.mount(root)
    expect(descendants(root).filter((item) => item.type === 'button')).toHaveLength(2)
    const primary = buttonByName(root, 'Start Race')
    expect(primary.props.disabled).toBe(true)
    phase.value = 'Ready'; await nextTick()
    ;(primary.props.onClick as (event: { detail: number }) => void)({ detail: 1 }); await nextTick()
    expect(buttonByName(root, 'Pause')).toBe(primary)
    ;(primary.props.onClick as (event: { detail: number }) => void)({ detail: 2 }); await nextTick()
    expect(events).toEqual(['start'])
    const preventDefault = vi.fn()
    ;(primary.props.onKeydown as (event: unknown) => void)({ key: 'Enter', repeat: true, preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    ;(primary.props.onClick as () => void)(); await nextTick()
    expect(buttonByName(root, 'Resume')).toBe(primary)
    ;(primary.props.onClick as () => void)(); await nextTick()
    expect(buttonByName(root, 'Pause')).toBe(primary)
    expect(events).toEqual(['start', 'pause', 'resume'])
    for (const inactive of ['Completed', 'Error', 'Disposed'] as const) {
      phase.value = inactive; await nextTick()
      expect(primary.props.disabled).toBe(true)
      ;(primary.props.onClick as () => void)()
    }
    expect(events).toEqual(['start', 'pause', 'resume'])
    expect(buttonByName(root, 'Generate').props.disabled).toBe(true)
    ;(buttonByName(root, 'Generate').props.onClick as () => void)()
    expect(events).toEqual(['start', 'pause', 'resume'])
    phase.value = 'Error'; await nextTick()
    expect(buttonByName(root, 'Generate').props.disabled).toBe(false)
    ;(buttonByName(root, 'Generate').props.onClick as () => void)()
    expect(events).toEqual(['start', 'pause', 'resume', 'generate'])
    app.unmount()
  })

  it('renders the full roster and all six ten-horse program entries', async () => {
    const pool = await renderToString(createSSRApp(HorsePool, { horses }))
    const program = await renderToString(createSSRApp(RaceProgram, { horses, schedule, activeRoundIndex: null, completedCount: 0 }))
    expect(pool.match(/data-horse-row/g)).toHaveLength(20)
    expect(program.match(/data-program-round/g)).toHaveLength(6)
    for (const horse of horses) expect(program.split(horse.name + '<').length - 1).toBe(3)
  })
  it('renders ten lanes from the actual schedule and actual progress', async () => {
    const round = schedule.rounds[0]!
    const participants = round.horseIds.map((id) => horses.find((horse) => horse.id === id)!)
    const html = await renderToString(createSSRApp(RaceTrack, { round, horses: participants, positions: participants.map((horse) => ({ horseId: horse.id, progress: .42 })), phase: 'Running', elapsedMs: 1250 }))
    expect(html.match(/data-race-lane/g)).toHaveLength(10)
    expect(html.match(/42%/g)).toHaveLength(10)
    expect(html).toContain('1200')
    expect(html).toContain('Finish')
    expect(html).toContain('start-line')
    expect(html).toContain('Round 1 of 6 racing')
    expect(html).toContain('role="status" aria-atomic="true"')
  })
  it('gallops only unfinished running horses, without changing supplied progress', async () => {
    const round = schedule.rounds[0]!
    const participants = round.horseIds.map((id) => horses.find((horse) => horse.id === id)!)
    const positions = participants.map((horse, index) => ({ horseId: horse.id, progress: index === 0 ? 1 : .42 }))
    const running = await renderToString(createSSRApp(RaceTrack, { round, horses: participants, positions, phase: 'Running', elapsedMs: 1250 }))
    expect(running.match(/data-galloping="true"/g)).toHaveLength(9)
    expect(running.match(/data-galloping="false"/g)).toHaveLength(1)
    expect(running.match(/42%/g)).toHaveLength(9)
    for (const phase of ['Ready', 'Paused', 'Completed'] as const) {
      const html = await renderToString(createSSRApp(RaceTrack, { round, horses: participants, positions, phase, elapsedMs: 1250 }))
      expect(html.match(/data-galloping="false"/g)).toHaveLength(10)
      expect(html).not.toContain('data-galloping="true"')
    }
  })
  it('preserves the sprite element and phase offset through pause and resume', async () => {
    const galloping = ref(true)
    const root = node('root')
    const app = renderer.createApp({ setup: () => () => h(GallopingHorse, { horseId: 'horse-07', galloping: galloping.value }) })
    app.mount(root)
    const image = descendants(root).find((item) => item.type === 'img')!
    const horse = descendants(root).find((item) => 'data-galloping' in item.props)!
    const delay = (horse.props.style as Record<string, string>)['--gallop-delay']
    for (const active of [false, true]) {
      galloping.value = active; await nextTick()
      expect(descendants(root).find((item) => item.type === 'img')).toBe(image)
      expect(horse.props['data-galloping']).toBe(active)
      expect((horse.props.style as Record<string, string>)['--gallop-delay']).toBe(delay)
    }
    app.unmount()
  })
  it('shows every finishing position and preserves prior round results', async () => {
    const results = schedule.rounds.slice(0, 2).map((round) => ({ roundNumber: round.roundNumber, finishers: round.horseIds.map((horseId, index) => ({ horseId, rank: index + 1, finishTimeMs: 4000 + index * 100 })) }))
    const html = await renderToString(createSSRApp(RaceResults, { results, horses, phase: 'Running' }))
    expect(html.match(/data-result-round/g)).toHaveLength(2)
    expect(html.match(/data-result-finisher/g)).toHaveLength(20)
    expect(html).toContain('Winner')
    expect(html).toContain('Finish time (s)')
    expect(html.match(/class="second"/g)).toHaveLength(2)
    expect(html.match(/class="third"/g)).toHaveLength(2)
    expect(html).toContain('4.000 s')
    expect(html).toContain(`Round 2 complete. Winner: ${horses.find((horse) => horse.id === results[1]!.finishers[0]!.horseId)!.name}. 2 of 6 rounds complete.`)
  })
  it('keeps the full roster available behind a count-labelled disclosure', async () => {
    const root = node('root'); const app = renderer.createApp(HorsePool, { horses }); app.mount(root)
    const toggle = descendants(root).find((item) => item.type === 'button')!
    const content = () => descendants(root).find((item) => item.props.id === 'horse-roster')!
    expect(text(toggle)).toContain('Show all 20 horses')
    expect(toggle.props['aria-controls']).toBe('horse-roster')
    expect(toggle.props['aria-expanded']).toBe(false)
    expect(content().props.class).not.toContain('is-expanded')
    ;(toggle.props.onClick as () => void)(); await nextTick()
    expect(toggle.props['aria-expanded']).toBe(true)
    expect(content().props.class).toContain('is-expanded')
    expect(descendants(root).filter((item) => 'data-horse-row' in item.props)).toHaveLength(20)
    ;(toggle.props.onClick as () => void)(); await nextTick()
    expect(toggle.props['aria-expanded']).toBe(false)
    expect(text(root)).toContain('20 / 20')
    app.unmount()
  })
  it('uses honest empty states before generation', async () => {
    const app = createSSRApp(RacingPage); app.use(createPinia())
    const html = await renderToString(app)
    expect(html).not.toContain('data-horse-row')
    expect(html).not.toContain('data-race-lane')
    expect(html).not.toContain('data-result-finisher')
    expect(html).toContain('Generate')
    expect(html).toContain('Idle')
  })
  it('wires controls through the store, runs six rounds, retains results and disposes runtime', async () => {
    runtime.time = 0; runtime.callbacks = null; runtime.disposed = 0
    const root = node('root'); const app = renderer.createApp(RacingPage); app.use(createPinia()); app.mount(root)
    const button = (label: string) => buttonByName(root, label)
    const click = async (label: string) => { const target = button(label); expect(target.props.disabled).toBe(false); (target.props.onClick as () => void)(); await nextTick() }
    expect(button('Start Race').props.disabled).toBe(true)
    await click('Generate')
    expect(descendants(root).filter((item) => 'data-horse-row' in item.props)).toHaveLength(20)
    expect(descendants(root).filter((item) => 'data-race-lane' in item.props)).toHaveLength(10)
    await click('Start Race'); expect(button('Generate').props.disabled).toBe(true)
    runtime.time += 100; runtime.callbacks!.onFrame(runtime.time); await nextTick()
    await click('Pause'); expect(runtime.callbacks).toBe(null); expect(button('Generate').props.disabled).toBe(true)
    await click('Resume')
    for (let frame = 0; frame < 500 && runtime.callbacks; frame++) { runtime.time += 100; (runtime.callbacks as RuntimeCallbacks).onFrame(runtime.time); await nextTick() }
    expect(text(root)).toContain('Completed')
    expect(descendants(root).filter((item) => 'data-result-round' in item.props)).toHaveLength(6)
    expect(descendants(root).filter((item) => 'data-result-finisher' in item.props)).toHaveLength(60)
    expect(button('Race complete').props.disabled).toBe(true)
    await click('Generate')
    expect(descendants(root).filter((item) => 'data-result-finisher' in item.props)).toHaveLength(0)
    await click('Start Race'); app.unmount()
    expect(runtime.callbacks).toBe(null); expect(runtime.disposed).toBe(1)
  })
  it('presents automatic pause reasons and runtime errors without enabling unsafe controls', async () => {
    runtime.time = 0; runtime.callbacks = null; runtime.disposed = 0
    const root = node('root')
    const app = renderer.createApp(RacingPage); app.use(createPinia()); app.mount(root)
    const button = (label: string) => buttonByName(root, label)
    const click = async (label: string) => { (button(label).props.onClick as () => void)(); await nextTick() }
    await click('Generate'); await click('Start Race')
    runtime.callbacks!.onVisibility(true); await nextTick()
    expect(text(root)).toContain('tab was hidden')
    expect(button('Generate').props.disabled).toBe(true)
    expect(button('Resume').props.disabled).toBe(false)
    await click('Resume')
    runtime.callbacks!.onError(new Error('Clock unavailable')); await nextTick()
    expect(descendants(root).some((item) => item.props.role === 'alert')).toBe(true)
    expect(text(root)).toContain('Clock unavailable')
    expect(button('Race unavailable').props.disabled).toBe(true)
    expect(button('Generate').props.disabled).toBe(false)
    await click('Generate')
    expect(text(root)).toContain('Ready')
    expect(descendants(root).some((item) => item.props.role === 'alert')).toBe(false)
    app.unmount()
  })

})
