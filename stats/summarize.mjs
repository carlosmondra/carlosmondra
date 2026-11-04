export const EXCLUDED_LANGUAGES = ['HTML', 'CSS', 'SCSS', 'Jupyter Notebook', 'TeX', 'Dockerfile', 'Makefile', 'Procfile'];

const MAX_LANGUAGES = 4;
const OTHER_COLOR = '#8c959f';

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
    languages: languageMix(collection.commitContributionsByRepository),
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

function languageMix(repos) {
  const weights = new Map();
  for (const { contributions, repository } of repos) {
    const edges = repository.languages.edges.filter((e) => !EXCLUDED_LANGUAGES.includes(e.node.name));
    const codeSize = edges.reduce((sum, e) => sum + e.size, 0);
    if (codeSize === 0) continue;
    for (const { size, node } of edges) {
      const entry = weights.get(node.name) ?? { name: node.name, color: node.color ?? OTHER_COLOR, weight: 0 };
      entry.weight += (size / codeSize) * contributions.totalCount;
      weights.set(node.name, entry);
    }
  }

  const ranked = [...weights.values()].filter((l) => l.weight > 0).sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
  const shown =
    ranked.length > MAX_LANGUAGES
      ? [...ranked.slice(0, MAX_LANGUAGES - 1), { name: 'Other', color: OTHER_COLOR, weight: ranked.slice(MAX_LANGUAGES - 1).reduce((sum, l) => sum + l.weight, 0) }]
      : ranked;

  const percents = largestRemainder(shown.map((l) => l.weight));
  return shown.map((l, i) => ({ name: l.name, color: l.color, percent: percents[i] }));
}

function largestRemainder(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / total) * 100);
  const floors = raw.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - floors[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (remaining-- <= 0) break;
    floors[i] += 1;
  }
  return floors;
}
