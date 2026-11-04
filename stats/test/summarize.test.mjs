import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeWindow } from '../window.mjs';
import { summarize } from '../summarize.mjs';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/collection.json', import.meta.url), 'utf8'));
const window = computeWindow(new Date('2026-11-04T17:00:00Z'));

test('totals map from collection', () => {
  const card = summarize(fixture(), window);
  assert.deepEqual(card.totals, { commits: 1740, prs: 449, reviews: 453, issues: 99 });
  assert.equal(card.rangeLabel, 'Dec 2025 – Nov 2026');
  assert.equal(card.updated, '2026-11-04');
});

test("calendar days bucket into the window's 12 months", () => {
  const card = summarize(fixture(), window);
  assert.equal(card.monthly.length, 12);
  assert.equal(card.monthly[0], 7);
  assert.equal(card.monthly[6], 9);
  assert.equal(card.monthly[11], 6);
  assert.equal(card.monthly.reduce((a, b) => a + b, 0), 22);
  assert.deepEqual(card.monthLabels, window.months.map((m) => m.label));
});

test('card carries no language data', () => {
  assert.equal('languages' in summarize(fixture(), window), false);
});

test('restricted contributions fail loudly', () => {
  const collection = fixture();
  collection.restrictedContributionsCount = 3;
  assert.throws(() => summarize(collection, window), /restricted contributions present/);
});

const malformed = (mutate) => {
  const collection = fixture();
  mutate(collection);
  return () => summarize(collection, window);
};

test('malformed responses fail instead of rendering wrong numbers', () => {
  const cases = {
    'missing total': (c) => delete c.totalCommitContributions,
    'null total': (c) => (c.totalPullRequestContributions = null),
    'negative total': (c) => (c.totalIssueContributions = -1),
    'fractional total': (c) => (c.totalPullRequestReviewContributions = 1.5),
    'missing restricted count': (c) => delete c.restrictedContributionsCount,
    'missing calendar': (c) => (c.contributionCalendar = null),
    'empty weeks': (c) => (c.contributionCalendar.weeks = []),
    'non-numeric day count': (c) => (c.contributionCalendar.weeks[0].contributionDays[0].contributionCount = '3'),
    'bad day date': (c) => (c.contributionCalendar.weeks[0].contributionDays[0].date = 'Dec 1'),
    'empty chart with nonzero totals': (c) => c.contributionCalendar.weeks.forEach((w) => w.contributionDays.forEach((d) => (d.contributionCount = 0))),
  };
  for (const [name, mutate] of Object.entries(cases)) {
    assert.throws(malformed(mutate), /malformed response/, name);
  }
});

test('an all-quiet year is valid', () => {
  const card = malformed((c) => {
    c.totalCommitContributions = c.totalPullRequestContributions = c.totalPullRequestReviewContributions = c.totalIssueContributions = 0;
    c.contributionCalendar.weeks.forEach((w) => w.contributionDays.forEach((d) => (d.contributionCount = 0)));
  })();
  assert.deepEqual(card.monthly, new Array(12).fill(0));
});
