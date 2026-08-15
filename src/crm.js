const STAGE_ORDER = ["Qualified", "Discovery", "Proposal", "Negotiation", "Closed Won"];

const HEALTH_RISK = {
  Healthy: 0,
  Watch: 12,
  "At Risk": 24
};

const HIGH_PRIORITY_REFERENCE_DATE = "2026-05-28";

const HIGH_PRIORITY_REASONS = {
  amount: (amount) => `Amount $${amount.toLocaleString("en-US")} exceeds $50,000`,
  activity: (lastActivityDays) => `No activity in ${lastActivityDays} days`,
  closeDate: (daysToClose) => `Close date is in ${daysToClose} days`,
  accountHealth: "Enterprise account health is At Risk"
};

export function enrichOpportunities(data) {
  return data.opportunities
    .map((opportunity) => {
      const account = findAccount(data, opportunity.accountId);
      const riskScore = scoreDealRisk(opportunity, account);
      return {
        ...opportunity,
        account,
        weightedAmount: Math.round(opportunity.amount * (opportunity.probability / 100)),
        riskScore,
        riskLabel: riskLabel(riskScore),
        forecastCategory: forecastCategory(opportunity, riskScore)
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || b.amount - a.amount);
}

export function scoreDealRisk(opportunity, account) {
  let score = 0;

  if (opportunity.lastActivityDays >= 21) score += 30;
  else if (opportunity.lastActivityDays >= 14) score += 18;
  else if (opportunity.lastActivityDays >= 7) score += 8;

  if (!opportunity.nextStep.trim()) score += 24;
  if (opportunity.contactCoverage < 2) score += 16;
  if (daysUntil(opportunity.closeDate) <= 21 && opportunity.stage !== "Negotiation") score += 12;
  if (opportunity.amount >= 100000) score += 10;

  score += HEALTH_RISK[account.health] ?? 0;

  return Math.min(score, 100);
}

export function riskLabel(score) {
  if (score >= 70) return "Critical";
  if (score >= 45) return "High";
  if (score >= 20) return "Medium";
  return "Low";
}

export function forecastCategory(opportunity, riskScore) {
  if (riskScore >= 70) return "At Risk";
  if (opportunity.stage === "Negotiation" && opportunity.probability >= 65) return "Commit";
  if (opportunity.probability >= 45) return "Best Case";
  return "Pipeline";
}

export function selectHighPriorityDeals(data, referenceDate = HIGH_PRIORITY_REFERENCE_DATE) {
  const accountsById = new Map(data.accounts.map((account) => [account.id, account]));

  return data.opportunities.flatMap((opportunity) => {
    const account = accountsById.get(opportunity.accountId);
    if (!account) return [];

    const daysToClose = daysBetween(referenceDate, opportunity.closeDate);
    const meetsStandardRule =
      opportunity.amount > 50000 &&
      opportunity.lastActivityDays > 7 &&
      daysToClose >= 0 &&
      daysToClose <= 30;
    const meetsAlternateRule = account.segment === "Enterprise" && account.health === "At Risk";

    if (!meetsStandardRule && !meetsAlternateRule) return [];

    const reasons = [];
    if (meetsStandardRule) {
      reasons.push(
        HIGH_PRIORITY_REASONS.amount(opportunity.amount),
        HIGH_PRIORITY_REASONS.activity(opportunity.lastActivityDays),
        HIGH_PRIORITY_REASONS.closeDate(daysToClose)
      );
    }
    if (meetsAlternateRule) reasons.push(HIGH_PRIORITY_REASONS.accountHealth);

    return [{ ...opportunity, account, reasons }];
  });
}

export function summarizePipeline(data, owner = "all") {
  const opportunities = filterByOwner(enrichOpportunities(data), owner);
  const openTasks = filterTasksByOwner(data, owner).filter((task) => task.status === "open");

  return {
    openPipeline: opportunities.reduce((sum, opportunity) => sum + opportunity.amount, 0),
    weightedPipeline: opportunities.reduce((sum, opportunity) => sum + opportunity.weightedAmount, 0),
    criticalDeals: opportunities.filter((opportunity) => opportunity.riskLabel === "Critical").length,
    overdueTasks: openTasks.filter((task) => isOverdue(task.dueDate)).length
  };
}

export function summarizeOwners(data) {
  return [...new Set(data.accounts.map((account) => account.owner))].sort();
}

export function filterByOwner(opportunities, owner) {
  if (owner === "all") return opportunities;
  return opportunities.filter((opportunity) => opportunity.account.owner === owner);
}

export function accountSnapshot(data, accountId) {
  const account = findAccount(data, accountId);
  return {
    account,
    contacts: data.contacts.filter((contact) => contact.accountId === accountId),
    tasks: data.tasks.filter((task) => task.accountId === accountId),
    activities: data.activities.filter((activity) => activity.accountId === accountId)
  };
}

export function stageIndex(stage) {
  return STAGE_ORDER.indexOf(stage);
}

function findAccount(data, accountId) {
  return data.accounts.find((account) => account.id === accountId);
}

function filterTasksByOwner(data, owner) {
  if (owner === "all") return data.tasks;
  const accountIds = new Set(data.accounts.filter((account) => account.owner === owner).map((account) => account.id));
  return data.tasks.filter((task) => accountIds.has(task.accountId));
}

function daysUntil(dateString) {
  return daysBetween(HIGH_PRIORITY_REFERENCE_DATE, dateString);
}

function daysBetween(startDateString, endDateString) {
  return Math.ceil((utcDate(endDateString) - utcDate(startDateString)) / 86_400_000);
}

function utcDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isOverdue(dateString) {
  return daysUntil(dateString) < 0;
}
