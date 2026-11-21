import { createUseRacingStore } from '../state/racingStore'
import { createBrowserRaceRuntime } from '../runtime/browserRaceRuntime'

// Composition is the only place production randomness and browser resources enter.
export const useRacingStore = createUseRacingStore({
  createRuntime: () => createBrowserRaceRuntime(),
  random: () => Math.random(),
})
