import { describe, expect, it, vi } from 'vitest'
import { generateHorses } from './generateHorses'
import { generateSchedule } from './generateSchedule'
import type { Horse, RaceRound, RandomSource } from './models'
import type { RoundRaceProfile } from './profileModels'
import { generateRoundProfile, rankRound, sampleRoundProgress } from './raceSimulation'

function seeded(seed: number): RandomSource {
  let state = seed >>> 0
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}
const pool = generateHorses(() => 0.5)
const round: RaceRound = { roundNumber: 1, distance: 1200, horseIds: pool.slice(0, 10).map((horse) => horse.id) }
function clone(profile: RoundRaceProfile): RoundRaceProfile { return JSON.parse(JSON.stringify(profile)) }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
function assertProfile(profile: RoundRaceProfile): void {
  const results = rankRound(profile)
  expect(results.map((result) => result.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  expect(new Set(results.map((result) => result.horseId)).size).toBe(10)
  expect(Math.max(...results.map((result) => result.finishTimeMs))).toBe(profile.targetDurationMs)
  const previous = Array(10).fill(0)
  for (let step = 0; step <= 50; step++) {
    const samples = sampleRoundProgress(profile, profile.targetDurationMs * step / 50)
    samples.forEach((sample, index) => {
      expect(Number.isFinite(sample.progress)).toBe(true)
      expect(sample.progress).toBeGreaterThanOrEqual(previous[index])
      expect(sample.progress).toBeGreaterThanOrEqual(0)
      expect(sample.progress).toBeLessThanOrEqual(1)
      previous[index] = sample.progress
    })
  }
  for (const horse of profile.horses) {
    expect(horse.knots.length).toBeGreaterThanOrEqual(2)
    expect(horse.knots.length).toBeLessThanOrEqual(9)
    expect(horse.knots[0]!.elapsedMs).toBe(0)
    horse.knots.forEach((knot, index) => {
      expect(Number.isFinite(knot.velocity)).toBe(true)
      expect(knot.velocity).toBeGreaterThan(0)
      if (index) expect(knot.elapsedMs).toBeGreaterThan(horse.knots[index - 1]!.elapsedMs)
    })
    const finish = horse.knots.at(-1)!.elapsedMs
    expect(sampleRoundProgress(profile, finish).find((sample) => sample.horseId === horse.horseId)!.progress).toBe(1)
    expect(sampleRoundProgress(profile, finish - 0.001).find((sample) => sample.horseId === horse.horseId)!.progress).toBeLessThan(1)
  }
}

describe('integrated velocity generation', () => {
  it.each([0, 0.5, 1 - Number.EPSILON])('handles constant random stream %s, including constant speed', (value) => {
    assertProfile(generateRoundProfile(round, pool, () => value))
  })
  it('reproduces profiles and results across many deterministic streams and all distances', () => {
    for (let seed = 0; seed < 100; seed++) {
      const horses = generateHorses(seeded(seed))
      const schedule = generateSchedule(horses.map((horse) => horse.id), seeded(seed + 1))
      const race = schedule.rounds[seed % 6]!
      const profile = generateRoundProfile(race, horses, seeded(seed + 2))
      expect(profile).toEqual(generateRoundProfile(race, horses, seeded(seed + 2)))
      assertProfile(profile)
    }
    expect(generateRoundProfile(round, pool, seeded(1))).not.toEqual(generateRoundProfile(round, pool, seeded(2)))
  })
  it.each([5000, 5800, 6600, 7400, 8200, 9000])('normalizes last finish exactly to %s ms using a common scale', (target) => {
    const roundNumber = (target - 5000) / 800 + 1
    const variedPool = pool.map((horse, index) => ({ ...horse, condition: index + 1 }))
    const input = { ...round, roundNumber, distance: 1000 + roundNumber * 200 }
    const profile = generateRoundProfile(input, variedPool, () => 0.5)
    expect(Math.max(...rankRound(profile).map((result) => result.finishTimeMs))).toBe(target)
    // With constant randomness, constant velocity is proportional to base(condition).
    const finishes = rankRound(profile)
    const first = finishes.find((result) => result.horseId === pool[0]!.id)!.finishTimeMs
    const second = finishes.find((result) => result.horseId === pool[1]!.id)!.finishTimeMs
    expect(first / second).toBeCloseTo((1 + 0.1 / 99) / 1, 12)
  })
  it('applies exactly the approved condition and random coefficients', () => {
    const horses = pool.map((horse) => ({ ...horse, condition: 1 }))
    const profile = generateRoundProfile(round, horses, () => 0)
    // Raw speed is .65 * .75; common scale for equal horses makes final speed 1/5000.
    expect(profile.horses.every((horse) => horse.knots.every((knot) => Math.abs(knot.velocity - 1 / 5000) < 1e-18))).toBe(true)
    // Compare differently randomized constant profiles in one field: no independent per-horse normalization.
    let call = 0
    const mixed = generateRoundProfile(round, horses, () => Math.floor(call++ / 10) === 0 ? 0 : 0.5)
    const slow = rankRound(mixed).find((result) => result.horseId === horses[0]!.id)!
    const fast = rankRound(mixed).find((result) => result.horseId === horses[1]!.id)!
    expect(fast.finishTimeMs / slow.finishTimeMs).toBeCloseTo(0.65 * 0.75, 12)
  })
  it('gives condition an advantage with the same random stream without guaranteeing victory', () => {
    const low = pool.map((horse) => ({ ...horse, condition: 1 }))
    const boosted = low.map((horse, index) => ({ ...horse, condition: index === 0 ? 100 : 1 }))
    const before = rankRound(generateRoundProfile(round, low, seeded(55)))
    const after = rankRound(generateRoundProfile(round, boosted, seeded(55)))
    expect(after.find((result) => result.horseId === low[0]!.id)!.rank).toBeLessThanOrEqual(before.find((result) => result.horseId === low[0]!.id)!.rank)
    let calls = 0
    const victory = rankRound(generateRoundProfile(round, boosted.map((horse, i) => ({ ...horse, condition: i === 0 ? 1 : 100 })), () => Math.floor(calls++ / 10) === 0 ? 1 - Number.EPSILON : 0))
    expect(victory[0]!.horseId).toBe(low[0]!.id)
  })
  it('can accelerate, decelerate and overtake within generated profiles', () => {
    let calls = 0
    const profile = generateRoundProfile(round, pool, () => {
      const horse = Math.floor(calls / 10)
      const slot = calls++ % 10
      if (slot === 0) return 0.5
      if (horse === 0) return slot <= 1 ? 0 : 1 - Number.EPSILON
      if (horse === 1) return slot <= 1 ? 1 - Number.EPSILON : 0
      return 0.5
    })
    const first = profile.horses[0]!.knots
    const second = profile.horses[1]!.knots
    expect(first.some((knot, i) => i && knot.velocity > first[i - 1]!.velocity)).toBe(true)
    expect(second.some((knot, i) => i && knot.velocity < second[i - 1]!.velocity)).toBe(true)
    const early = sampleRoundProgress(profile, 500)
    const late = sampleRoundProgress(profile, 4500)
    expect(early[0]!.progress).toBeLessThan(early[1]!.progress)
    expect(late[0]!.progress).toBeGreaterThan(late[1]!.progress)
  })
  it('does not mutate frozen inputs, and calls return independent profile graphs', () => {
    const horses = freeze(pool.map((horse) => ({ ...horse })))
    const race = freeze({ ...round, horseIds: [...round.horseIds] })
    const before = JSON.stringify({ horses, race })
    const profile = generateRoundProfile(race, horses, seeded(1))
    const other = generateRoundProfile(race, horses, seeded(1))
    expect(profile).toEqual(other)
    expect(profile.horses[0]!.knots).not.toBe(other.horses[0]!.knots)
    freeze(profile)
    rankRound(profile)
    sampleRoundProgress(profile, 123)
    expect(JSON.stringify({ horses, race })).toBe(before)
  })
})

describe('sampling and ranking', () => {
  it('is stateless at arbitrary times, clamps finite boundaries, and matches every profile finish', () => {
    const profile = generateRoundProfile(round, pool, seeded(99))
    for (const time of [-Number.MAX_VALUE, -1, 0]) expect(sampleRoundProgress(profile, time).every((sample) => sample.progress === 0)).toBe(true)
    expect(sampleRoundProgress(profile, Number.MAX_VALUE).every((sample) => sample.progress === 1)).toBe(true)
    const first = sampleRoundProgress(profile, 1234.567)
    sampleRoundProgress(profile, 4999)
    expect(sampleRoundProgress(profile, 1234.567)).toEqual(first)
    for (const horse of profile.horses) for (const knot of horse.knots.slice(1, -1)) {
      const position = (time: number) => sampleRoundProgress(profile, time).find((sample) => sample.horseId === horse.horseId)!.progress
      expect(position(knot.elapsedMs - 1e-5)).toBeCloseTo(position(knot.elapsedMs + 1e-5), 7)
      expect(position(knot.elapsedMs - 1e-5)).toBeLessThan(position(knot.elapsedMs))
      expect(position(knot.elapsedMs)).toBeLessThan(position(knot.elapsedMs + 1e-5))
    }
    assertProfile(profile)
  })
  it('breaks exact ties with locale-independent ID ordering regardless of participant order', () => {
    const ids = ['z', 'Z', 'a', 'A', 'ä', '10', '2', '!', '_', '~']
    const horses = pool.map((horse, i) => ({ ...horse, id: ids[i] ?? `unused-${i}` }))
    const profile = generateRoundProfile({ ...round, horseIds: ids.slice().reverse() }, horses, () => 0.5)
    expect(rankRound(profile).map((result) => result.horseId)).toEqual([...ids].sort((a, b) => a < b ? -1 : a > b ? 1 : 0))
    expect(new Set(rankRound(profile).map((result) => result.finishTimeMs)).size).toBe(1)
  })
  it.each([NaN, Infinity, -Infinity, '2', undefined])('rejects non-finite/non-number elapsed time %s', (value) => {
    const profile = generateRoundProfile(round, pool, () => 0.5)
    expect(() => sampleRoundProgress(profile, value as number)).toThrow(RangeError)
  })
  it('orders unequal near finishes numerically before applying the ID tie-breaker', () => {
    const profile: RoundRaceProfile = {
      roundNumber: 1, distance: 1200, targetDurationMs: 5000,
      horses: round.horseIds.map((horseId, index) => {
        const end = index === 1 ? 5000 - 1e-9 : 5000
        return { horseId, knots: [{ elapsedMs: 0, velocity: 1 / end }, { elapsedMs: end, velocity: 1 / end }] }
      }),
    }
    expect(rankRound(profile)[0]!.horseId).toBe(round.horseIds[1])
    expect(rankRound(profile)[1]!.horseId).toBe(round.horseIds[0])
  })
  it('handles near-constant velocity and near ties without epsilon sorting', () => {
    let i = 0
    const profile = generateRoundProfile(round, pool, () => 0.5 + (i++ % 3) * Number.EPSILON)
    assertProfile(profile)
    const ranked = rankRound(profile)
    expect(ranked.every((result, index) => index === 0 || result.finishTimeMs >= ranked[index - 1]!.finishTimeMs)).toBe(true)
  })
})

describe('generation validation', () => {
  it.each([0, 1.5, 7, NaN, Infinity])('rejects invalid round number %s before randomness', (roundNumber) => {
    const random = vi.fn(() => 0.5)
    expect(() => generateRoundProfile({ ...round, roundNumber }, pool, random)).toThrow(RangeError)
    expect(random).not.toHaveBeenCalled()
  })
  it('rejects mismatched distance and participant sizes/membership', () => {
    for (const race of [
      { ...round, distance: 1400 }, { ...round, horseIds: [] },
      { ...round, horseIds: Array(10).fill(pool[0]!.id) },
      { ...round, horseIds: [...round.horseIds.slice(0, 9), 'missing'] },
      { ...round, horseIds: Array(10) },
    ]) expect(() => generateRoundProfile(race, pool, () => 0)).toThrow()
  })
  it.each([0, 101, 1.5, NaN, Infinity, '50', undefined])('rejects invalid condition %s', (condition) => {
    const horses = pool.map((horse, i) => i === 19 ? { ...horse, condition } : horse) as readonly Horse[]
    const random = vi.fn(() => 0)
    expect(() => generateRoundProfile(round, horses, random)).toThrow(RangeError)
    expect(random).not.toHaveBeenCalled()
  })
  it('rejects malformed pools and identities', () => {
    for (const horses of [null, [], Array(20), pool.slice(1), [...pool.slice(0, 19), pool[0]], pool.map((horse, i) => i === 0 ? { ...horse, id: '' } : horse), pool.map((horse) => ({ ...horse, color: 'same' }))]) {
      expect(() => generateRoundProfile(round, horses as readonly Horse[], () => 0.5)).toThrow()
    }
    expect(() => generateRoundProfile(null as unknown as RaceRound, pool, () => 0.5)).toThrow(TypeError)
  })
  it.each([null, undefined, 1, {}])('rejects invalid random source %s', (random) => {
    expect(() => generateRoundProfile(round, pool, random as RandomSource)).toThrow(TypeError)
  })
  it.each([NaN, Infinity, -Infinity, -0.1, 1, '0.5', undefined])('rejects invalid random sample %s, including late failures', (value) => {
    let calls = 0
    expect(() => generateRoundProfile(round, pool, () => ++calls === 100 ? value as number : 0.5)).toThrow(RangeError)
    expect(calls).toBe(100)
  })
  it('propagates source errors without retry or input mutation', () => {
    const before = JSON.stringify(pool)
    const failure = new Error('exhausted')
    let calls = 0
    expect(() => generateRoundProfile(round, pool, () => { if (++calls === 12) throw failure; return 0.5 })).toThrow(failure)
    expect(calls).toBe(12)
    expect(JSON.stringify(pool)).toBe(before)
  })
})

describe('profile validation', () => {
  const cases: [string, (p: any) => void][] = [
    ['duplicate IDs', (p) => { p.horses[1].horseId = p.horses[0].horseId }],
    ['missing horse', (p) => { p.horses.pop() }],
    ['empty identity', (p) => { p.horses[0].horseId = '' }],
    ['missing knots', (p) => { p.horses[0].knots = null }],
    ['too few knots', (p) => { p.horses[0].knots = [p.horses[0].knots[0]] }],
    ['zero velocity', (p) => { p.horses[0].knots[0].velocity = 0 }],
    ['infinite velocity', (p) => { p.horses[0].knots[0].velocity = Infinity }],
    ['negative velocity', (p) => { p.horses[0].knots[0].velocity = -1 }],
    ['NaN time', (p) => { p.horses[0].knots[1].elapsedMs = NaN }],
    ['nonzero start', (p) => { p.horses[0].knots[0].elapsedMs = 1 }],
    ['equal times', (p) => { p.horses[0].knots[1].elapsedMs = 0 }],
    ['invalid integral', (p) => { p.horses[0].knots[0].velocity *= 0.1 }],
    ['missing last finisher', (p) => { p.horses.forEach((h: any) => { h.knots.forEach((k: any) => { k.elapsedMs *= 0.9; k.velocity /= 0.9 }) }) }],
    ['wrong target', (p) => { p.targetDurationMs = 5001 }],
    ['wrong distance', (p) => { p.distance = 1400 }],
    ['sparse horses', (p) => { delete p.horses[0] }],
    ['sparse knots', (p) => { delete p.horses[0].knots[0] }],
  ]
  it.each(cases)('rejects malformed %s for sampling and ranking', (_, mutate) => {
    const profile = clone(generateRoundProfile(round, pool, () => 0.5))
    mutate(profile)
    expect(() => sampleRoundProgress(profile, 1)).toThrow()
    expect(() => rankRound(profile)).toThrow()
  })
  it.each([null, undefined, {}, { horses: null }])('rejects invalid profile shape %s', (profile) => {
    expect(() => rankRound(profile as unknown as RoundRaceProfile)).toThrow(TypeError)
  })
})
