import type { RaceRuntime, RuntimeCallbacks } from './raceRuntime'

/** Small browser port permits scheduling/listener tests without a DOM emulator. */
export interface BrowserRuntimeEnvironment {
  now(): number
  requestFrame(callback: () => void): number
  cancelFrame(handle: number): void
  isHidden(): boolean
  addVisibilityListener(listener: () => void): void
  removeVisibilityListener(listener: () => void): void
}

function browserEnvironment(): BrowserRuntimeEnvironment {
  return {
    now: () => performance.now(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    isHidden: () => document.hidden,
    addVisibilityListener: (listener) => document.addEventListener('visibilitychange', listener),
    removeVisibilityListener: (listener) => document.removeEventListener('visibilitychange', listener),
  }
}

export function createBrowserRaceRuntime(environment?: BrowserRuntimeEnvironment): RaceRuntime {
  // No browser access at import time; all clock reads share this one clock domain.
  const browser = environment ?? browserEnvironment()
  let active: RuntimeCallbacks | undefined
  let frame: number | undefined
  let visibility: (() => void) | undefined
  let generation = 0
  let disposed = false

  function stop(): void {
    generation++
    active = undefined
    const pending = frame
    const listener = visibility
    frame = undefined
    visibility = undefined
    const errors: unknown[] = []
    if (pending !== undefined) {
      try { browser.cancelFrame(pending) } catch (error) { errors.push(error) }
    }
    if (listener) {
      try { browser.removeVisibilityListener(listener) } catch (error) { errors.push(error) }
    }
    if (errors.length) throw new AggregateError(errors, 'Runtime cleanup failed')
  }

  function start(callbacks: RuntimeCallbacks): void {
    if (disposed) throw new Error('Runtime is disposed')
    if (active) return
    const session = ++generation
    active = callbacks
    const current = () => !disposed && session === generation && active === callbacks
    function fail(error: unknown): void {
      if (!current()) return
      let failure = error
      try { stop() } catch (cleanup) {
        failure = new AggregateError([error, cleanup], 'Runtime failed during cleanup')
      }
      callbacks.onError(failure)
    }
    function schedule(): void {
      if (current()) frame = browser.requestFrame(deliver)
    }
    function deliver(): void {
      if (!current()) return
      frame = undefined
      try {
        callbacks.onFrame(browser.now())
        // A callback may pause, dispose, or restart the driver. Do not re-arm it.
        schedule()
      } catch (error) { fail(error) }
    }
    visibility = () => {
      if (!current()) return
      try { callbacks.onVisibility(browser.isHidden()) } catch (error) { fail(error) }
    }
    try {
      browser.addVisibilityListener(visibility)
      visibility()
      schedule()
    } catch (error) {
      // start() reports synchronous resource failures to its caller.
      try { stop() } catch (cleanup) {
        throw new AggregateError([error, cleanup], 'Runtime start and cleanup failed')
      }
      throw error
    }
  }

  return {
    now: () => browser.now(),
    start,
    stop,
    dispose() {
      if (disposed) return
      disposed = true
      stop()
    },
  }
}
