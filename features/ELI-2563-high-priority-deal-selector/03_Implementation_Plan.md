# ELI-2563 Implementation Plan: High-Priority Deal Selector

## Approach

Implement a pure `src/crm.js` selector that maps accounts by ID, evaluates the two approved rules using a supplied deterministic reference date, and returns source-order opportunity/account/reason records. No UI integration is in scope.

## Work Breakdown

| Phase | Task | Status |
| --- | --- | --- |
| Documentation | Record the binding contract and technical interface. | Complete |
| Tests | Add independent fixture-based selector tests and run them before implementation. | Complete |
| Logic | Implement date-only calculation and selector without changing existing functions. | Complete |
| Verification | Run `npm test` and `git diff --check`. | Complete |

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

## Completed Evidence

- The initial selector test run failed before implementation because `src/crm.js` did not export `selectHighPriorityDeals`.
- The implementation commit is `9348919` (`feat: add high-priority deal selector`).
- `npm test` passed 15 tests after implementation and post-commit.
- Remediation coverage adds a self-contained combined-rule case that asserts all four reasons in contract order, plus a non-default reference-date case that changes a standard deal from 31 days (excluded) to 30 days (included).
- The remediation validation run passed 17 tests. `git diff --check` is run again before the remediation commit.
- Remediation cycle 2 adds deterministic zero-day standard-rule coverage for a Healthy non-Enterprise account and past-due alternate-rule coverage for an Enterprise `At Risk` account; all 19 tests passed with `src/crm.js` unchanged.

## Progress Log

| Date | Update | Owner | Notes |
| --- | --- | --- | --- |
| 2026-08-14 | Initial implementation complete. | Build agent | Added pure selector, feature artifacts, and approved fixture boundary coverage; 15 tests passed. |
| 2026-08-14 | Review remediation complete. | Build agent | Added combined-rule reason-order and non-default reference-date tests; 17 tests passed. |
| 2026-08-14 | Remediation cycle 2 complete. | Build agent | Added zero-day standard and past-due alternate regression tests; 19 tests passed without production changes. |
