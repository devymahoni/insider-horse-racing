/** The driver reports clock signals; only the store owns race progress. */
export interface RuntimeCallbacks {
  readonly onFrame: (timestamp: number) => void
  readonly onVisibility: (hidden: boolean) => void
  readonly onError: (error: unknown) => void
}

export interface RaceRuntime {
  now(): number
  /** Starts one stream. The first frame must not be delivered synchronously. */
  start(callbacks: RuntimeCallbacks): void
  stop(): void
  dispose(): void
}
