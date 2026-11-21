# Insider Racing

A playable Vue horse-racing assessment: generate twenty horses and a balanced six-round program, then run the races sequentially with Pause/Resume and retained results. The accepted forest-green/ivory interface adapts to desktop, tablet, and narrow mobile screens.

## Assessment and product behavior

The assessment calls for unique horse colors, conditions from 1–100, ten participants in each of six rounds, visible movement, sequential results, Vue components, and Vuex/Pinia state management. Distances are 1200, 1400, 1600, 1800, 2000, and 2200 meters.

The Technical Owner additionally approved three appearances per horse, stable integer conditions, condition-plus-randomness profiles, deterministic ties, Pause/Resume, and active animation targets of 5.0–9.0 seconds. These additions are distinguished from PDF requirements in [REQUIREMENTS.md](docs/REQUIREMENTS.md) and the [traceability matrix](docs/REQUIREMENTS_TRACEABILITY.md).

## Stack and setup

Vue 3, TypeScript, Vite, Pinia, Vue SFCs, scoped CSS/CSS variables, and npm. Vitest, Playwright, and axe are development-only verification tools.

Use **Node.js 24.15.0** (the CI baseline) and npm. The complete supported Node range is declared in `package.json`; older Node versions outside that range are unsupported.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Generate creates the pool/program. One persistent racing button changes from **Start Race** to **Pause** and **Resume**, using the existing Pinia guards. It has no active action in Idle, Completed, Error, or Disposed; Generate remains available for allowed recovery. Start Race runs all six rounds, and Pause/Resume preserves active progress. Generate is disabled while Running/Paused. After completion, Generate clears results and creates a new schedule; replay is intentionally unsupported.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm test` | Deterministic engine, state, runtime, and component tests |
| `npm run type-check` | Type-check application and test configuration/E2E sources |
| `npm run build` | Type-check and build production files into `dist/` |
| `npm run preview` | Serve the existing production build locally |
| `npm run test:e2e` | Chromium workflow, axe, responsive screenshots, and bounded rendering measurements |
| `npm run test:visual` | Three deterministic Chromium screenshot comparisons (macOS baselines) |
| `npm run test:smoke` | Lightweight Firefox and WebKit lifecycle/layout smoke tests |
| `npx playwright show-report` | Open the local Playwright report after E2E |

For browser tests, install the required browsers once with `npx playwright install chromium firefox webkit`. Browser binaries are not needed to run the application.

Build before E2E: its managed web server serves `dist/` at `127.0.0.1:4173` and requires that port to be free. On a fresh Linux host, `npx playwright install --with-deps chromium` also installs required browser system libraries. Browser downloads require network access. E2E uses one worker and no automatic retries; failures retain traces/screenshots. Reports and `test-results/` are ignored by Git.

## Architecture

```text
Vue components -> Pinia Store -> Pure Race Engine
                       |
                       v
                  Runtime Driver -> browser clock / scheduling
```

- **Engine:** pure injected-randomness computation for horse generation, balanced scheduling, integrated velocity profiles, progress, and ranking.
- **Store:** authoritative state, guards, sequential round progression, and exactly-once results.
- **Runtime:** browser clock, animation scheduling, visibility handling, cancellation, and stale-callback protection. It reports elapsed time through callbacks.
- **Components:** render state and emit user intent. Local roster disclosure is presentation state; it does not own race progress.

See [frontend ADR](docs/adr/0002-frontend-architecture.md) for approved boundaries and trade-offs.

```text
src/features/racing/
  engine/       # Pure models, generation, scheduling, simulation, tests
  runtime/      # Browser scheduling port and deterministic resource tests
  state/        # Pinia lifecycle and integration tests
  components/   # Page composition, panels, scoped styles, component tests
e2e/            # Public-UI browser workflow and quality checks
docs/           # Requirements, traceability, AI workflow, ADRs
.github/workflows/ # Automated quality gate
```

## Engineering decisions and verification

Balanced remaining-capacity scheduling satisfies all sixty slots without retries. Precomputed integrated velocity profiles drive both movement and finishing times. One common time scale makes the last finisher reach the approved round target; displayed seconds are active simulation/animation elapsed time, not real-world race minutes. Condition gives an advantage without guaranteeing victory.

The runtime auto-pauses on a hidden tab or a frame gap over one second; Resume is explicit. Component disposal releases runtime resources. Unit tests verify cleanup, stale callbacks, boundary races, and invalid inputs. Browser tests exercise the actual production build: one full real-time race sequence plus separately labelled controlled-browser-clock responsive cases. Axe checks complement keyboard and screenshot inspection; they do not certify complete accessibility.

The CI workflow runs installation, unit tests, type checking, build, Chromium installation, and E2E/axe checks on pushes/PRs. Both [push](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916926289) and [PR](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916978887) Quality runs passed for commit `37c43918b311a9977340591b8530793bde4c4816` (the same source tree later squash-merged as `a1cb6de`). Those runs verified the then-committed 194 unit and six E2E tests, not the newer local gallop/refinement changes.

`test:e2e` explicitly selects Chromium. Cross-browser smoke tests and screenshot comparisons are separate commands; they are not silently added to Linux CI. The three generated candidate screenshot baselines use the accepted design foundation, deterministic randomness/time, device scale factor 1, loaded system fonts, and frozen decorative gait. The new gallop artwork and individual images await Technical Owner visual acceptance for this package; generation is not human approval. They are macOS-specific because font rasterization differs across operating systems. Ubuntu visual execution is currently blocked: this macOS environment has no Linux/container runtime, and no reviewed Linux goldens exist. The existing Ubuntu workflow still runs the explicitly selected Chromium suite; it does not claim to execute visual comparisons. See the pinned-container completion plan in [QUALITY_REVIEW.md](docs/QUALITY_REVIEW.md). Ordinary visual runs set `updateSnapshots: none`, so missing or changed references fail instead of being accepted automatically. Review intentional differences with the Technical Owner before updating baselines; do not update snapshots to bypass a failure.

The current local verification, measurements, and simplicity decisions are in [QUALITY_REVIEW.md](docs/QUALITY_REVIEW.md); assessment mapping remains in the [traceability matrix](docs/REQUIREMENTS_TRACEABILITY.md).

On mobile, the footer’s **Back to race controls** link scrolls and focuses the existing controls without covering the track with a sticky toolbar. Generate stays separate from the state-aware racing button. The same native button remains mounted as Start Race/Pause/Resume changes, preserving keyboard focus; repeated Enter and native multi-clicks do not dispatch repeated activations.

## Known limitations

- No backend, persistence, betting, championship scoring, multiplayer, replay, or playback-speed controls.
- Physical devices, the Safari application, manual screen readers, and exhaustive text-zoom/contrast testing remain unverified. Firefox and Playwright WebKit have smoke coverage, not full Chromium-suite parity.
- Three macOS Chromium screenshots now have automatic pixel comparisons; Linux screenshot baselines remain unverified. Other state screenshots remain inspection artifacts.
- Short frame/CPU-throttle samples are environment-specific observations, not performance guarantees or proof of no memory leaks.
- The still-used static horse artwork is approximately 424 kB after lossless recompression; decoded RGBA pixels are unchanged. The shared original eight-frame gallop atlas is approximately 8 kB, with CSS-controlled decorative motion and unchanged engine-owned progress.
- The original assessment PDF is intentionally excluded from Git; source references require the privately supplied document.

AI-assisted development and human approval responsibilities are documented in [AI_WORKFLOW.md](docs/AI_WORKFLOW.md). Technical Owner acceptance remains the delivery gate.
