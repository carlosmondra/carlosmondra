import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeWindow } from '../window.mjs';
import { summarize } from '../summarize.mjs';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/collection.json', import.meta.url), 'utf8'));
const window = computeWindow(new Date('2026-11-04T17:00:00Z'));

const repo = (commits, edges) => ({
  contributions: { totalCount: commits },
  repository: { languages: { totalSize: edges.reduce((sum, [, size]) => sum + size, 0), edges: edges.map(([name, size]) => ({ size, node: { name, color: '#000000' } })) } },
});

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

test('language mix weights repo byte share by commit count', () => {
  const card = summarize(fixture(), window);
  assert.deepEqual(card.languages, [
    { name: 'JavaScript', color: '#f1e05a', percent: 50 },
    { name: 'Python', color: '#3572A5', percent: 50 },
  ]);
});

test('excluded languages and empty repos are ignored', () => {
  const collection = fixture();
  collection.commitContributionsByRepository = [repo(10, [['HTML', 500]]), repo(5, []), repo(3, [['Go', 10]])];
  const card = summarize(collection, window);
  assert.deepEqual(card.languages, [{ name: 'Go', color: '#000000', percent: 100 }]);
});

test('more than 4 languages -> top 3 + Other and percents sum to exactly 100', () => {
  const collection = fixture();
  collection.commitContributionsByRepository = [repo(1, [['A', 30], ['B', 25], ['C', 20], ['D', 15], ['E', 10]])];
  const card = summarize(collection, window);
  assert.deepEqual(card.languages.map((l) => l.name), ['A', 'B', 'C', 'Other']);
  assert.equal(card.languages[3].color, '#8c959f');
  assert.deepEqual(card.languages.map((l) => l.percent), [30, 25, 20, 25]);

  collection.commitContributionsByRepository = [repo(1, [['A', 1], ['B', 1], ['C', 1]])];
  const thirds = summarize(collection, window).languages.map((l) => l.percent);
  assert.equal(thirds.reduce((a, b) => a + b, 0), 100);
});

test('exactly 4 languages are all shown without Other', () => {
  const collection = fixture();
  collection.commitContributionsByRepository = [repo(1, [['A', 40], ['B', 30], ['C', 20], ['D', 10]])];
  assert.deepEqual(summarize(collection, window).languages.map((l) => l.name), ['A', 'B', 'C', 'D']);
});

test('no languages at all -> languages is []', () => {
  const collection = fixture();
  collection.commitContributionsByRepository = [];
  assert.deepEqual(summarize(collection, window).languages, []);
});

test('restricted contributions fail loudly', () => {
  const collection = fixture();
  collection.restrictedContributionsCount = 3;
  assert.throws(() => summarize(collection, window), /restricted contributions present/);
});
