import type { RaceRound, RaceSchedule, RandomSource } from './models'
import { shuffled, validateRandomSource } from './random'

const DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200] as const

export function generateSchedule(horseIds: readonly string[], random: RandomSource): RaceSchedule {
  if (!Array.isArray(horseIds)) {
    throw new TypeError('Horse IDs must be an array')
  }
  if (horseIds.length !== 20) {
    throw new RangeError('A schedule requires exactly 20 horse IDs')
  }
  // Iteration also rejects sparse arrays rather than silently skipping missing entries.
  for (const id of horseIds) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('Each horse ID must be a non-empty string')
    }
  }
  if (new Set(horseIds).size !== 20) {
    throw new TypeError('Horse IDs must be unique')
  }
  validateRandomSource(random)

  const remaining = new Map(horseIds.map((id) => [id, 3]))
  const rounds: RaceRound[] = DISTANCES.map((distance, index) => {
    const roundsLeft = DISTANCES.length - index
    const mandatory = horseIds.filter((id) => remaining.get(id) === roundsLeft)
    const candidates = horseIds.filter((id) => {
      const count = remaining.get(id)!
      return count > 0 && count < roundsLeft
    })
    const places = 10 - mandatory.length
    const selected = [
      ...mandatory,
      ...(places > 0 ? shuffled(candidates, random).slice(0, places) : []),
    ]
    for (const id of selected) {
      remaining.set(id, remaining.get(id)! - 1)
    }
    // Sum remaining = 10 * roundsLeft; mandatory inclusion preserves capacity
    // for the next round, so construction needs neither retries nor backtracking.
    return { roundNumber: index + 1, distance, horseIds: selected }
  })
  return { rounds }
}
