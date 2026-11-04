import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCard } from '../render.mjs';

const card = (overrides = {}) => ({
  rangeLabel: 'Dec 2025 – Nov 2026',
  updated: '2026-11-04',
  totals: { commits: 1740, prs: 449, reviews: 453, issues: 99 },
  monthly: [120, 140, 90, 160, 130, 180, 150, 200, 210, 190, 170, 60],
  monthLabels: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  ...overrides,
});

const count = (text, needle) => text.split(needle).length - 1;

test('shows exact copy', () => {
  const svg = renderCard(card(), 'light');
  for (const text of ['Last 12 months', 'Dec 2025 – Nov 2026', '1,740', 'commits', 'PRs opened', 'PRs reviewed', 'issues', 'Includes private contributions · Updated 2026-11-04']) {
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

test('renders no language section', () => {
  const svg = renderCard(card(), 'light');
  assert.doesNotMatch(svg, /class="lang"|<circle|No language data|%/);
});

test('themes differ', () => {
  const light = renderCard(card(), 'light');
  const dark = renderCard(card(), 'dark');
  assert.ok(light.includes('#ffffff') && !light.includes('#0d1117'));
  assert.ok(dark.includes('#0d1117') && !dark.includes('#ffffff'));
});
