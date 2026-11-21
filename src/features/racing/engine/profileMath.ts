import type { HorseRaceProfile, RoundRaceProfile, VelocityKnot } from './profileModels'

export function targetDuration(roundNumber: number, distance: number): number {
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 6 ||
      distance !== 1000 + roundNumber * 200) {
    throw new RangeError('Round number and distance must match the six-round program')
  }
  return 5000 + (roundNumber - 1) * 800
}

/** Integrate linear speed without subtracting nearly equal squared velocities. */
export function segmentProgress(start: VelocityKnot, end: VelocityKnot, elapsed: number): number {
  const fraction = elapsed / (end.elapsedMs - start.elapsedMs)
  return elapsed * (start.velocity + (end.velocity - start.velocity) * fraction / 2)
}

export function finishTime(horse: HorseRaceProfile): number {
  return horse.knots[horse.knots.length - 1]!.elapsedMs
}

/** Tolerance is for validating arithmetic, never for comparing finish order. */
function closeTo(a: number, b: number): boolean {
  return Math.abs(a - b) <= 128 * Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b))
}

export function validateProfile(profile: RoundRaceProfile): void {
  if (!profile || typeof profile !== 'object' || !Array.isArray(profile.horses)) {
    throw new TypeError('Round profile must contain horse profiles')
  }
  const target = targetDuration(profile.roundNumber, profile.distance)
  if (profile.targetDurationMs !== target || profile.horses.length !== 10) {
    throw new RangeError('Round profile must have its target duration and ten horses')
  }
  const ids = new Set<string>()
  let latestFinish = 0
  for (const horse of profile.horses) {
    if (!horse || typeof horse.horseId !== 'string' || horse.horseId.trim() === '' ||
        ids.has(horse.horseId) || !Array.isArray(horse.knots)) {
      throw new TypeError('Horse profiles require distinct identities and knot arrays')
    }
    ids.add(horse.horseId)
    if (horse.knots.length < 2 || horse.knots.length > 9) {
      throw new RangeError('A horse profile requires one to eight velocity segments')
    }
    let progress = 0
    for (let index = 0; index < horse.knots.length; index++) {
      const knot = horse.knots[index]
      if (!knot || !Number.isFinite(knot.elapsedMs) || !Number.isFinite(knot.velocity) ||
          knot.velocity <= 0 || (index === 0 ? knot.elapsedMs !== 0 :
            knot.elapsedMs <= horse.knots[index - 1]!.elapsedMs)) {
        throw new RangeError('Knots require finite increasing times and positive finite velocities')
      }
      if (index > 0) {
        const previous = horse.knots[index - 1]!
        progress += segmentProgress(previous, knot, knot.elapsedMs - previous.elapsedMs)
        if (!Number.isFinite(progress) || (index < horse.knots.length - 1 && progress >= 1)) {
          throw new RangeError('A profile must end at its first finish crossing')
        }
      }
    }
    if (!closeTo(progress, 1) || finishTime(horse) > target) {
      throw new RangeError('Horse profile must integrate to one at its finish within the target')
    }
    latestFinish = Math.max(latestFinish, finishTime(horse))
  }
  if (latestFinish !== target) {
    throw new RangeError('Last finisher must meet the target duration')
  }
}
