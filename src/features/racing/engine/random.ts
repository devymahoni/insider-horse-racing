import type { RandomSource } from './models'

export function validateRandomSource(random: RandomSource): void {
  if (typeof random !== 'function') {
    throw new TypeError('Random source must be callable')
  }
}

export function randomValue(random: RandomSource): number {
  const value = random()
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a finite number in [0, 1)')
  }
  return value
}

export function shuffled<T>(values: readonly T[], random: RandomSource): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomValue(random) * (i + 1))
    const value = result[i]!
    result[i] = result[j]!
    result[j] = value
  }
  return result
}
