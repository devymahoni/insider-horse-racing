import { computed, onScopeDispose, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { generateHorses } from '../engine/generateHorses'
import { generateSchedule } from '../engine/generateSchedule'
import { generateRoundProfile, rankRound, sampleRoundProgress } from '../engine/raceSimulation'
import type { Horse, RaceSchedule, RandomSource } from '../engine/models'
import type { Finisher, RoundRaceProfile } from '../engine/profileModels'
import type { RaceRuntime } from '../runtime/raceRuntime'

export type RacePhase = 'Idle' | 'Ready' | 'Running' | 'Paused' | 'Completed' | 'Error' | 'Disposed'
export type PauseReason = 'manual' | 'hidden' | 'frame-gap'
export interface RaceResult {
  readonly roundNumber: number
  readonly finishers: readonly Finisher[]
}
export interface RaceFailure {
  readonly operation: string
  readonly message: string
  readonly cleanupMessages: readonly string[]
}
export interface RacingState {
  readonly phase: RacePhase
  readonly horses: readonly Horse[]
  readonly schedule: RaceSchedule | null
  readonly activeRoundIndex: number | null
  readonly activeProfile: RoundRaceProfile | null
  readonly elapsedMs: number
  readonly results: readonly RaceResult[]
  readonly pauseReason: PauseReason | null
  readonly error: RaceFailure | null
}
export interface RacingDependencies {
  /** Called once for each Pinia store instance; never share driver resources. */
  readonly createRuntime: () => RaceRuntime
  readonly random: RandomSource
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Define once at composition, instantiate with the app's Pinia. No browser globals. */
export function createUseRacingStore(dependencies: RacingDependencies) {
  return defineStore('racing', () => {
    const runtime = dependencies.createRuntime()
    const state = shallowRef<RacingState>({
      phase: 'Idle', horses: [], schedule: null, activeRoundIndex: null,
      activeProfile: null, elapsedMs: 0, results: [], pauseReason: null, error: null,
    })
    // Operational resources, not another copy of game progress.
    let session = 0
    let lastTimestamp: number | null = null
    let actionInProgress = false

    // Read afresh after user-observable transitions and injected operations.
    const isDisposed = () => state.value.phase === 'Disposed'

    function fail(operation: string, error: unknown): void {
      if (isDisposed()) return
      session++
      lastTimestamp = null
      const cleanupMessages: string[] = []
      try { runtime.stop() } catch (cleanup) { cleanupMessages.push(message(cleanup)) }
      if (isDisposed()) return
      state.value = {
        ...state.value, phase: 'Error', pauseReason: null,
        error: { operation, message: message(error), cleanupMessages },
      }
    }

    function clock(): number {
      const timestamp = runtime.now()
      if (!Number.isFinite(timestamp) || timestamp < 0 || (lastTimestamp !== null && timestamp < lastTimestamp)) {
        throw new RangeError('Clock must be finite and monotonic')
      }
      return timestamp
    }

    function stopStream(): void {
      session++
      // Retain the clock checkpoint to detect backwards reads across Pause/Resume.
      // beginRound rebases it before any new active time is accumulated.
      runtime.stop()
    }

    function completeRound(): void {
      const current = state.value
      if (current.activeRoundIndex !== current.results.length || !current.activeProfile || !current.schedule) {
        throw new Error('Round completion does not match the result prefix')
      }
      const results = [...current.results, {
        roundNumber: current.activeProfile.roundNumber,
        finishers: rankRound(current.activeProfile),
      }]
      const completed = results.length === current.schedule.rounds.length
      state.value = {
        ...current, results, phase: completed ? 'Completed' : current.phase,
        activeRoundIndex: completed ? null : results.length,
        activeProfile: null, elapsedMs: 0,
      }
    }

    function enterPaused(reason: PauseReason): void {
      if (state.value.phase !== 'Running') return
      stopStream()
      if (!isDisposed()) state.value = { ...state.value, phase: 'Paused', pauseReason: reason }
    }

    function advance(timestamp: number, pauseAtBoundary: boolean): void {
      if (!Number.isFinite(timestamp) || timestamp < 0 || lastTimestamp === null || timestamp < lastTimestamp) {
        throw new RangeError('Clock must be finite and monotonic')
      }
      const delta = timestamp - lastTimestamp
      if (delta > 1000) {
        enterPaused('frame-gap')
        return
      }
      lastTimestamp = timestamp
      const profile = state.value.activeProfile
      if (!profile) throw new Error('Running round has no profile')
      const elapsedMs = Math.min(profile.targetDurationMs, state.value.elapsedMs + delta)
      state.value = { ...state.value, elapsedMs }
      if (state.value.phase !== 'Running') return
      if (elapsedMs === profile.targetDurationMs) {
        stopStream()
        if (state.value.phase !== 'Running') return
        completeRound()
        if (state.value.phase !== 'Running') return
        if (pauseAtBoundary) {
          state.value = { ...state.value, phase: 'Paused', pauseReason: 'manual' }
        } else beginRound()
      }
    }

    function beginRound(): void {
      const current = state.value
      const round = current.schedule?.rounds[current.activeRoundIndex ?? -1]
      if (!round) throw new Error('No scheduled round to begin')
      const profile = current.activeProfile ?? generateRoundProfile(round, current.horses, dependencies.random)
      if (isDisposed()) return
      const timestamp = clock()
      if (isDisposed()) return
      lastTimestamp = timestamp
      const token = ++session
      state.value = { ...current, phase: 'Running', activeProfile: profile, pauseReason: null, error: null }
      if (state.value.phase !== 'Running' || token !== session) return
      const live = () => token === session && state.value.phase === 'Running'
      runtime.start({
        onFrame(timestamp) {
          if (!live()) return
          signal('frame', () => advance(timestamp, false))
        },
        onVisibility(hidden) {
          if (!live() || !hidden) return
          signal('visibility', () => {
            advance(clock(), true)
            if (state.value.phase === 'Running') enterPaused('hidden')
            else if (state.value.phase === 'Paused') state.value = { ...state.value, pauseReason: 'hidden' }
          })
        },
        onError(error) { if (live()) signal('runtime', () => { throw error }) },
      })
    }

    function signal(operation: string, action: () => void): void {
      const previous = actionInProgress
      actionInProgress = true
      try { action() } catch (error) { fail(operation, error) }
      finally { actionInProgress = previous }
    }

    function intent(action: () => void): void {
      if (state.value.phase === 'Disposed' || actionInProgress) return
      actionInProgress = true
      try { action() } catch (error) { fail('action', error) }
      finally { actionInProgress = false }
    }

    function generate(): void {
      intent(() => {
        if (!['Idle', 'Ready', 'Completed', 'Error'].includes(state.value.phase)) return
        const horses = generateHorses(dependencies.random)
        if (isDisposed()) return
        const schedule = generateSchedule(horses.map((horse) => horse.id), dependencies.random)
        if (isDisposed()) return
        stopStream()
        if (isDisposed()) return
        state.value = {
          phase: 'Ready', horses, schedule, activeRoundIndex: 0, activeProfile: null,
          elapsedMs: 0, results: [], pauseReason: null, error: null,
        }
      })
    }
    function start(): void {
      intent(() => { if (state.value.phase === 'Ready') beginRound() })
    }
    function pause(): void {
      intent(() => {
        if (state.value.phase !== 'Running') return
        advance(clock(), true)
        if (state.value.phase === 'Running') enterPaused('manual')
      })
    }
    function resume(): void {
      intent(() => { if (state.value.phase === 'Paused') beginRound() })
    }
    function dispose(): void {
      if (isDisposed()) return
      session++
      lastTimestamp = null
      // Publish the terminal guard before cleanup, which may deliver queued signals.
      state.value = { ...state.value, phase: 'Disposed', pauseReason: null }
      try { runtime.dispose() } catch (error) {
        const cleanupMessages: string[] = []
        try { runtime.stop() } catch (cleanup) { cleanupMessages.push(message(cleanup)) }
        state.value = { ...state.value, error: { operation: 'dispose', message: message(error), cleanupMessages } }
      }
    }
    onScopeDispose(dispose)

    const positions = computed(() => state.value.activeProfile
      ? sampleRoundProgress(state.value.activeProfile, state.value.elapsedMs) : [])
    const canGenerate = computed(() => ['Idle', 'Ready', 'Completed', 'Error'].includes(state.value.phase))
    const canStart = computed(() => state.value.phase === 'Ready')
    const canPause = computed(() => state.value.phase === 'Running')
    const canResume = computed(() => state.value.phase === 'Paused')
    return { state, positions, canGenerate, canStart, canPause, canResume, generate, start, pause, resume, dispose }
  })
}
