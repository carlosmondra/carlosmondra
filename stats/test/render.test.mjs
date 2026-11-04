import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCard } from '../render.mjs';

const card = (overrides = {}) => ({
  rangeLabel: 'Dec 2025 – Nov 2026',
  updated: '2026-11-04',
  totals: { commits: 1740, prs: 449, reviews: 453, issues: 99 },
  monthly: [120, 140, 90, 160, 130, 180, 150, 200, 210, 190, 170, 60],
  monthLabels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  languages: [
    { name: 'JavaScript', color: '#f1e05a', percent: 81 },
    { name: 'Python', color: '#3572A5', percent: 14 },
    { name: 'Shell', color: '#89e051', percent: 5 },
  ],
  ...overrides,
});

const count = (text, needle) => text.split(needle).length - 1;

test('shows exact copy', () => {
  const svg = renderCard(card(), 'light');
  for (const text of ['Last 12 months', 'Dec 2025 – Nov 2026', '1,740', 'commits', 'PRs opened', 'PRs reviewed', 'issues', 'JavaScript 81%', 'Includes private contributions · Updated 2026-11-04']) {
    assert.ok(svg.includes(text), `missing ${text}`);
  }
  assert.ok(svg.startsWith('<svg'));
  assert.match(svg, /width="480"/);
});

test('draws 12 bars', () => {
  assert.equal(count(renderCard(card(), 'light'), 'class="bar"'), 12);
});

test('all-zero months render', () => {
  const svg = renderCard(card({ monthly: new Array(12).fill(0) }), 'light');
  assert.equal(count(svg, 'class="bar"'), 12);
  assert.doesNotMatch(svg, /NaN|Infinity/);
  assert.doesNotMatch(svg, /height="-/);
});

test('escapes language names', () => {
  const languages = [
    { name: '<Foo>', color: '#111111', percent: 40 },
    { name: "Ren'Py", color: '#222222', percent: 30 },
    { name: 'C++', color: '#333333', percent: 20 },
    { name: 'F#', color: '#444444', percent: 10 },
  ];
  const svg = renderCard(card({ languages }), 'light');
  assert.ok(svg.includes('&lt;Foo&gt;'));
  assert.ok(!svg.includes('<Foo>'));
  assert.ok(svg.includes('Ren&apos;Py'));
  assert.ok(svg.includes('C++'));
  assert.ok(svg.includes('F#'));
});

test('empty languages -> "No language data"', () => {
  const svg = renderCard(card({ languages: [] }), 'light');
  assert.ok(svg.includes('No language data'));
  assert.equal(count(svg, 'class="lang"'), 0);
});

test('themes differ', () => {
  const light = renderCard(card(), 'light');
  const dark = renderCard(card(), 'dark');
  assert.ok(light.includes('#ffffff') && !light.includes('#0d1117'));
  assert.ok(dark.includes('#0d1117') && !dark.includes('#ffffff'));
});

test('legend entries align to the totals columns', () => {
  const languages = ['A', 'B', 'C', 'D'].map((name) => ({ name, color: '#111111', percent: 25 }));
  const svg = renderCard(card({ languages }), 'light');
  const centers = [...svg.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(centers, [24, 134, 244, 354]);
});

test('long language names are truncated to fit their column', () => {
  const languages = [{ name: 'Objective-C++ Extended Dialect', color: '#111111', percent: 100 }];
  const svg = renderCard(card({ languages }), 'light');
  assert.ok(svg.includes('Objective-… 100%'));
  assert.ok(renderCard(card({ languages: [{ name: 'JavaScript', color: '#111111', percent: 100 }] }), 'light').includes('JavaScript 100%'));
});
