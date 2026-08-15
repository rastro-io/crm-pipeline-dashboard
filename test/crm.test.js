import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  accountSnapshot,
  enrichOpportunities,
  filterByOwner,
  forecastCategory,
  riskLabel,
  scoreDealRisk,
  selectHighPriorityDeals,
  summarizeOwners,
  summarizePipeline
} from "../src/crm.js";

const fixtureData = JSON.parse(readFileSync(new URL("../data/crm.json", import.meta.url), "utf8"));
const highPriorityReferenceDate = "2026-05-28";

const data = {
  accounts: [
    {
      id: "acct-a",
      name: "Enterprise Co",
      owner: "Maya Chen",
      health: "At Risk",
      arr: 400000
    },
    {
      id: "acct-b",
      name: "Healthy Co",
      owner: "Jordan Lee",
      health: "Healthy",
      arr: 90000
    }
  ],
  opportunities: [
    {
      id: "opp-a",
      accountId: "acct-a",
      name: "Expansion",
      stage: "Discovery",
      amount: 150000,
      probability: 40,
      closeDate: "2026-06-10",
      nextStep: "",
      lastActivityDays: 28,
      contactCoverage: 1
    },
    {
      id: "opp-b",
      accountId: "acct-b",
      name: "Automation",
      stage: "Negotiation",
      amount: 50000,
      probability: 70,
      closeDate: "2026-06-20",
      nextStep: "Send final pricing",
      lastActivityDays: 3,
      contactCoverage: 3
    }
  ],
  contacts: [
    {
      id: "contact-a",
      accountId: "acct-a",
      name: "Alex Buyer"
    }
  ],
  tasks: [
    {
      id: "task-a",
      accountId: "acct-a",
      dueDate: "2026-05-20",
      status: "open"
    },
    {
      id: "task-b",
      accountId: "acct-b",
      dueDate: "2026-06-01",
      status: "open"
    }
  ],
  activities: [
    {
      id: "activity-a",
      accountId: "acct-a",
      summary: "No sponsor confirmed."
    }
  ]
};

describe("scoreDealRisk", () => {
  it("scores stale, high-value deals with missing next steps as critical risk", () => {
    const score = scoreDealRisk(data.opportunities[0], data.accounts[0]);

    assert.equal(score, 100);
    assert.equal(riskLabel(score), "Critical");
  });

  it("keeps active negotiation deals low risk", () => {
    const score = scoreDealRisk(data.opportunities[1], data.accounts[1]);

    assert.equal(riskLabel(score), "Low");
  });
});

describe("enrichOpportunities", () => {
  it("adds account, weighted amount, risk, and forecast details", () => {
    const opportunities = enrichOpportunities(data);

    assert.equal(opportunities[0].id, "opp-a");
    assert.equal(opportunities[0].account.name, "Enterprise Co");
    assert.equal(opportunities[0].weightedAmount, 60000);
    assert.equal(opportunities[0].forecastCategory, "At Risk");
  });
});

describe("forecastCategory", () => {
  it("classifies strong negotiation deals as commit", () => {
    assert.equal(forecastCategory(data.opportunities[1], 0), "Commit");
  });
});

describe("summarizePipeline", () => {
  it("summarizes pipeline and overdue tasks", () => {
    assert.deepEqual(summarizePipeline(data), {
      openPipeline: 200000,
      weightedPipeline: 95000,
      criticalDeals: 1,
      overdueTasks: 1
    });
  });

  it("can summarize one owner's book", () => {
    assert.deepEqual(summarizePipeline(data, "Jordan Lee"), {
      openPipeline: 50000,
      weightedPipeline: 35000,
      criticalDeals: 0,
      overdueTasks: 0
    });
  });
});

describe("owner and account helpers", () => {
  it("lists owners alphabetically", () => {
    assert.deepEqual(summarizeOwners(data), ["Jordan Lee", "Maya Chen"]);
  });

  it("filters enriched opportunities by owner", () => {
    const opportunities = enrichOpportunities(data);

    assert.deepEqual(
      filterByOwner(opportunities, "Maya Chen").map((opportunity) => opportunity.id),
      ["opp-a"]
    );
  });

  it("returns account context for meeting prep style features", () => {
    const snapshot = accountSnapshot(data, "acct-a");

    assert.equal(snapshot.account.name, "Enterprise Co");
    assert.equal(snapshot.contacts.length, 1);
    assert.equal(snapshot.tasks.length, 1);
    assert.equal(snapshot.activities.length, 1);
  });
});

describe("selectHighPriorityDeals", () => {
  it("selects standard-rule deals with account context and every standard reason in order", () => {
    const selected = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate);
    const opportunity = selected.find((item) => item.id === "opp-206");

    assert.equal(opportunity.account.id, "acct-104");
    assert.deepEqual(opportunity.reasons, [
      "Amount exceeds $50,000",
      "No activity in more than 7 days",
      "Close date is within the next 30 days"
    ]);
  });

  it("selects Enterprise accounts with At Risk health regardless of close date", () => {
    const selected = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate);
    const opportunity = selected.find((item) => item.id === "opp-201");

    assert.deepEqual(opportunity.reasons, ["Enterprise account health is At Risk"]);
    assert.equal(opportunity.closeDate, "2026-06-28");
  });

  it("excludes deals that satisfy neither approved rule", () => {
    const selectedIds = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate).map((item) => item.id);

    assert.equal(selectedIds.includes("opp-205"), false);
  });

  it("applies the strict amount and activity boundaries", () => {
    const selectedIds = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate).map((item) => item.id);

    assert.equal(selectedIds.includes("opp-207"), false);
    assert.equal(selectedIds.includes("opp-208"), false);
  });

  it("includes the 30-day close boundary and excludes 31-day and past-due standard candidates", () => {
    const selectedIds = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate).map((item) => item.id);

    assert.equal(selectedIds.includes("opp-209"), true);
    assert.equal(selectedIds.includes("opp-210"), false);
    assert.equal(selectedIds.includes("opp-211"), false);
  });

  it("returns only the approved fixture qualifiers in source order", () => {
    const selected = selectHighPriorityDeals(fixtureData, highPriorityReferenceDate);

    assert.deepEqual(selected.map((item) => item.id), ["opp-201", "opp-206", "opp-209"]);
    assert.deepEqual(
      [...new Set(selected.flatMap((item) => item.reasons))],
      [
        "Enterprise account health is At Risk",
        "Amount exceeds $50,000",
        "No activity in more than 7 days",
        "Close date is within the next 30 days"
      ]
    );
  });

  it("returns every reason in contract order when both rules qualify a deal", () => {
    const bothRulesData = {
      accounts: [
        {
          id: "acct-both",
          segment: "Enterprise",
          health: "At Risk"
        }
      ],
      opportunities: [
        {
          id: "opp-both",
          accountId: "acct-both",
          amount: 50001,
          lastActivityDays: 8,
          closeDate: "2026-06-01"
        }
      ]
    };

    assert.deepEqual(selectHighPriorityDeals(bothRulesData, "2026-05-28"), [
      {
        ...bothRulesData.opportunities[0],
        account: bothRulesData.accounts[0],
        reasons: [
          "Amount exceeds $50,000",
          "No activity in more than 7 days",
          "Close date is within the next 30 days",
          "Enterprise account health is At Risk"
        ]
      }
    ]);
  });

  it("uses a supplied non-default reference date for the standard close-date window", () => {
    const changingWindowData = {
      accounts: [
        {
          id: "acct-window",
          segment: "Mid-Market",
          health: "Healthy"
        }
      ],
      opportunities: [
        {
          id: "opp-window",
          accountId: "acct-window",
          amount: 60000,
          lastActivityDays: 9,
          closeDate: "2026-06-28"
        }
      ]
    };

    assert.deepEqual(selectHighPriorityDeals(changingWindowData, "2026-05-28"), []);
    assert.deepEqual(
      selectHighPriorityDeals(changingWindowData, "2026-05-29").map((opportunity) => opportunity.id),
      ["opp-window"]
    );
  });

  it("selects a Healthy non-Enterprise standard candidate closing on the supplied reference date", () => {
    const closeDateBoundaryData = {
      accounts: [
        {
          id: "acct-close-date-boundary",
          segment: "Mid-Market",
          health: "Healthy"
        }
      ],
      opportunities: [
        {
          id: "opp-close-date-boundary",
          accountId: "acct-close-date-boundary",
          amount: 50001,
          lastActivityDays: 8,
          closeDate: "2026-05-28"
        }
      ]
    };

    assert.deepEqual(selectHighPriorityDeals(closeDateBoundaryData, "2026-05-28"), [
      {
        ...closeDateBoundaryData.opportunities[0],
        account: closeDateBoundaryData.accounts[0],
        reasons: [
          "Amount exceeds $50,000",
          "No activity in more than 7 days",
          "Close date is within the next 30 days"
        ]
      }
    ]);
  });

  it("selects a past-due Enterprise At Risk candidate with only the alternate reason", () => {
    const alternatePastDueData = {
      accounts: [
        {
          id: "acct-alternate-past-due",
          segment: "Enterprise",
          health: "At Risk"
        }
      ],
      opportunities: [
        {
          id: "opp-alternate-past-due",
          accountId: "acct-alternate-past-due",
          amount: 60000,
          lastActivityDays: 9,
          closeDate: "2026-05-27"
        }
      ]
    };

    assert.deepEqual(selectHighPriorityDeals(alternatePastDueData, "2026-05-28"), [
      {
        ...alternatePastDueData.opportunities[0],
        account: alternatePastDueData.accounts[0],
        reasons: ["Enterprise account health is At Risk"]
      }
    ]);
  });
});
