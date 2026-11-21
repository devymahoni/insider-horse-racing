# ADR 0002: Frontend Architecture

## 1. Context

The Insider One Horse Racing Case Study needs a maintainable, testable Vue frontend for a single cohesive racing feature. The [requirements baseline](../REQUIREMENTS.md) includes a balanced six-round schedule, precomputed performance profiles, sequential execution, Pause/Resume, and animation consistent with finishing order.

The application should apply transferable engineering principles—explicit ownership, Unidirectional Data Flow (UDF), deterministic computation, and lifecycle safety—without importing unnecessary enterprise layers into a small frontend.

This decision follows [AGENTS.md](../../AGENTS.md), the [Architecture Agent definition](../../.agents/architecture.md), and [ADR 0001](0001-engineering-orchestrator.md). ADR 0001 governs engineering coordination; this ADR governs application organization. Product requirements remain unchanged.

## 2. Decision

Adopt **Alternative A: Feature-based Architecture** with four responsibility boundaries: a pure Race Engine, a Pinia Store, a Runtime Driver, and Vue Components.

Organize the racing feature cohesively, preserving dependency isolation inside it. Favor explicit contracts and minimal necessary abstractions. Do not introduce unnecessary repositories, use-case classes, routing, a backend, or UI frameworks.

The approved boundaries and technology choices below are decisions. Exact files, APIs, algorithms, formulas, and contracts listed as open are not implicitly approved by this ADR.

## 3. Architecture boundaries

### Pure Race Engine

- Own horse generation, balanced race scheduling, performance profile generation, progress sampling, and result ranking.
- Perform pure, deterministic computation with randomness supplied explicitly as an input or injected dependency.
- Produce consistent outputs for the same inputs and random sequence.
- Have no Vue, Pinia, DOM, browser timer dependencies, or hidden side effects.
- Use the approved product invariants; do not independently invent simulation mechanics or scoring rules.

### Pinia Store

- Own the single authoritative game state, including schedule, active round, progress, and published results.
- Apply explicit transitions and guards through designated actions.
- Coordinate sequential race execution using the engine and runtime boundaries.
- Derive values when practical; do not duplicate authoritative state in components, the engine, or another controller.
- Keep business computation in the engine and browser scheduling in the runtime.

### Runtime Driver

- Own browser clock access and animation scheduling.
- Handle Pause/Resume timing, cancellation, lifecycle cleanup, and stale callback protection.
- Report elapsed time through an explicit callback or equivalent contract handled by a store action; do not mutate store state directly.
- Keep execution resources separate from authoritative game progress.
- Do not determine winners independently of engine-generated profiles.

### Vue Components

- Render state and express user intents through explicit events or handlers.
- Own presentation concerns rather than business rules or independent race orchestration.
- Do not mutate authoritative game state through hidden paths or determine results from DOM animation events.

## 4. Dependency direction and data flow

Conceptual dependency direction:

```text
Vue Components → Pinia Store → Pure Race Engine
                       │
                       ▼
                 Runtime Driver → Browser clock / scheduling
```

The engine does not depend on the store, runtime, or presentation. The runtime reports elapsed time through a supplied contract rather than importing and directly mutating the store. Exact wiring and interface signatures remain implementation details to define within these boundaries.

UDF for a user action:

```text
User intent → Store action / guard → State transition → Rendered UI
```

Race progression:

```text
Runtime elapsed-time report → Store action
  → Pure profile sampling / completion evaluation
  → Authoritative progress and result transition
  → Vue rendering
```

Precomputed profiles drive both animation and finishing order. The store owns sequential advancement and result publication; components do not start the next round. Pause/Resume and cancellation are coordinated across the state and runtime boundaries without creating a second source of truth.

## 5. Technology choices

| Approved technology | Intended role |
| --- | --- |
| Vue 3 | Reactive frontend and component composition. |
| TypeScript | Explicit types and contracts across boundaries. |
| Vite | Development and build tooling. |
| Pinia | Single authoritative game-state owner and actions. |
| Vue Single File Components | Component organization. |
| Scoped CSS and CSS variables | Component styling and shared styling values. |
| npm | Package management and project commands. |

Exact package versions other than Vue's approved major version, runtime compatibility, setup commands, and test tooling are not selected here. Approval of this stack does not authorize installing it in this documentation task or adding unrelated dependencies.

## 6. Alternatives considered

**A. Feature-based architecture — accepted.** Keep engine, state, runtime, and presentation responsibilities within a cohesive racing feature. Preserve clear boundaries without imposing application-wide layer roots.

**B. Layered architecture — not selected.** Organize domain, application/state, presentation, and browser infrastructure separately. This provides prominent dependency rules and may suit multiple consumers, but spreads this single feature across more roots and can encourage unnecessary ports, wrappers, and mappings.

Both can support pure computation, UDF, and strong tests. The decision concerns proportionate organization, not a rejection of separation of concerns.

## 7. Trade-offs

- Feature cohesion simplifies navigation and small changes while retaining an independently testable engine.
- Explicit runtime isolation enables controlled-time verification and lifecycle safety without requiring a general infrastructure framework.
- A single store makes ownership clear but requires discipline to prevent it becoming a container for simulation and rendering logic.
- Internal boundaries depend on review and verification; feature-based directories alone do not enforce them.
- Additional layers may become justified by future requirements, but adding them speculatively increases present maintenance cost.

## 8. Consequences and risks

- Engine behavior can be verified independently of Vue and browser scheduling once its unresolved mechanics are approved.
- Store/runtime integration must verify sequential execution, preserved pause progress, cancellation, stale callbacks, and exactly-once result publication.
- Components must not introduce competing progress state or independent frame-driven race decisions.
- Animation and ranking can diverge if implementations stop using the same profiles; integration and browser verification must cover their agreement.
- Reactive rendering cost and timing behavior require measurement in an implementation; no performance result is claimed here.
- Human approval remains required for architectural departures, new dependencies, scope expansion, and restricted Git operations. Final acceptance remains with the Technical Owner.
- Architecture approval is not an implementation work package. This ADR creates no application, runtime driver, store, tests, or installed dependencies.

## 9. Open technical decisions

The following remain unresolved and must be settled before dependent implementation where applicable:

1. Performance formula and condition/randomness influence; profile representation and deterministic tie-breaker.
2. Balanced scheduling algorithm and its randomness properties.
3. Horse pool regeneration lifecycle and profile precomputation timing.
4. Detailed domain/UI models, public contracts, component breakdown, exact directory structure, and runtime wiring.
5. Clock semantics, animation duration tolerance, background-tab behavior, inter-round timing, and pause-at-completion behavior.
6. Concrete cancellation/session identity mechanism, disposal ownership, and error recovery behavior within the approved safety boundaries.
7. Rendering technique, responsive layout, accessibility, reduced motion, and required visual fidelity.
8. Exact package versions, compatible execution environment, test tools/dependencies, and the authorized setup and implementation scope.

The requirements document's previously open architecture and stack choices are resolved by this ADR to the extent explicitly stated above. Its other open product and technical questions remain open; no existing document is modified by this record.

## 10. Approval status

**Accepted — explicitly approved by the Technical Owner.**

Approval source: the Technical Owner's explicit instruction to record Alternative A, the four responsibility boundaries, architecture principles, and the specified technology stack in this ADR.

This AI-assisted record documents an approved decision. It does not claim that the architecture has been implemented, tested, benchmarked, or accepted as a completed application. Subsequent implementation and validation require a separately authorized work package under ADR 0001.
