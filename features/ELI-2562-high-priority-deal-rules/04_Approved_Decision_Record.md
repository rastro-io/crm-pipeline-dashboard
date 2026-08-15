# ELI-2562: Approved Decision Record

**Status:** Accepted on 2026-08-14 by Patrick. This is the binding contract for ELI-2563.

| Decision | Approved behavior |
| --- | --- |
| Standard rule | Include only when `amount > 50000`, `lastActivityDays > 7`, and close date is 0–30 days from the deterministic reference date, inclusive. |
| Past-due open deals | Exclude them from the standard rule; they are not within the next 30 days. |
| Alternate rule | Include an Enterprise account with health `At Risk`, regardless of close date. |
| Chart bucket mapping | Use raw opportunity `stage`; do not derive a `Commit` bucket from forecast category. |
| Chart amount basis | Use unweighted opportunity amount. |
| Reasons | Return every independently triggered, human-readable reason in deterministic order. |

The reference date remains `2026-05-28`, the existing deterministic convention in `src/crm.js`. This contract does not change deal-risk scoring, account health, or forecast categories.

## Fixture coverage

| Scenario | Fixture ID |
| --- | --- |
| Standard inclusion / multiple reasons | `opp-206` |
| Alternate Enterprise + At Risk inclusion | `opp-201` |
| Neither rule | `opp-205` |
| Amount boundary (`50000`) | `opp-207` |
| Activity boundary (7 days) | `opp-208` |
| 30-day close boundary | `opp-209` |
| 31-day close exclusion | `opp-210` |
| Past-due standard-rule exclusion | `opp-211` |

No schema/API changes, database reseeding, external services, or dependencies are authorized by this contract.
