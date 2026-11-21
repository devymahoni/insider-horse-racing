import type { Horse, RaceRound, RandomSource } from './models'
import type { Finisher, HorseRaceProfile, ProgressSample, RoundRaceProfile, VelocityKnot } from './profileModels'
import { finishTime, segmentProgress, targetDuration, validateProfile } from './profileMath'
import { randomValue, validateRandomSource } from './random'

function validateInputs(round: RaceRound, horses: readonly Horse[], random: RandomSource): number {
  if (!round || typeof round !== 'object' || !Array.isArray(round.horseIds) || !Array.isArray(horses)) {
    throw new TypeError('Round and horse pool must have valid shapes')
  }
  const target = targetDuration(round.roundNumber, round.distance)
  if (horses.length !== 20 || round.horseIds.length !== 10) {
    throw new RangeError('A round requires ten participants from a twenty-horse pool')
  }
  const ids = new Set<string>()
  for (const horse of horses) {
    if (!horse || typeof horse.id !== 'string' || horse.id.trim() === '' || ids.has(horse.id) ||
        typeof horse.name !== 'string' || horse.name.trim() === '' ||
        typeof horse.color !== 'string' || horse.color.trim() === '') {
      throw new TypeError('Horses require unique identities, names, and colors')
    }
    if (!Number.isInteger(horse.condition) || horse.condition < 1 || horse.condition > 100) {
      throw new RangeError('Conditions must be integers in [1, 100]')
    }
    ids.add(horse.id)
  }
  if (new Set(horses.map((horse) => horse.color)).size !== 20) {
    throw new TypeError('Horse colors must be unique')
  }
  const participants = new Set<string>()
  for (const id of round.horseIds) {
    if (typeof id !== 'string' || !ids.has(id) || participants.has(id)) {
      throw new TypeError('Participants must be ten distinct pool members')
    }
    participants.add(id)
  }
  validateRandomSource(random)
  return target
}

function rawProfile(horse: Horse, random: RandomSource): HorseRaceProfile {
  const c = (horse.condition - 1) / 99
  const base = 1 + 0.10 * c + 0.35 * (2 * randomValue(random) - 1)
  // Always consume the complete fixed stream: race factor followed by nine knots.
  const velocities = Array.from({ length: 9 }, () => base * (1 + 0.25 * (2 * randomValue(random) - 1)))
  const knots: VelocityKnot[] = [{ elapsedMs: 0, velocity: velocities[0]! }]
  let progress = 0
  for (let segment = 0; segment < 8; segment++) {
    const start = knots[knots.length - 1]!
    const end = { elapsedMs: (segment + 1) * 3 / 8, velocity: velocities[segment + 1]! }
    const duration = end.elapsedMs - start.elapsedMs
    const distance = segmentProgress(start, end, duration)
    if (progress + distance >= 1) {
      const remaining = 1 - progress
      const acceleration = (end.velocity - start.velocity) / duration
      // Rationalized positive root is stable for zero or very small acceleration.
      const crossing = 2 * remaining / (start.velocity +
        Math.sqrt(start.velocity * start.velocity + 2 * acceleration * remaining))
      knots.push({ elapsedMs: start.elapsedMs + crossing, velocity: start.velocity + acceleration * crossing })
      return { horseId: horse.id, knots }
    }
    progress += distance
    knots.push(end)
  }
  // Minimum speed is 0.4875, so the three-unit horizon exceeds every finish.
  throw new RangeError('Velocity profile did not reach the finish within its bounded horizon')
}

/** Call immediately before a round starts; generation never advances a clock. */
export function generateRoundProfile(round: RaceRound, horses: readonly Horse[], random: RandomSource): RoundRaceProfile {
  const targetDurationMs = validateInputs(round, horses, random)
  const pool = new Map(horses.map((horse) => [horse.id, horse]))
  const raw = round.horseIds.map((id) => rawProfile(pool.get(id)!, random))
  const latest = Math.max(...raw.map(finishTime))
  const scale = targetDurationMs / latest
  const profile: RoundRaceProfile = {
    roundNumber: round.roundNumber,
    distance: round.distance,
    targetDurationMs,
    horses: raw.map((horse) => ({
      horseId: horse.horseId,
      knots: horse.knots.map((knot) => ({
        // Pin all equal last finishers exactly to the shared target, avoiding roundoff.
        elapsedMs: knot.elapsedMs === latest ? targetDurationMs : knot.elapsedMs * scale,
        velocity: knot.velocity / scale,
      })),
    })),
  }
  validateProfile(profile)
  return profile
}

export function sampleRoundProgress(profile: RoundRaceProfile, elapsedMs: number): readonly ProgressSample[] {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    throw new RangeError('Elapsed time must be finite')
  }
  validateProfile(profile)
  return profile.horses.map((horse) => {
    if (elapsedMs <= 0) return { horseId: horse.horseId, progress: 0 }
    if (elapsedMs >= finishTime(horse)) return { horseId: horse.horseId, progress: 1 }
    let progress = 0
    for (let index = 1; index < horse.knots.length; index++) {
      const start = horse.knots[index - 1]!
      const end = horse.knots[index]!
      const duration = Math.min(elapsedMs, end.elapsedMs) - start.elapsedMs
      progress += segmentProgress(start, end, duration)
      if (elapsedMs <= end.elapsedMs) break
    }
    return { horseId: horse.horseId, progress: Math.min(1, Math.max(0, progress)) }
  })
}

export function rankRound(profile: RoundRaceProfile): readonly Finisher[] {
  validateProfile(profile)
  return [...profile.horses].sort((a, b) => {
    const difference = finishTime(a) - finishTime(b)
    return difference || (a.horseId < b.horseId ? -1 : a.horseId > b.horseId ? 1 : 0)
  }).map((horse, index) => ({ horseId: horse.horseId, rank: index + 1, finishTimeMs: finishTime(horse) }))
}
