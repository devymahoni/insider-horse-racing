import type { Horse, RandomSource } from './models'
import { randomValue, validateRandomSource } from './random'

const COLORS = [
  '#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231',
  '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE',
  '#008080', '#E6BEFF', '#9A6324', '#FFFAC8', '#800000',
  '#AAFFC3', '#808000', '#FFD8B1', '#000075', '#808080',
] as const

export function generateHorses(random: RandomSource): readonly Horse[] {
  validateRandomSource(random)
  return COLORS.map((color, index) => ({
    id: `horse-${String(index + 1).padStart(2, '0')}`,
    name: `Horse ${index + 1}`,
    color,
    condition: Math.floor(randomValue(random) * 100) + 1,
  }))
}
