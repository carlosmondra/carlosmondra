export function summarize(collection, window) {
  if (collection.restrictedContributionsCount > 0) throw new Error('restricted contributions present');

  return {
    rangeLabel: window.rangeLabel,
    updated: window.updated,
    totals: {
      commits: collection.totalCommitContributions,
      prs: collection.totalPullRequestContributions,
      reviews: collection.totalPullRequestReviewContributions,
      issues: collection.totalIssueContributions,
    },
    monthly: bucketByMonth(collection.contributionCalendar.weeks, window.months),
    monthLabels: window.months.map((m) => m.label),
  };
}

function bucketByMonth(weeks, months) {
  const index = new Map(months.map((m, i) => [m.key, i]));
  const monthly = new Array(months.length).fill(0);
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      const i = index.get(day.date.slice(0, 7));
      if (i !== undefined) monthly[i] += day.contributionCount;
    }
  }
  return monthly;
}
