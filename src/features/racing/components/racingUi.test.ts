import { describe, it, expect, vi } from 'vitest'
import { createRenderer, createSSRApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import { renderToString } from '@vue/server-renderer'
import type { RuntimeCallbacks } from '../runtime/raceRuntime'
import RacingPage from './RacingPage.vue'
import HorsePool from './HorsePool.vue'
import RaceProgram from './RaceProgram.vue'
import RaceTrack from './RaceTrack.vue'
import RaceResults from './RaceResults.vue'
import { generateHorses } from '../engine/generateHorses'
import { generateSchedule } from '../engine/generateSchedule'

const runtime = vi.hoisted(() => ({ callbacks: null as RuntimeCallbacks | null, time: 0, disposed: 0 }))
vi.mock('../runtime/browserRaceRuntime', () => ({ createBrowserRaceRuntime: () => ({ now: () => runtime.time, start: (callbacks: RuntimeCallbacks) => { runtime.callbacks = callbacks }, stop: () => { runtime.callbacks = null }, dispose: () => { runtime.callbacks = null; runtime.disposed++ } }) }))

type HostNode = { type: string; text: string; props: Record<string, unknown>; children: HostNode[]; parent: HostNode | null }
const node = (type: string, text = ''): HostNode => ({ type, text, props: {}, children: [], parent: null })
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => node(tag), createText: (text) => node('#text', text), createComment: (text) => node('#comment', text),
  setText: (target, text) => { target.text = text }, setElementText: (target, text) => { target.text = text; target.children = [] },
  parentNode: (target) => target.parent, nextSibling: (target) => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _previous, value) => { target.props[key] = value },
  insert: (target, parent, anchor) => { if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1); target.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; if (index < 0) parent.children.push(target); else parent.children.splice(index, 0, target) },
  remove: (target) => { if (target.parent) target.parent.children.splice(target.parent.children.indexOf(target), 1); target.parent = null },
})
const descendants = (root: HostNode): HostNode[] => [root, ...root.children.flatMap(descendants)]
const text = (root: HostNode): string => root.text + root.children.map(text).join('')
const horses = generateHorses(() => .5)
const schedule = generateSchedule(horses.map((horse) => horse.id), () => .5)

describe('racing presentation', () => {
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
    const button = (label: string) => descendants(root).find((item) => item.type === 'button' && text(item) === label)!
    const click = async (label: string) => { const target = button(label); expect(target.props.disabled).toBe(false); (target.props.onClick as () => void)(); await nextTick() }
    expect(button('Start').props.disabled).toBe(true)
    await click('Generate')
    expect(descendants(root).filter((item) => 'data-horse-row' in item.props)).toHaveLength(20)
    expect(descendants(root).filter((item) => 'data-race-lane' in item.props)).toHaveLength(10)
    await click('Start'); expect(button('Generate').props.disabled).toBe(true)
    runtime.time += 100; runtime.callbacks!.onFrame(runtime.time); await nextTick()
    await click('Pause'); expect(runtime.callbacks).toBe(null); expect(button('Generate').props.disabled).toBe(true)
    await click('Resume')
    for (let frame = 0; frame < 500 && runtime.callbacks; frame++) { runtime.time += 100; (runtime.callbacks as RuntimeCallbacks).onFrame(runtime.time); await nextTick() }
    expect(text(root)).toContain('Completed')
    expect(descendants(root).filter((item) => 'data-result-round' in item.props)).toHaveLength(6)
    expect(descendants(root).filter((item) => 'data-result-finisher' in item.props)).toHaveLength(60)
    expect(button('Start').props.disabled).toBe(true)
    await click('Generate')
    expect(descendants(root).filter((item) => 'data-result-finisher' in item.props)).toHaveLength(0)
    await click('Start'); app.unmount()
    expect(runtime.callbacks).toBe(null); expect(runtime.disposed).toBe(1)
  })
  it('presents automatic pause reasons and runtime errors without enabling unsafe controls', async () => {
    runtime.time = 0; runtime.callbacks = null; runtime.disposed = 0
    const root = node('root')
    const app = renderer.createApp(RacingPage); app.use(createPinia()); app.mount(root)
    const button = (label: string) => descendants(root).find((item) => item.type === 'button' && text(item) === label)!
    const click = async (label: string) => { (button(label).props.onClick as () => void)(); await nextTick() }
    await click('Generate'); await click('Start')
    runtime.callbacks!.onVisibility(true); await nextTick()
    expect(text(root)).toContain('tab was hidden')
    expect(button('Generate').props.disabled).toBe(true)
    expect(button('Resume').props.disabled).toBe(false)
    await click('Resume')
    runtime.callbacks!.onError(new Error('Clock unavailable')); await nextTick()
    expect(descendants(root).some((item) => item.props.role === 'alert')).toBe(true)
    expect(text(root)).toContain('Clock unavailable')
    expect(button('Start').props.disabled).toBe(true)
    expect(button('Generate').props.disabled).toBe(false)
    await click('Generate')
    expect(text(root)).toContain('Ready')
    expect(descendants(root).some((item) => item.props.role === 'alert')).toBe(false)
    app.unmount()
  })

})
