# Insider One Horse Racing Requirements

## Status and sources

This AI-assisted requirements baseline separates assessment facts from explicitly approved Technical Owner decisions. Product approval does not select the final architecture, authorize dependencies, or authorize implementation or Git operations.

Source: [original assessment PDF](<../Insider One Case Study - Front-end Developer.pdf>), pages 1–2. References below use the PDF's printed page numbers, headings, and numbered items. Approval source for the product decisions is the Technical Owner's explicit instruction to create this document with the 18 decisions below.

## Explicit assessment requirements

| ID | Source requirement, summarized | PDF reference |
| --- | --- | --- |
| S1 | Build an interactive horse racing game. | P1, introduction |
| S2 | VueJs is permitted. | P1, Requirements 1 |
| S3 | Randomly generate a horse list containing 1–20 horses. | P1, Requirements 2 |
| S4 | Generate creates a schedule of six rounds. | P1, Requirements 3 |
| S5 | Start begins racing, one round at a time. | P1, Requirements 4 |
| S6 | Show results sequentially in the Results field as each race concludes. | P1, Requirements 5 |
| S7 | Horses visibly move during each race. | P1, Requirements 6 |
| S8 | Code should be clean and maintainable as for a large-scale project. | P1, Requirements 7 |
| S9 | The available racing pool totals 20 horses. | P1, Rules and Conditions 1 |
| S10 | Every horse has a unique color. | P1, Rules and Conditions 2 |
| S11 | Each condition score ranges from 1 to 100. | P1, Rules and Conditions 3 |
| S12 | Six rounds; each selects ten random horses from the available twenty. | P1, Rules and Conditions 4–5 |
| S13 | Distances in order: 1200, 1400, 1600, 1800, 2000, 2200 meters. | P1, Rules and Conditions 6 |
| S14 | Use Vuex or Pinia to manage game data. | P2, Technical Expectations 1 |
| S15 | Organize the code with Vue components. | P2, Technical Expectations 2 |
| S16 | Demonstrate clear, organized, adaptable component structure and state management. | P2, Additional Notes 1 |
| S17 | Unit, E2E, and visual tests are bonuses. | P2, Bonus 1–3 |

### Source conflicts and limits

S3's variable horse count conflicts with S9's fixed pool. The approved interpretation below makes exactly 20 horses authoritative; it does not claim the PDF is internally unambiguous.

P1 permits Vue, while P2 explicitly expects Vue components and Vuex/Pinia. Both statements are preserved here; the technical baseline includes the P2 expectations, with final technology/version choices still requiring approval.

The PDF does not specify balanced participation, integer or stable conditions, performance formulas, simulation profiles, tie-breaking, pause semantics, replay policy, or animation durations. Those behaviors below are Technical Owner decisions, not explicit assessment requirements. P2 includes an Example image; exact visual fidelity is not established by the source prose or these approvals.

## Approved product decisions

| ID | Approved decision | Relationship to assessment |
| --- | --- | --- |
| D1 | Exactly 20 horses in the available pool. | Resolves S3/S9 conflict in favor of the fixed pool. |
| D2 | Every horse has a unique color. | Confirms S10. |
| D3 | Each condition is a randomly generated integer from 1 to 100 and remains stable across all six rounds. | Extends S11 with generation, type, and stability rules. |
| D4 | Each round contains ten distinct horses selected from the pool. | Clarifies within-round uniqueness in S12. |
| D5 | Preserve randomness while balancing participation: every horse races exactly three times across six rounds. | Additional product requirement. |
| D6 | Six rounds use 1200, 1400, 1600, 1800, 2000, and 2200 meters, in order. | Confirms S13. |
| D7 | Performance uses condition plus randomness. | Additional product requirement; no formula approved. |
| D8 | Precomputed race simulation profiles drive both animation and finishing order. | Additional product requirement; profile representation remains undecided. |
| D9 | Horses may accelerate, decelerate, and overtake each other. | Additional capability; not a guarantee of every event in every race. |
| D10 | Finishing positions are uniquely ranked 1–10 using a deterministic tie-breaker. | Additional product requirement; tie-break policy remains undecided. |
| D11 | One Start runs all six rounds automatically and sequentially. | Clarifies S5. |
| D12 | Pause and Resume preserve race progress. | Additional product requirement. |
| D13 | Generate is disabled while Running or Paused. | Additional product requirement. |
| D14 | Each completed round publishes the full finishing order of ten horses. | Clarifies result completeness in S6. |
| D15 | Earlier round results remain visible until a new schedule is generated. | Additional product requirement. |
| D16 | Generate clears previous results and creates a new schedule. | Extends S4 with result-reset behavior. |
| D17 | Replay is unsupported; completion requires generating a new schedule before racing again. | Additional product requirement. |
| D18 | Animation targets are defined by round distance in the table below. | Additional product requirement. |

### Animation duration targets

| Round | Distance (meters) | Target active animation duration (seconds) |
| --- | --- | --- |
| 1 | 1200 | 5.0 |
| 2 | 1400 | 5.8 |
| 3 | 1600 | 6.6 |
| 4 | 1800 | 7.4 |
| 5 | 2000 | 8.2 |
| 6 | 2200 | 9.0 |

These are targets, not an approved timing tolerance or performance formula. Paused time must not consume preserved race progress; exact timing measurement and tolerance remain to be agreed.

## Functional acceptance criteria

| ID | Observable acceptance criterion | Basis | Verification approach |
| --- | --- | --- | --- |
| A1 | A race-ready pool has 20 identifiable horses, 20 unique colors, and integer conditions in the inclusive range 1–100. | D1–D3 | Unit/integration invariants. |
| A2 | Generation produces six rounds at the exact ordered distances, each containing ten distinct pool members. | D4, D6 | Schedule unit tests. |
| A3 | Across all 60 participant slots, each of the 20 horses appears exactly three times; generation retains randomized choices. | D5 | Count invariants and controlled-randomness scenarios. |
| A4 | A horse's condition does not change between its appearances in the six-round schedule. | D3 | State/simulation tests. |
| A5 | Simulation uses both condition and randomness; profiles exist before their race is animated and govern visible progress and final order consistently. | D7–D8 | Simulation tests with controlled inputs and browser integration checks after mechanics approval. |
| A6 | Supported profiles can represent acceleration, deceleration, and overtaking. No test requires all three to occur in every random race. | D9 | Controlled-profile tests and visual inspection. |
| A7 | Every completed round has exactly ten finishers ranked 1–10 with no duplicate rank or horse; identical tie inputs resolve consistently. | D10, D14 | Result and tie-break tests after policy approval. |
| A8 | One Start progresses through all six rounds in order with at most one round running at a time. | D11 | Controlled-time integration/E2E tests. |
| A9 | Pause preserves progress; no racing progress advances while paused, and Resume continues that race without resetting it. | D12 | Controlled-time state and browser tests. |
| A10 | Generate is disabled during Running and Paused and cannot replace the active schedule or clear results in those states. | D13 | UI and intent-handler integration tests. |
| A11 | Each round publishes its full result when completed, in round order, while retaining earlier results. | S6, D14–D15 | Integration/E2E tests. |
| A12 | An allowed Generate creates a fresh schedule and clears prior results. A completed schedule cannot be replayed. | D16–D17 | Lifecycle integration tests. |
| A13 | Each round visibly animates horses and targets its listed duration, with animation and result order derived from the same profile. | S7, D8, D18 | Browser checks and timing tests after tolerance approval. |
| A14 | Vue components organize presentation and an approved Vuex/Pinia choice manages game data; organization is clear and maintainable. | S8, S14–S16 | Architecture/code review; applicable integration tests. |

Randomness does not require every generated schedule to differ, every horse to win sometimes, uniform sampling over every valid schedule, or a particular random distribution. Those guarantees have not been approved. Conditions may repeat across different horses; only colors are required to be unique.

## State-related behavior

The labels below describe product behavior, not a selected state-management architecture or public API.

| Situation/state | Required behavior |
| --- | --- |
| Before a schedule exists | Generate can establish a schedule. Start must not launch an absent schedule; its UI feedback remains undecided. |
| Ready with a schedule | Start begins round one. Generate may replace the schedule and clear any prior results. |
| Running | Exactly one round progresses. Pause preserves its progress. Generate is disabled. Completed rounds publish results and progression is automatic. |
| Paused | Progress is preserved without advancing; Resume continues it. Generate remains disabled. |
| Final round completed | All six results remain visible. Start cannot replay the completed schedule. Generate is required for another run. |
| New schedule generated | Prior results are cleared and the new schedule is ready for a new Start. |

Repeated Start or Resume must not create overlapping execution, duplicate rounds, or duplicate results. Precise control labels, inter-round delays, initial horse-generation timing, and whether generating a new schedule also regenerates the horse pool are not decided here.

## Important edge cases

- Balanced random selection must satisfy both distinctness per round and three appearances per horse; independently sampling ten horses six times is not sufficient to guarantee balance.
- Random generation may produce identical condition scores or repeat a previous valid schedule; neither is inherently a defect.
- Tied finish information must resolve deterministically while preserving unique positions and animation/result agreement.
- Pause immediately before a finish or between rounds must not lose progress, skip a round, publish twice, or start overlapping rounds. Exact boundary interaction policy needs design clarification.
- Repeated or stale control actions must preserve disabled-state and sequential-execution guarantees.
- Background tabs, rendering delays, interruption, and component disposal must not result in stale updates, leaked timers, duplicate completion, or corrupted results. Recovery behavior and timing tolerance need technical approval.
- Colors must be unique; perceptual distinction, contrast, non-color identification, keyboard operation, and reduced-motion behavior need proportionate accessibility criteria under project engineering rules.
- Failed or interrupted generation must not present a partial schedule as race-ready. Detailed failure feedback and recovery are remaining design decisions.

## Testable invariants

1. Pool size is 20; all assigned colors are unique.
2. Conditions are integers within 1–100 and stable throughout the schedule.
3. There are six rounds, with ordered distances `[1200, 1400, 1600, 1800, 2000, 2200]`.
4. Each round has ten distinct participants from the same available pool.
5. There are 60 participant slots and every horse occupies exactly three.
6. At most one round runs; completed rounds and results form an ordered prefix of the six-round schedule.
7. A completed result contains exactly that round's ten participants, ranked uniquely 1–10.
8. Animation and finishing order agree with the same precomputed profile; tie resolution is deterministic under the approved policy.
9. Pausing preserves progress; resuming does not restart or duplicate the race.
10. Generate cannot change a Running or Paused schedule; successful allowed generation clears old results.
11. Completion retains all results and prevents replay until a new schedule exists.

Use controlled randomness and time in tests where authorized. Do not equate a passing sample with proof of statistical fairness, animation quality, or complete coverage. The assessment's bonus classification for tests does not waive [AGENTS.md](../AGENTS.md) verification requirements.

## Explicit non-goals

- Replay of a completed schedule is explicitly unsupported.
- No aggregate championship scoring, betting, odds, wagering, or additional rounds are defined.
- Backend services, accounts, networking, durable game persistence, and multiplayer are outside the approved product scope.
- Uniform random distributions, guaranteed winners, and equal winning chances are not promised.
- Pixel-exact reproduction of the PDF example is not established as an acceptance requirement.
- This document does not approve a simulation formula, algorithm, component architecture, state library choice, dependency, or implementation work package.

Non-goals other than replay identify features absent from this baseline; they are not claims that the assessment explicitly forbids those features. Scope additions require Technical Owner approval.

## Remaining technical decisions

Before dependent implementation, propose and obtain approval where applicable for:

1. Performance formula, randomness policy, precomputed profile representation and generation timing, and how condition influences performance without inventing an unsupported guarantee.
2. Deterministic tie-breaker and its consistency with profile-driven animation and results.
3. Balanced-random scheduling algorithm and its verifiable randomness properties.
4. Vue/version and Vuex versus Pinia selection, dependencies, component boundaries, state ownership, and side-effect ownership.
5. Pool generation/regeneration lifecycle, naming/identification, initial display, exact control behavior, and inter-round boundary/pause semantics.
6. Duration measurement, allowable tolerance, background-tab behavior, interruption, cleanup, and failure feedback/recovery.
7. Required visual fidelity, accessibility, responsive layouts, and reduced-motion acceptance criteria.
8. Authorized test tools, scenarios, artifacts, and work-package boundaries using established project rules.

The approved product baseline constrains these proposals but does not resolve them. No implementation, runtime verification, or architecture selection is claimed by this document.
