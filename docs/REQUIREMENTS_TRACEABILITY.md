# Requirements Traceability and Delivery Evidence

## Scope and interpretation

AI-assisted audit, updated for the local maintainability package based on main `a1cb6de782181bf8b82e6dd8187630f4b06f99be`, including preserved gallop work. The original WP-005 results below remain explicitly historical where identified. Source: privately supplied *Insider One Case Study - Front-end Developer.pdf*, printed pages 1–2, read in full. The PDF remains excluded from Git.

IDs match [REQUIREMENTS.md](REQUIREMENTS.md). **Pass** means the stated observable criterion is supported by the named checks/inspection; it is not a proof of every possible input or a claim of human acceptance. **Unverified** identifies evidence not collected. No failed mandatory criterion was observed in implementation verification. Independent QA and Review are subsequent gates and must report their own outcomes.

S3 permits a randomly generated list of 1–20 horses, while S9 fixes the available pool at 20. Technical Owner decision D1 resolves this ambiguity as exactly twenty. The implementation does not expose variable pool size. Vue is phrased as permitted on page 1 but Vue components and Vuex/Pinia are expected on page 2.

## Explicit PDF requirements

All implementation paths below are relative to `src/features/racing/` unless stated otherwise. Named tests live in `engine/engine.test.ts`, `engine/raceSimulation.test.ts`, `state/racingStore.test.ts`, `runtime/browserRaceRuntime.test.ts`, `components/racingUi.test.ts`, and root `e2e/racing.spec.ts`.

| ID / classification | PDF source and criterion | Implementation | Verification and evidence | Status |
| --- | --- | --- | --- | --- |
| S1 Mandatory | P1 introduction: interactive horse racing game | `components/RacingPage.vue`, `state/racingStore.ts` | Playwright `real-time six-round workflow, guarded actions, retained results and accessibility`: Generate/Start/Pause/Resume/completion/regeneration | Pass |
| S2 Permitted choice | P1 Requirements 1: VueJs permitted | Root `package.json`, `src/main.ts`, Vue SFCs | Manifest/code inspection; type check and production build | Pass: Vue 3 selected |
| S3 Ambiguous; resolved | P1 Requirements 2: random list of 1–20 horses | `engine/generateHorses.ts` | `generates exactly twenty named horses with stable pool-local IDs and unique colors`; controlled-stream conditions; D1 resolution above | Pass under approved interpretation |
| S4 Mandatory | P1 Requirements 3: Generate creates six rounds | `state/racingStore.ts`, `engine/generateSchedule.ts` | `generates a valid pool and balanced schedule atomically without profiles`; real browser six-program assertion | Pass |
| S5 Mandatory | P1 Requirements 4: Start runs one round at a time | `state/racingStore.ts` | `runs six rounds sequentially and publishes exactly once`; browser observes result prefixes 1 through 6 | Pass |
| S6 Mandatory | P1 Requirements 5: results appear sequentially after each race | `state/racingStore.ts`, `components/RaceResults.vue` | Browser prefix assertions, ten records per published round, 60 retained records; store/component integration | Pass |
| S7 Mandatory | P1 Requirements 6: visibly animated movement | `components/RaceTrack.vue`, `engine/raceSimulation.ts` | Real-time progress change and screenshots; arbitrary-time sampling tests. Reduced-motion presentation intentionally uses percentages | Pass |
| S8 Quality expectation | P1 Requirements 7: clean, maintainable structure | `engine/`, `state/`, `runtime/`, `components/` | Code/ADR comparison, type check, layered tests, no second controller | Pass by inspection; maintainability is qualitative |
| S9 Mandatory | P1 Rules 1: total pool of twenty | `engine/generateHorses.ts`, `components/HorsePool.vue` | Horse-count unit assertions; browser full roster count 20 and mobile disclosure | Pass |
| S10 Mandatory | P1 Rules 2: unique colors | `engine/generateHorses.ts` | Fixed 20-color palette inspected; unit test verifies20 unique colors | Pass |
| S11 Mandatory | P1 Rules 3: conditions 1–100 | `engine/generateHorses.ts`, `engine/random.ts` | `produces reproducible integer conditions within bounds across controlled streams`, boundary and invalid-random cases | Pass |
| S12 Mandatory | P1 Rules 4–5: six rounds, ten random horses each | `engine/generateSchedule.ts` | `satisfies all scheduling invariants for many deterministic streams`; browser six rounds/ten distinct names per round | Pass; no uniform-sampling claim |
| S13 Mandatory | P1 Rules 6: ordered 1200/1400/1600/1800/2000/2200m | `engine/generateSchedule.ts`, `components/RaceProgram.vue` | Unit distances and browser distance assertions | Pass |
| S14 Mandatory | P2 Technical Expectations 1: Vuex/Pinia state | `state/racingStore.ts`, `components/racingComposition.ts` | Pinia authority inspected; store/component integration and real browser actions | Pass: Pinia |
| S15 Mandatory | P2 Technical Expectations 2: Vue components | `components/*.vue`, root `src/App.vue` | Separate controls, pool, track, program, results and page composition; build/type check | Pass |
| S16 Quality expectation | P2 Additional Notes 1: organized/adaptable components/state | Approved four boundaries in ADR 0002 | Source boundary inspection; injected randomness/runtime tests; no business logic in rendering | Pass by inspection; future scalability unproven |
| S17 Bonus | P2 Bonus 1–3: unit, E2E, visual tests | Existing 197 unit tests; `e2e/racing.spec.ts`, `e2e/gallop.spec.ts`, `e2e/visual.spec.ts` | Unit/E2E passed;16 state/viewport screenshots inspected against PDF example and accepted UI | Unit/E2E Pass; three macOS Chromium pixel baselines added; Linux pixel baselines unverified |

Page 2 Additional Notes 2 encourages asking questions; it is process guidance, not an additional application feature. The Example image guides recognizable organization, not pixel-exact styling. The implementation retains Horse Pool, ten-lane Track, Program, Results, and top controls. Results below the track trade desktop simultaneity for wider readable tables; mobile stacks the track first and discloses the roster. The accepted typography/palette intentionally differ from the example.

## Approved additions, separate from PDF facts

| Decision IDs | Product addition/clarification | Implementation and verification | Status |
| --- | --- | --- | --- |
| D1–D4 | Exactly 20, unique colors, stable random integer conditions,10 distinct participants | Horse/schedule unit tests, state generation and browser roster/program assertions | Pass |
| D5 | Each horse participates exactly 3 times | Remaining-capacity engine; deterministic scheduling invariant tests and rendered program unit assertions | Pass |
| D6 | Ordered distances | Source constant, unit and E2E assertions | Pass |
| D7–D10 | Condition+randomness, shared profiles, acceleration/deceleration/overtaking, unique deterministic ranks | `raceSimulation.test.ts`: exact coefficients, controlled overtaking, profile sampling/finish agreement, locale-independent ties | Pass |
| D11–D13 | Automatic sequence, Pause/Resume, guarded Generate | Store tests and real-time Playwright workflow/frozen-progress observation | Pass |
| D14–D17 | Full 10 results, retained history, Generate clears, no replay | Store/component tests, browser 60 records, disabled completed Start and regeneration | Pass |
| D18 | Active duration targets 5.0/5.8/6.6/7.4/8.2/9.0s | Engine exact-last-finisher tests and real browser displayed target assertions | Pass |

Specific simulation formulas, stable IDs, tie policy, and runtime safety were approved in later work-package conversations; the historical requirements document intentionally preserves what was undecided when it was written. Displayed seconds represent normalized active profile time, not real-world race minutes or wall-clock time including pauses.

## Current verification scope

The preserved gallop adds two component assertions and two Chromium gait cases: 196 unit/integration tests and eight Chromium E2E cases. Three deterministic visual comparisons and two lightweight Firefox/WebKit smoke cases are separate projects. They avoid duplicating the complete Chromium suite or assuming macOS font baselines work on Linux. The subsequent state-aware control refinement adds one behavior-focused component case (197 total), preserving one primary button and guarded native events. Current results, candidate-image approval limits, and the blocked Ubuntu visual completion plan are recorded in [QUALITY_REVIEW.md](QUALITY_REVIEW.md).

Historical GitHub CI is now verified: [push run](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916926289) and [PR run](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916978887) passed at commit `37c43918b311a9977340591b8530793bde4c4816`, whose source tree matches the later main squash commit. These runs covered 194 unit tests and six E2E cases. The current uncommitted updates have not run remotely.

## Historical WP-005 local checks

Implementation verification uses Node 24.15.0, npm 11.12.1, Playwright 1.65.1 Chromium, and axe integration 4.14.0 (axe-core 4.14.1). Only the two direct test tools were added as development dependencies; existing runtime dependencies and engine/store/runtime source remain unchanged.

- `npm ci`: passed; manifest/lockfile installation succeeded, npm reported 0 vulnerabilities at installation time. This is registry audit output, not a comprehensive security assessment.
- `npm test`: 194 tests passed across 5 files.
- `npm run type-check` and `npm run build`: passed.
- `npx playwright install chromium`: passed on the local macOS host.
- `npm run test:e2e`: 6 tests passed. One full production-clock workflow; four separately labelled controlled-browser-clock responsive cases; one bounded performance observation.
- Axe WCAG 2 A/AA and 2.1 AA scans: no violations in Idle, Ready, Paused, Completed, 320 px reduced-motion Paused, and expanded mobile results. Keyboard Generate and roster disclosure were exercised. This is not full WCAG certification or a manual screen-reader test.
- Ready/Running/Paused/Completed screenshots at 320/390/768/1440 were inspected. No horizontal overflow, clipped controls, missing lanes, or Pause layout displacement was observed.
- `git diff --check`: passed. No staged/publication operation is authorized for WP-005.

Artifacts are regenerated under ignored `test-results/` and `playwright-report/`. The HTML report contains axe attachments; each responsive case writes four viewport/state PNGs. The rendering test writes `rendering-measurements.json`. These local artifacts are not portable source evidence unless separately retained; rerun commands to reproduce them. Random winners may differ without changing invariants.

## Reliability, performance, and evidence limits

The rendering test measures 59 frame intervals after discarding its initial partial interval, long tasks, and DOM mutations during bounded 60-frame samples. It repeats under 4x CPU slowdown. Zero roster/program/results DOM mutations during ordinary sampled frames is checked; this does not prove that every unrelated Vue component avoided all JavaScript reevaluation.

The final implementation run measured median/p95 intervals of approximately 16.7/16.7 ms in both normal and 4x CPU-throttled samples, with 0 observed long tasks and 0 roster/program/results DOM mutations in each sample. These short observations do not establish a universal 60 fps guarantee. The final six-test browser run passed in 56.8 seconds; its real-time six-round case took 45.6 seconds including interaction and axe checks.

Existing runtime tests verify duplicate-loop prevention, cancelled frame handles, removed visibility listeners, terminal disposal, and stale callbacks. Store tests cover oversized gaps, backwards clocks, hidden tabs, and disposal during observable transitions. These are deterministic resource/behavior checks, not a long-duration heap-leak study.

Performance numbers are environment-specific and are attached to the E2E run. No optimization was introduced without a confirmed defect. CPU throttling is emulation, not a physical low-end-device test.

**Unverified:** manual screen readers, physical devices, the Safari application, exhaustive text zoom, extended memory profiling, Linux visual baselines, current-uncommitted-change CI execution, and Claude Code runtime compatibility. Firefox and Playwright WebKit now have scoped local smoke coverage. Historical GitHub/Linux Chromium CI passed at the linked commit; that does not verify unpublished changes or complete cross-browser parity.
