export class DataCheckError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'DataCheckError';
  }
}

const TOTAL_FIELDS = ['totalCommitContributions', 'totalPullRequestContributions', 'totalPullRequestReviewContributions', 'totalIssueContributions', 'restrictedContributionsCount'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isCount = (value) => Number.isInteger(value) && value >= 0;

export function summarize(collection, window) {
  const days = validDays(collection);
  if (collection.restrictedContributionsCount > 0) throw new DataCheckError('restricted contributions present');

  const totals = {
    commits: collection.totalCommitContributions,
    prs: collection.totalPullRequestContributions,
    reviews: collection.totalPullRequestReviewContributions,
    issues: collection.totalIssueContributions,
  };
  const monthly = bucketByMonth(days, window.months);
  const anyTotal = Object.values(totals).some((n) => n > 0);
  if (anyTotal && monthly.every((n) => n === 0)) throw new DataCheckError('malformed response');

  return {
    rangeLabel: window.rangeLabel,
    updated: window.updated,
    totals,
    monthly,
    monthLabels: window.months.map((m) => m.label),
  };
}

function validDays(collection) {
  const malformed = () => new DataCheckError('malformed response');
  if (!TOTAL_FIELDS.every((field) => isCount(collection?.[field]))) throw malformed();
  const weeks = collection.contributionCalendar?.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) throw malformed();
  const days = weeks.flatMap((week) => {
    if (!Array.isArray(week?.contributionDays)) throw malformed();
    return week.contributionDays;
  });
  if (!days.every((day) => typeof day?.date === 'string' && DATE.test(day.date) && isCount(day.contributionCount))) throw malformed();
  return days;
}

function bucketByMonth(days, months) {
  const index = new Map(months.map((m, i) => [m.key, i]));
  const monthly = new Array(months.length).fill(0);
  for (const day of days) {
    const i = index.get(day.date.slice(0, 7));
    if (i !== undefined) monthly[i] += day.contributionCount;
  }
  return monthly;
}
