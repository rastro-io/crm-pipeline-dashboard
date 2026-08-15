# ELI-2563 Technical Requirements: High-Priority Deal Selector

## Architecture Fit

Add one exported, pure selector to `src/crm.js`; add focused tests to `test/crm.test.js`. No changes are required to `data/crm.json`, the UI, backend, SQLite database, dependencies, or APIs.

## Selector Contract

`selectHighPriorityDeals(data, referenceDate = "2026-05-28")` accepts the current CRM fixture shape and an ISO date string controlled by the caller. It returns selected opportunities in their source order, each enriched with:

- `account`: the matching account object
- `reasons`: an ordered array of human-readable inclusion reasons

The selector uses UTC calendar-day arithmetic for date-only ISO values, so it does not depend on the wall clock or local timezone.

## Rules

1. Standard selection requires all of: `amount > 50000`, `lastActivityDays > 7`, and `0 <= closeDate - referenceDate <= 30` calendar days.
2. The standard rule never admits a past-due date.
3. Alternate selection requires `account.segment === "Enterprise"` and `account.health === "At Risk"`; close date is irrelevant.
4. A selected deal includes all applicable reasons in this fixed order: amount, activity, close window, Enterprise At Risk health.

## Compatibility and Safety

This selector does not call or alter risk scoring, forecast categorization, owner filtering, pipeline summaries, chart bucket mapping, or weighted amounts. It uses existing fields only and performs no I/O.

## Test Requirements

Tests provide a literal reference date and independently assert expected fixture identifiers and reason arrays. They cover standard and alternate inclusion, exclusion, multiple reasons, strict amount and activity thresholds, 30/31-day boundaries, and a past-due standard candidate.

## Technical Decision Log

| Date | Decision | Owner |
| --- | --- | --- |
| 2026-08-14 | Use an optional deterministic default while allowing every caller and test to supply its reference date explicitly. | Patrick |
