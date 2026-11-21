# Maintainability and Quality Review

## Scope and evidence

This AI-assisted refinement is based on `a1cb6de782181bf8b82e6dd8187630f4b06f99be` plus the preserved local gallop implementation. It addresses the priorities in the Technical Owner's supplied request. A separate external assessment report was not supplied, so this document does not invent its wording, severity, or reviewer attribution. Final Technical Owner acceptance remains pending.

The dedicated application branch preserves existing work. The original dirty checkout, other worktrees, engineering policies, approved architecture, simulation formula, scheduling, state machine, and runtime remain unchanged.

## Findings and decisions

| Area | Current status and decision |
| --- | --- |
| Static-looking horse movement | Already addressed by the preserved original eight-frame SVG/CSS gallop and lifecycle tests. Existing static PNG still serves branding/Idle. |
| State-aware controls | The subsequent explicit UI approval consolidates Start/Pause/Resume into one persistent guarded native button; Generate remains separate. No racing state or store action changed. |
| Dense Vue source | Templates, prop contracts, and scoped CSS expanded; round status and empty-state messages have named presentation derivations. No extra application layer or component added. |
| Screenshot inspection only | Three deterministic automatic screenshot comparisons added: desktop Ready, desktop Completed, mobile Paused. |
| Missing cross-browser evidence | Lightweight Firefox/WebKit smoke project added without repeating the full Chromium suite. |
| Starter code | `src/stores/counter.ts` had no consumers and was removed. Used assets/configuration retained. |
| Mobile controls after scrolling | A footer link scrolls and focuses the original controls, with an 8px scroll margin for the focus outline. No sticky content obstruction. |
| Large static asset | Retained because it is used; losslessly recompressed with unchanged decoded pixels. |
| Positioning/validation optimization | Measured; neither justified a production rewrite. Details below. |
| Stale CI/documentation claims | Historical remote success is now linked separately from unpublished local work. |

## Verification approach

- `npm run test:e2e` explicitly selects Chromium: the existing public-UI lifecycle, responsive, accessibility, performance, and gallop cases.
- `npm run test:smoke` selects only Firefox and WebKit. One scenario per browser covers generation, ten participants per round, Start/Pause/Resume, frozen/resumed progress, start/finish alignment at 320/390/1440px, and returning to controls from the mobile footer. Completion uses a controlled browser clock to keep smoke execution small; it is not an additional real-time-duration claim.
- `npm run test:visual` compares three macOS Chromium goldens. Randomness, race time, device scale factor, font readiness, viewport and decorative gait are stabilized. There are no masks. The earlier maintainability pass matched desktop goldens after formatting, with only the mobile footer link changed. This separately approved control consolidation intentionally changes all three candidate goldens; their prior versions are preserved outside the repository for comparison. All three generated images and the preserved new gallop artwork remain subject to Technical Owner visual acceptance; no individual image approval is claimed.
- Existing unit/integration tests retain behavior assertions. Formatting exposed raw-whitespace coupling in two in-memory button lookups; the shared lookup now trims edge whitespace, matching browser button-name semantics. Test counts were not increased for formatting.

Visual baselines are platform-specific because the design uses system fonts. No Linux golden is claimed. Update a baseline only after inspecting and authorizing its intended visual difference. Cross-browser smoke and macOS visual projects remain separate from existing Linux CI to avoid additional browser installation cost and platform-mismatched goldens. The initial two-engine smoke execution took about 21 seconds including startup; browser downloads were approximately 108MB Firefox and 82MB WebKit. Future CI expansion should use an explicit cost/coverage decision.

## Measured animation decision

A temporary Playwright/CDP experiment compared the current `left` plus own-width transform against an injected CSS candidate: an inline-size runway container and `translateX(calc(progress * (100cqw - 100%)))` with `left: 0`. Each variant used the same seed (7841), viewport (1440x900), ten racing horses, and 119 actual frame intervals. The scenario was repeated at normal and 4x CPU slowdown. This was a bounded candidate evaluation, not an exhaustive benchmark or claim about every compositor technique.

| CPU | Variant | Layout count | Layout time | Frame p95 |
| --- | --- | ---: | ---: | ---: |
| Normal | Existing positioning | 122 | 35.7ms | 16.7ms |
| Normal | Container-transform candidate | 129 | 46.7ms | 16.7ms |
| 4x slowdown | Existing positioning | 121 | 163.7ms | 16.8ms |
| 4x slowdown | Container-transform candidate | 122 | 181.6ms | 16.8ms |

The candidate showed no frame benefit and more measured layout work. It was not adopted. Existing positioning remains straightforward, with tested start/finish alignment in all three browser engines. The SVG gait still uses CSS steps, stable animation identity, and play-state for Pause/Resume; no new JavaScript frame loop exists. These observations do not establish a universal frame-rate guarantee.

Reproduction evidence was collected outside the repository in `/private/tmp/maintainability-animation-measurements.json` using `/private/tmp/maintainability-measure.mjs`. Temporary paths are local artifacts, not portable dependencies or committed proof; the scenario and results are recorded here for review.

## Profile validation trade-off

The current public `sampleRoundProgress()` validates the entire ten-horse profile. Creation also validates generated profiles. Five Node 24 samples of 100,000 calls, after 10,000 warm-up samples on the same seeded profile, measured:

- `validateProfile`: approximately 0.00074–0.00140ms per call.
- Public sampling including validation: approximately 0.00138–0.00221ms per call.

That cost is a small fraction of a 16.7ms frame budget on this host. Retain defensive validation and unchanged public APIs. Creation-only validation would not defend against later mutation by JavaScript callers; TypeScript `readonly` is not runtime immutability. A trusted internal sampler would require a genuinely controlled immutable ownership boundary and additional maintenance/testing. The measured cost does not justify that complexity here.

The benchmark used existing Vite SSR loading of the actual engine; the sandbox rejected an unused development WebSocket listener, but module loading, all measurements, and cleanup completed. Raw measurements are `/private/tmp/maintainability-profile-measurements.json`; no benchmark-specific application API or production cache was added.

## Asset evidence

The static PNG remains imported by RacingPage and RaceTrack for branding and Idle. Existing ffmpeg recompression reduced it from **523,624 to 424,037 bytes** (99,587 bytes, approximately 19%). Both originals and optimized files decode to the same RGBA SHA-256:

`7150a165c6b40964e950540d5dc11e3d0ef7c53736078cb036c910e8fd9fd2bb`

Decoded hash command: `ffmpeg -v error -i FILE.png -f hash -hash sha256 -pix_fmt rgba -`. The pre-refactor desktop visual comparisons also match. No image content was redrawn, no new encoder dependency installed, and the existing path is retained. The approximately 8KB original gallop atlas is preserved.

## Simplicity assessment

Keep the four responsibility boundaries: they make deterministic simulation, lifecycle ownership, and browser cleanup explicit. Components correspond to visible panels plus the independently paused sprite. No repository/use-case/controller layers are needed.

The small custom Vue host renderer provides fast store/component interactions without another DOM dependency. Its host operations and button queries were made readable. Real browser coverage handles layout and native interactions it cannot establish. Replacing it with another testing dependency, or consolidating store/runtime ownership, would require a separate architectural/dependency decision and currently offers no demonstrated regression-risk benefit.

Agent definitions are development governance, not application runtime architecture. They were inspected and left unchanged; deleting safety boundaries would not simplify the delivered browser code.

## Earlier maintainability implementation gates

- `npm ci`: passed, using the unchanged lockfile.
- `npm test`: 196 tests passed across five files; no count inflation.
- `npm run type-check` and `npm run build`: passed.
- `npm run test:e2e`: eight Chromium cases passed, including six-round actual-time execution (45.3 seconds), gallop lifecycle, responsive checks, and six zero-violation axe states.
- `npm run test:visual`: three comparisons passed after refactoring; only the intentional mobile return link required a candidate golden update.
- `npm run test:smoke`: Firefox 159.0 and Playwright WebKit 27.2 passed both smoke scenarios, including the footer focus/scroll checks, in 11.9 seconds on the final run.
- `git diff --check`: passed; no staging or publication performed.

Initial WebKit smoke testing exposed fractional target scrolling at -0.109px after the footer link. An 8px scroll margin now keeps the full focus outline inside the viewport; the strict viewport assertion was retained. These are implementation self-checks, not independent QA or human acceptance.

## Evidence limits

Historical GitHub runs passed at `37c43918b311a9977340591b8530793bde4c4816`; current local changes have not been pushed or executed remotely. Firefox and Playwright WebKit smoke checks do not establish full browser parity or testing of the Safari application. Physical devices, manual screen readers, exhaustive zoom/contrast evaluation, Linux screenshot baselines, and extended heap/GPU studies remain unverified. Independent QA and Review of this package are subsequent stages, not outcomes asserted by this implementation document.


## State-aware control and Ubuntu visual refinement

The latest explicit approval adds one persistent native racing button. Ready enables **Start Race**, Running enables **Pause**, and Paused enables **Resume**, each using the existing can-action flag and original emitted intent. Idle has a disabled Start Race button; Completed shows disabled Race complete; Error/Disposed show disabled Race unavailable. Generate remains separate and uses the existing recovery/disposal guard. No racing state, engine, runtime, simulation, or result computation is duplicated. Native double-click follow-up events and held-Enter repeats are ignored; fresh keyboard activations keep normal button semantics.

Three existing macOS candidates are deliberately recaptured for this authorized control-layout change after preserving their previous versions at `/private/tmp/controls-visual-before`. This is candidate generation, not human image approval. The final accepted reference must be reviewed by the Technical Owner. No masks or relaxed pixel thresholds are used. Locale, UTC timezone, light color scheme, viewport, device scale, random stream, race clock, loaded fonts, and frozen decorative gait are explicit. `updateSnapshots: 'none'` prevents ordinary local/CI runs from creating or updating expected images.

**Ubuntu visual verification is blocked, not passed.** Read-only discovery found no Docker, Colima, Podman, Lima, OrbStack, Multipass, nerdctl, or QEMU executable/container application on this macOS host. No system tooling was installed and no remote workflow or repository setting was changed. Darwin references must not be reused as Ubuntu goldens. The existing Ubuntu job remains explicitly scoped to Chromium functional/axe tests; there is no skipped or falsely green visual job.

Completion plan once an approved Linux environment is available:

1. Validate the official `mcr.microsoft.com/playwright:v1.65.1-noble` image (matching the locked Playwright version), supported Node version, and image digest. This proposed environment has not been executed here.
2. Generate Linux candidate references in that exact image, with the existing three scenarios and deterministic configuration. For example, after checking Node compatibility:

   ```sh
   docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work \
     mcr.microsoft.com/playwright:v1.65.1-noble \
     bash -lc 'node --version && npm ci && npm run build && npm run test:visual -- --update-snapshots'
   ```

   The separate node_modules volume prevents replacing host dependencies. Generation is an explicit review operation, never an ordinary CI step.
3. Inspect the three Linux candidates and their intended control changes with the Technical Owner. Preserve macOS references separately; never copy/rename them to masquerade as Linux rendering.
4. Rerun `npm run test:visual` without update flags in the same image and require all three comparisons to pass.
5. Only then add the visual command to an Ubuntu job using the validated pinned image/digest and upload failure artifacts. It must fail on missing/changed references and never regenerate them in CI.

This preserves useful current local screenshot assertions while clearly identifying the missing Ubuntu evidence and the exact remaining gate.


### Latest refinement implementation verification

Executed against the state-aware controls and deliberately refreshed macOS candidates:

- `npm test`: **197 passed** across five files, including the new phase/guard/persistent-element case.
- `npm run type-check` and `npm run build`: passed.
- `npm run test:e2e`: **8 passed in 58.0 seconds**; actual-time six-round case **44.7 seconds**; six axe state scans reported zero violations. Keyboard Enter/Space, held-Enter suppression, native double-click suppression, persistent element identity, and focused Start Race/Pause/Resume were checked.
- Initial ordinary visual comparisons correctly failed against the old layout (8,876 / 8,067 / 7,212 changed pixels for Ready / Completed / Paused). All three diffs were inspected and confined to the authorized control row; references and diff evidence were preserved outside the repository.
- A deliberate candidate refresh was followed by ordinary `npm run test:visual` with updates disabled: **3 passed in 3.6 seconds**. The images remain candidates awaiting Technical Owner acceptance.
- `npm run test:smoke`: **Firefox/WebKit 2 passed in 10.0 seconds**, including native keyboard focus and element identity through Start Race/Pause/Resume at mobile size.
- `git diff --check`: passed. Engine, store, runtime, both horse assets, gait component, dependency manifest/lockfile, and CI workflow hashes match the state before this refinement.
- **Ubuntu visual execution: blocked/unverified**, for the environment and reference prerequisites above. No Linux result, CI execution, or human approval is claimed.

Current implementation artifacts are retained under `/private/tmp/controls-visual-evidence/`; old references are `/private/tmp/controls-visual-before/`. These are local evidence paths, not portable source dependencies. Independent QA and Review must report their own verification of this refinement.
