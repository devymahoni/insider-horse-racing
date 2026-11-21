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
npx playwright install chromium
npm run dev
```

Open the URL printed by Vite. Generate creates the pool/program; Start runs all six rounds. Pause/Resume preserves active progress. Generate is disabled while Running/Paused. After completion, Generate clears results and creates a new schedule; replay is intentionally unsupported.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm test` | Deterministic engine, state, runtime, and component tests |
| `npm run type-check` | Type-check application and test configuration/E2E sources |
| `npm run build` | Type-check and build production files into `dist/` |
| `npm run preview` | Serve the existing production build locally |
| `npm run test:e2e` | Chromium workflow, axe, responsive screenshots, and bounded rendering measurements |
| `npx playwright show-report` | Open the local Playwright report after E2E |

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

The CI workflow runs installation, unit tests, type checking, build, Chromium installation, and E2E/axe checks on pushes/PRs. Its execution in GitHub remains unverified until this work is published. Current local evidence and limitations are recorded in the [traceability matrix](docs/REQUIREMENTS_TRACEABILITY.md).

## Known limitations

- No backend, persistence, betting, championship scoring, multiplayer, replay, or playback-speed controls.
- Physical devices, Safari/Firefox, manual screen readers, and exhaustive text-zoom/contrast testing are not verified.
- Visual screenshots are inspected artifacts, not approved pixel-regression baselines.
- Short frame/CPU-throttle samples are environment-specific observations, not performance guarantees or proof of no memory leaks.
- Horse artwork is approximately 524 kB; no speculative optimization or new rendering layer was introduced.
- The original assessment PDF is intentionally excluded from Git; source references require the privately supplied document.

AI-assisted development and human approval responsibilities are documented in [AI_WORKFLOW.md](docs/AI_WORKFLOW.md). Technical Owner acceptance remains the delivery gate.
