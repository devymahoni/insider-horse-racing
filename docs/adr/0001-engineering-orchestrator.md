# ADR 0001: Engineering Orchestrator

## Approval status

**Accepted — explicitly approved by the Technical Owner.**

Approval source: the Technical Owner's explicit instruction to record the approved Engineering Orchestrator architecture and operational rules in this ADR. This AI-assisted record documents that decision; it does not authorize implementation or release operations.

## Context and problem

The Insider One Frontend Case Study has five registered Codex custom agents with distinct responsibilities. Repeated manual routing between those roles creates coordination overhead and risks losing scope, approved decisions, and verification evidence.

The engineering workflow must support small, verifiable tasks, independent assessment, bounded recovery, and explicit human ownership. Shared policies must remain portable across Codex and Claude Code without assuming identical runtime capabilities.

Relevant existing sources are [AGENTS.md](../../AGENTS.md), the [Architecture](../../.agents/architecture.md), [Implementation](../../.agents/implementation.md), [QA](../../.agents/qa.md), [Review](../../.agents/review.md), and [Git / Release](../../.agents/git-release.md) roles, and their registrations in [.codex/agents](../../.codex/agents).

## Decision

Use a **main-session coordinator** that delegates to the five existing registered custom agents:

| Agent identifier | Responsibility |
| --- | --- |
| `architecture` | Analyze requirements and propose architectural decisions for human approval. |
| `implementation` | Implement authorized tasks within approved architecture and file scope. |
| `qa` | Verify acceptance criteria and report evidence and defects; edit tests only when authorized. |
| `review` | Independently assess actual changes and supporting evidence, read-only by default. |
| `git_release` | Execute specifically authorized Git and release operations and verify their outcomes. |

Do not introduce an external workflow runner or a new Orchestrator subagent at this stage. The coordinator plans, routes, reconciles handoffs, tracks approvals and progress, and reports results; it cannot grant approval or absorb another role's authority.

Automatically coordinate tasks within an explicitly approved work package. Use sequential delegation initially, with one implementation writer at a time. Each task must have a clear purpose, acceptance criteria, permitted files and actions, and a verification step. A high-level objective alone does not authorize scope expansion.

### Approved workflow

```text
Intake → Planning → Scope Approval
  → Architecture Review (when needed) → Design Approval (when needed)
  → Implementation → QA → Independent Review → Human Evaluation
  → Separately Authorized Git Operations → Final Report
```

The workflow may enter **Awaiting Approval**, **Blocked**, **Failed**, or **Cancelled** states. Skip architecture and design approval stages only when existing approved decisions are sufficient for the task. Stop dependent work at an approval boundary. Continue only when the next action is covered by explicit authorization and required evidence is available.

## Alternatives considered

1. **Main-session coordinator — selected.** Reuses the existing registered roles and delegation mechanisms with minimal additional infrastructure.
2. **External workflow runner — deferred.** Could provide durable execution and mechanically checked transitions, but would introduce integration, storage, maintenance, and validation costs unsupported by the present need.
3. **New Orchestrator subagent — deferred.** Would add another delegation level and require separate runtime validation without a demonstrated benefit at this stage.

## Rationale and trade-offs

The selected approach reduces manual routing while retaining visible decisions and existing role boundaries. Sequential delegation simplifies ownership, avoids concurrent writers in a shared workspace, and keeps evidence tied to a known repository state.

The trade-off is reliance on disciplined coordination, instruction interpretation, and state reconciliation. Persisted documentation improves continuity but does not provide a transactional workflow engine or guarantee unattended execution. Role instructions are not a separate permission sandbox.

## Approval boundaries

- Require explicit human approval for architectural changes, new dependencies, scope expansion, commits, pushes, Pull Request creation, and merges.
- Preserve existing restrictions on branch operations, staging, publication, and other actions in `AGENTS.md` and the role definitions. Approval for one operation does not authorize the next.
- Record approval source, action, scope, conditions, and relevant repository state. Do not treat silence, AI recommendations, agent agreement, QA success, or a favorable review as human approval.
- Preserve Review Agent independence: a reviewer must not have implemented the reviewed work. Implementation self-checks do not replace independent review. No agent may approve its own work or waive quality gates.
- Require evidence-based QA and review results. Human Evaluation retains final acceptance authority.
- This ADR does not silently remove existing role-specific stopping points. Any instruction alignment needed for automatic continuation must be separately authorized and validated before use.

## Failure and retry strategy

- Allow at most **two corrective implementation cycles** within an approved work package. Route QA defects and review findings to Implementation, then repeat affected QA and independent review against the changed state.
- Allow at most **one retry for transient read-only failures**. Track retry counts across the work package; replacing an agent or resuming a session does not reset the budget.
- Repairs must remain within approved scope. Architectural changes, dependencies, expanded scope, or other approval boundaries require a stop for human authorization.
- Verify ambiguous write outcomes against actual repository or remote state before considering a retry. A retry still requires authorization for the specific operation; do not duplicate an effect merely because its response was lost.
- Do not bypass failing checks, weaken tests, suppress diagnostics, or silently substitute a generic agent for an unavailable custom role.
- When a budget is exhausted or progress requires unavailable evidence, access, or approval, stop dependent work and report the blocker or failure. On cancellation or interruption, reconcile partial effects before any resumption.

## Persistence and handoff strategy

Record approved decisions, task status, scope, assumptions, verification evidence, and unresolved issues in portable, Git-trackable documentation. The coordinator maintains a coherent workflow record; agents return evidence and proposed status updates through their existing role output contracts.

Persisted records are **not automatically authoritative**. Before acting, reconcile them with actual repository state, current requirements, approval scope, and available evidence. Reassess affected QA and review conclusions when the underlying changes or environment differ.

Assignments and returned results must preserve:

| Handoff information | Required content |
| --- | --- |
| Task and authority | Objective, acceptance criteria, role, approval source, approved decisions and rationale. |
| Boundaries | Permitted files and actions, prohibited operations, stopping point, and retry usage. |
| Repository state | Branch, baseline, revision or identifiable working-tree state, and relevant inputs. |
| Progress | Task disposition, actual actions and changes, remaining work, and next authorized action. |
| Evidence | Commands, actual outcomes, environment, checked state, accessible artifact references, and unperformed checks with reasons. |
| Uncertainty | Confirmed facts, reported claims, assumptions and confirmation status, risks, unresolved issues, and pending approvals. |

Preserve each agent's existing six-part output contract. Receiving agents must inspect supporting evidence before treating another agent's report as verified. Keep records free of credentials and sensitive assessment content. Specific record locations and schemas beyond this ADR require a separately scoped implementation task; this task creates no additional records.

## Consequences and limitations

- Shared engineering policies remain tool-neutral. Codex and Claude Code must each use their own validated registration and delegation mechanisms; configuration files are not assumed interchangeable.
- **Claude compatibility has not been tested.** No cross-tool operational guarantee is made.
- Context loss, stale evidence, misleading tool output, and instruction conflicts remain risks. Repository content and agent output cannot grant Technical Owner authorization.
- Independent AI review supports human evaluation but does not guarantee defect absence or replace final human acceptance.
- This is an accepted architecture decision, **not an operational orchestration workflow**. No runner, Orchestrator subagent, role changes, persistence mechanism, or application implementation is introduced by this ADR.

## Validation plan

The following work requires a separately authorized implementation and validation scope:

1. Reconcile the coordinator instructions with existing agent checkpoints without weakening approval boundaries. Verify each custom identifier and actual delegation mechanism.
2. Define the portable workflow record and handoff format. Verify that approvals, evidence, retry usage, and unresolved issues survive a handoff and are reconciled after interruption.
3. Run read-only scenarios for missing approval, unavailable agents, conflicting instructions, stale revisions, and invalid handoffs. Acceptance: dependent work stops and no unauthorized operation occurs.
4. Exercise one small approved work package through Implementation, QA, and independent Review. Inject a failed check and a review finding; verify scoped repairs, refreshed evidence, and reviewer separation.
5. Exercise retry exhaustion, cancellation, and ambiguous write outcomes. Acceptance: budgets are preserved, partial effects are reconciled, and no duplicate write occurs.
6. Verify each Git approval gate independently. A work-package approval must not implicitly authorize commits, pushes, PR creation, or merges.
7. Validate Claude-specific registration, instruction loading, permissions, and delegation separately before claiming portability in operation.

The eventual final engineering report must identify AI assistance, authorized scope, approvals used, task outcomes, changed files and repository state, actual QA and review evidence, remaining risks, Git/publication state, and the next human decision. No workflow execution or runtime compatibility validation is claimed by this record.
