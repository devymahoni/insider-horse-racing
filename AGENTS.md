# Engineering Rules

Project: Insider One Frontend Case Study
Human owner: Senior Engineer / Technical Owner

These rules apply equally to human contributors and AI assistants, including Codex and Claude Code. They are tool-neutral and do not prescribe a framework, library, or architecture.

## Human ownership

- The Technical Owner owns architectural decisions and final acceptance.
- Before introducing or changing architectural boundaries, frameworks, dependencies, state management strategies, public contracts, or persistence models, present the problem, options, tradeoffs, and recommendation for explicit approval.
- Do not treat silence or an AI recommendation as approval. Implement within approved decisions; escalate material departures before proceeding.

## Requirements first

- Read the relevant requirements and existing implementation before editing.
- Identify the intended behavior, scope, constraints, acceptance criteria, and verification approach before implementation. Keep this in the task discussion unless documentation is requested.
- Ask about ambiguities that affect behavior or architecture. State minor assumptions explicitly and avoid expanding scope.
- Do not initialize a framework, install dependencies, or create unrelated files unless authorized by the task.

## Clean and maintainable architecture

- Follow approved project conventions and architectural boundaries.
- Favor cohesive modules, explicit contracts, clear names, and simple solutions. Avoid speculative abstractions, unnecessary dependencies, and unrelated refactoring.
- Keep dependencies explicit and avoid circular dependencies. Keep domain behavior independent of presentation and infrastructure details where approved boundaries allow.
- Propose architectural improvements for approval rather than silently introducing them.

## Business logic, state, and UI

- Keep business rules and transformations separate from UI rendering and event wiring.
- Keep state transitions and state ownership explicit. Avoid duplicating authoritative state; derive values when practical.
- UI components render state and express user intent. They must not conceal business rules or directly coordinate unrelated infrastructure effects.
- Place side effects behind clear boundaries according to the approved architecture. Do not introduce a state library or new layering scheme without approval.

## Unidirectional Data Flow

- Maintain a clear flow: user intent → action or handler → state transition → rendered UI.
- Update authoritative state through its designated owner. Do not mutate inputs or shared state through hidden paths.
- Pass data down and communicate intent through explicit events or callbacks consistent with approved conventions.
- Keep derived state predictable and avoid feedback loops between rendering, effects, and state updates.

## Small, reviewable tasks

- Break work into small tasks with one clear purpose, acceptance criteria, and a verification step.
- Keep each change independently understandable and reviewable. Explain ordering or dependencies when tasks cannot stand alone.
- Separate behavioral changes from unrelated cleanup or formatting. Do not broaden a task without agreement.
- Stop at requested review checkpoints; do not commit, merge, publish, or deploy without authorization.

## Testing and verification

- Verify changes against acceptance criteria using the project's established checks.
- Add or update meaningful tests for changed behavior, including relevant failure paths and edge cases. Prefer observable behavior over tests that mirror implementation details.
- For UI changes, verify relevant interactions, accessibility, loading and error states, and responsive behavior.
- Run applicable tests, type checks, linting, and builds when available and relevant. Do not install tools or dependencies solely to run checks without authorization.
- Report exactly which checks ran and their outcomes. Identify checks that could not run and why; never claim unperformed verification.

## Asynchronous safety and cleanup

- Handle loading, success, failure, and cancellation explicitly where applicable. Do not swallow errors or leave unhandled promise rejections.
- Prevent stale responses and overlapping requests from overwriting newer state. Use cancellation or request identity checks appropriate to the approved stack.
- Clean up subscriptions, listeners, timers, observers, and in-flight work when their owner is disposed or their inputs change.
- Prevent updates after disposal and avoid duplicate submissions or effects. Account for asynchronous races in verification when relevant.

## Code review and quality gates

- Review the diff before handoff for scope, correctness, maintainability, boundary violations, asynchronous risks, and accidental sensitive data.
- A change is ready for review only when acceptance criteria are addressed, applicable checks pass, and remaining risks or gaps are disclosed.
- Do not bypass failing checks, weaken tests, or suppress diagnostics to make a change appear complete. Distinguish existing failures from regressions using evidence.
- Human review and required project checks gate acceptance and integration. AI self-review does not replace human approval.

## Honest reporting of AI-generated changes

- Clearly identify AI-authored or AI-assisted changes in the handoff and any requested review description.
- Summarize what changed, why, affected behavior, verification results, assumptions, and unresolved limitations.
- Distinguish observed results from expectations and recommendations. Do not invent test results, approvals, source evidence, or completion claims.
- Disclose deviations from the requested scope and obtain approval before continuing beyond it. The Technical Owner retains responsibility for accepting AI-generated work.

## Agent Responsibility Boundaries

- Each agent must stay within its assigned role, task scope, and authorized files or actions. A role assignment does not itself authorize delegation, architectural decisions, or broader changes.
- **Architecture:** Analyze requirements, identify boundaries, and propose options with tradeoffs. Obtain explicit approval from the Technical Owner before adopting or implementing architectural changes. Another agent's agreement is not human approval.
- **Implementation:** Make only authorized changes within the approved architecture and acceptance criteria. Escalate architectural gaps or necessary departures for human approval before implementing them.
- **QA:** Verify behavior against acceptance criteria, reproduce defects, and report evidence and coverage gaps. Modify tests only when authorized by the assignment; application fixes require implementation authorization.
- **Review:** Inspect changes and supporting evidence, identify defects and risks, and report findings. Review-only agents must not modify code, tests, configuration, or other project files without explicit authorization.
- Switching roles or taking on work outside the assigned scope requires authorization. No agent may grant itself approval or waive human review and quality gates.

## Context and Decision Handoff

- Preserve the task objective, scope, acceptance criteria, constraints, and current progress whenever work passes between agents, tools, or sessions.
- Carry forward approved decisions with their rationale, approval source, and applicable scope. Distinguish approved decisions from proposals and pending approvals; do not silently reinterpret or replace them.
- Preserve assumptions and whether they have been confirmed, verification evidence, unresolved issues, risks, blockers, and remaining work. Include relevant file references and the next authorized action without creating additional handoff files unless requested.
- Record verification evidence with the checks performed, results, relevant output or artifact references, and the code revision or state checked when available. Identify checks not run and any limits on the evidence.
- Never treat another agent's unverified claims as facts. Label reported claims as unverified until supported by inspected evidence or independently reproduced checks; reassess evidence if the underlying code or context has changed.
- The receiving agent must reconcile the handoff with the current requirements and project state before acting. Surface conflicts and missing approvals to the Technical Owner, and obtain clarification before work that depends on them.
