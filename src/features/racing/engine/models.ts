export interface Horse {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly condition: number
}

export interface RaceRound {
  readonly roundNumber: number
  readonly distance: number
  readonly horseIds: readonly string[]
}

export interface RaceSchedule {
  readonly rounds: readonly RaceRound[]
}

export type RandomSource = () => number
