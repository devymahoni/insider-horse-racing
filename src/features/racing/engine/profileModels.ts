/** Velocity is normalized course progress per millisecond. */
export interface VelocityKnot {
  readonly elapsedMs: number
  readonly velocity: number
}

export interface HorseRaceProfile {
  readonly horseId: string
  /** Starts at zero and ends at the analytically calculated finish crossing. */
  readonly knots: readonly VelocityKnot[]
}

export interface RoundRaceProfile {
  readonly roundNumber: number
  readonly distance: number
  readonly targetDurationMs: number
  readonly horses: readonly HorseRaceProfile[]
}

export interface ProgressSample {
  readonly horseId: string
  readonly progress: number
}

export interface Finisher {
  readonly horseId: string
  readonly rank: number
  readonly finishTimeMs: number
}
