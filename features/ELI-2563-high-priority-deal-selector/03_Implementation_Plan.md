# ELI-2563 Implementation Plan: High-Priority Deal Selector

## Approach

Implement a pure `src/crm.js` selector that maps accounts by ID, evaluates the two approved rules using a supplied deterministic reference date, and returns source-order opportunity/account/reason records. No UI integration is in scope.

## Work Breakdown

| Phase | Task | Status |
| --- | --- | --- |
| Documentation | Record the binding contract and technical interface. | Complete |
| Tests | Add independent fixture-based selector tests and run them before implementation. | In progress |
| Logic | Implement date-only calculation and selector without changing existing functions. | Not started |
| Verification | Run `npm test` and `git diff --check`. | Not started |

## Acceptance Criteria

- All and only qualifying deals are returned with matching account context.
- Standard qualification uses strict $50,000 and 7-day thresholds and an inclusive 0–30-day window.
- The Enterprise + `At Risk` alternate rule is independent of close date.
- Reasons are complete, human-readable, and in documented order.
- Existing dashboard logic is untouched and all tests pass.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Timezone-dependent date math | Parse ISO date fields as UTC calendar dates and pass a literal reference date in tests. |
| Confusing account health with deal risk | Restrict the alternate rule to the existing account segment and health fields; do not invoke risk scoring. |

## Verification Plan

1. Write and run selector tests before adding production logic; expect an import/export failure.
2. Implement the selector and run `npm test`.
3. Run `git diff --check` before commit.
