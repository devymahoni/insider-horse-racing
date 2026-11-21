# AI-Assisted Engineering Workflow

## Purpose and ownership

AI assistance was used to break the assessment into small, verifiable work packages and provide distinct planning, implementation, QA, and review contexts. The Technical Owner supplied product decisions, selected the architecture, accepted completed work, and authorized Git operations. AI recommendations and passing tests never constitute human approval.

The approved coordinator is the main session, not a separate Orchestrator subagent or external workflow runner. Shared policies are [AGENTS.md](../AGENTS.md), [ADR 0001](adr/0001-engineering-orchestrator.md), and [the orchestration protocol](../.agents/ORCHESTRATION.md).

## Roles and work packages

| Registered role | Responsibility |
| --- | --- |
| `architecture` | Analyze requirements, compare options, identify risks, propose decisions for human approval |
| `implementation` | Make scoped approved changes and execute implementation checks |
| `qa` | Independently verify acceptance criteria and report reproducible defects/evidence gaps |
| `review` | Read-only, independent inspection of actual changes and supporting evidence |
| `git_release` | Verify Git state and execute only specifically authorized repository operations |

The Technical Owner approved horse/scheduling behavior (WP-001), simulation mechanics (WP-002), lifecycle/runtime behavior (WP-003), playable UI and refinements (WP-004), and final testing/documentation preparation (WP-005). Approval covered the relevant scope, constraints, verification, and ordinary agent transitions. Implementation, QA, and Review were delegated using actual registered Codex roles, as recorded in the supplied task conversation. Repository files alone do not prove that an agent ran.

Within an explicitly approved package, the coordinator continues between ordinary stages without a new prompt. There are at most two corrective implementation cycles and one transient read-only retry. Changed code invalidates affected verification evidence and requires fresh QA/review. Scope expansion, architecture changes, dependencies outside approved tooling, Git publication, and final acceptance remain human-controlled.

## Evidence and real corrections

Evidence sources are kept distinct:

- **Repository history:** merged commits record frontend foundation (`08c6cdd`), simulation (`78c7ecf`), lifecycle (`c8c4ab0`), and playable UI (`f0af56d`). Source and tests substantiate the delivered behavior; commit titles alone do not prove execution results.
- **Node compatibility correction:** retained commit `fe5dad9e53fca92467fc64ab4abb6892a2cdab62` changes only the root engine declarations in package manifest/lockfile from `^22.18.0 || >=24.12.0` to `^22.22.2 || ^24.15.0 || >=26.0.0`. The task conversation records that independent Review found the mismatch, Implementation corrected it, and QA/Review verified it before publication. Git proves the change; the conversation supplies the role/approval attribution.
- **Checkpoint alignment:** merged `193eeade7cf6a7451487a1561dcb42021eca0ac3` records the orchestration ADR/protocol and conditional checkpoint wording in three role definitions/configurations. The conversation records the review finding that unconditional human checkpoints blocked already-approved ordinary transitions. The correction preserves explicit human gates rather than granting agents self-approval.
- **UI refinement:** the WP-004 conversation and inspected browser artifacts record that small horses, long mobile scrolling, and weak start-line emphasis were design suggestions, not confirmed simulation defects. Approved refinements increased runners, added mobile disclosure, and stabilized Pause layout. The minute-format timing suspicion was investigated against actual code and rendered seconds and was not reported as a confirmed defect.

For WP-005, the supplied conversation records actual Implementation, independent QA, and registered Review invocations before publication. GitHub then executed the [push Quality run](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916926289) and [PR Quality run](https://github.com/devymahoni/insider-horse-racing/actions/runs/44916978887) successfully at `37c43918b311a9977340591b8530793bde4c4816`. These remote runs establish execution of the committed checks, not independent human acceptance of every behavior.

The subsequent local gallop work adds an original eight-frame SVG and CSS lifecycle tests. QA found a real test-synchronization issue: a paused CSS animation could settle its timeline by one final frame before the test baseline was stable. The authorized correction awaited `Animation.ready` while retaining strict frozen-time/transform assertions. This attribution comes from actual agent messages in the supplied conversation; the test source substantiates the correction, not the identity of its author.

This final maintainability package preserves the gallop work, compares three deterministic screenshot baselines, and adds Firefox/WebKit smoke coverage. A measured container-transform candidate showed no frame benefit and more layout work, so it was not adopted. This was an evidence-based local engineering decision, not a fabricated example of a human rejecting an AI proposal. Independent QA and Review of the current uncommitted package remain separate subsequent gates. See [quality review](QUALITY_REVIEW.md) and [traceability](REQUIREMENTS_TRACEABILITY.md) for scope and evidence limits.

## Limitations and transparency

This documentation and the application are AI-assisted work. AI can misunderstand requirements, miss defects, produce brittle tests, and overstate verification unless evidence is reconciled. Tests and review are complementary, not proof of correctness in all environments. Automated axe checks do not replace manual screen-reader evaluation; local checks do not prove GitHub CI ran.

The shared engineering rules are tool-neutral. Codex uses its registered roles and actual delegation mechanism. Claude Code requires its own validated registration, permissions, and adapter; **Claude compatibility has not been tested**. There is no claim of autonomous architecture approval, unattended release authority, or cross-tool runtime equivalence.
