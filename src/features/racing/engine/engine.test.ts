import { describe, expect, it, vi } from 'vitest'
import { generateHorses } from './generateHorses'
import { generateSchedule } from './generateSchedule'
import type { RaceSchedule, RandomSource } from './models'

const ids = Array.from({ length: 20 }, (_, i) => `horse-${String(i + 1).padStart(2, '0')}`)

function seeded(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function assertSchedule(schedule: RaceSchedule): void {
  expect(schedule.rounds).toHaveLength(6)
  expect(schedule.rounds.map((round) => round.roundNumber)).toEqual([1, 2, 3, 4, 5, 6])
  expect(schedule.rounds.map((round) => round.distance)).toEqual([1200, 1400, 1600, 1800, 2000, 2200])
  const appearances = new Map(ids.map((id) => [id, 0]))
  for (const round of schedule.rounds) {
    expect(round.horseIds).toHaveLength(10)
    expect(new Set(round.horseIds).size).toBe(10)
    for (const id of round.horseIds) {
      expect(appearances.has(id)).toBe(true)
      appearances.set(id, appearances.get(id)! + 1)
    }
  }
  expect([...appearances.values()]).toEqual(Array(20).fill(3))
}

describe('generateHorses', () => {
  it('generates exactly twenty named horses with stable pool-local IDs and unique colors', () => {
    const horses = generateHorses(seeded(1))
    expect(horses).toHaveLength(20)
    expect(horses.map((horse) => horse.id)).toEqual(ids)
    expect(horses.map((horse) => horse.name)).toEqual(ids.map((_, i) => `Horse ${i + 1}`))
    expect(new Set(horses.map((horse) => horse.color)).size).toBe(20)
    expect(horses.every((horse) => /^#[0-9A-F]{6}$/.test(horse.color))).toBe(true)
  })

  it.each([[0, 1], [1 - Number.EPSILON, 100], [0.5, 51]])(
    'maps random value %s to condition %s', (value, condition) => {
      expect(generateHorses(() => value).every((horse) => horse.condition === condition)).toBe(true)
    },
  )

  it('produces reproducible integer conditions within bounds across controlled streams', () => {
    for (let seed = 0; seed < 100; seed++) {
      const horses = generateHorses(seeded(seed))
      expect(horses).toEqual(generateHorses(seeded(seed)))
      for (const horse of horses) {
        expect(Number.isInteger(horse.condition)).toBe(true)
        expect(horse.condition).toBeGreaterThanOrEqual(1)
        expect(horse.condition).toBeLessThanOrEqual(100)
      }
    }
    expect(generateHorses(seeded(1))).not.toEqual(generateHorses(seeded(2)))
  })

  it('does not share mutable generated horse objects between pools', () => {
    const first = generateHorses(() => 0)
    const second = generateHorses(() => 0)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
  })
})

describe('generateSchedule', () => {
  it('satisfies all scheduling invariants for many deterministic streams', () => {
    for (let seed = 0; seed < 500; seed++) assertSchedule(generateSchedule(ids, seeded(seed)))
  })

  it.each([0, 0.5, 1 - Number.EPSILON])('terminates for constant random value %s', (value) => {
    assertSchedule(generateSchedule(ids, () => value))
  })

  it('forces participation when remaining appearances equal remaining rounds', () => {
    const schedule = generateSchedule(ids, () => 0)
    const remaining = new Map(ids.map((id) => [id, 3]))
    let forcedSelections = 0
    schedule.rounds.forEach((round, index) => {
      const roundsLeft = 6 - index
      for (const id of ids) {
        if (remaining.get(id) === roundsLeft) {
          expect(round.horseIds).toContain(id)
          forcedSelections++
        }
        if (remaining.get(id) === 0) expect(round.horseIds).not.toContain(id)
      }
      for (const id of round.horseIds) remaining.set(id, remaining.get(id)! - 1)
      expect([...remaining.values()].every((count) => count >= 0 && count <= roundsLeft - 1)).toBe(true)
    })
    expect(forcedSelections).toBeGreaterThanOrEqual(10)
    expect([...remaining.values()]).toEqual(Array(20).fill(0))
  })

  it('reproduces schedules and permits different valid controlled outcomes', () => {
    expect(generateSchedule(ids, seeded(17))).toEqual(generateSchedule(ids, seeded(17)))
    expect(generateSchedule(ids, seeded(17))).not.toEqual(generateSchedule(ids, seeded(18)))
  })

  it('preserves frozen caller IDs and original horse attributes', () => {
    const horses = Object.freeze(generateHorses(seeded(5)).map((horse) => Object.freeze(horse)))
    const before = horses.map((horse) => ({ ...horse }))
    const frozenIds = Object.freeze(horses.map((horse) => horse.id))
    assertSchedule(generateSchedule(frozenIds, seeded(6)))
    expect(frozenIds).toEqual(ids)
    expect(horses).toEqual(before)
  })

  it('uses supplied identities rather than assuming generated ID values', () => {
    const custom = ids.map((_, i) => `custom-${i}`)
    const schedule = generateSchedule(custom, seeded(1))
    expect(schedule.rounds.flatMap((round) => round.horseIds).every((id) => custom.includes(id))).toBe(true)
  })

  it.each([[[]], [ids.slice(1)], [[...ids, 'extra']]])('rejects wrong pool size before consuming randomness', (pool) => {
    const random = vi.fn(() => 0)
    expect(() => generateSchedule(pool, random)).toThrow(RangeError)
    expect(random).not.toHaveBeenCalled()
  })

  it.each([
    [[...ids.slice(0, 19), ids[0]]],
    [[...ids.slice(0, 19), '']],
    [[...ids.slice(0, 19), '   ']],
    [[...ids.slice(0, 19), 12]],
    [Array(20)],
    [null],
  ])('rejects malformed IDs before consuming randomness', (pool) => {
    const random = vi.fn(() => 0)
    expect(() => generateSchedule(pool as readonly string[], random)).toThrow(TypeError)
    expect(random).not.toHaveBeenCalled()
  })
})

describe.each([
  ['horse generation', (random: RandomSource) => generateHorses(random)],
  ['scheduling', (random: RandomSource) => generateSchedule(ids, random)],
] as const)('%s random-source validation', (_, generate) => {
  it.each([undefined, null, 1, {}])('rejects a non-callable source %s', (source) => {
    expect(() => generate(source as RandomSource)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity, -0.1, 1, 2, '0.5', undefined])('rejects invalid sample %s', (value) => {
    expect(() => generate(() => value as number)).toThrow(RangeError)
  })

  it('validates later samples, not just the first', () => {
    let calls = 0
    expect(() => generate(() => ++calls === 2 ? 1 : 0)).toThrow(RangeError)
    expect(calls).toBe(2)
  })

  it('propagates source failure without swallowing or retrying it', () => {
    const failure = new Error('stream exhausted')
    const random = vi.fn(() => { throw failure })
    expect(() => generate(random)).toThrow(failure)
    expect(random).toHaveBeenCalledTimes(1)
  })
})
