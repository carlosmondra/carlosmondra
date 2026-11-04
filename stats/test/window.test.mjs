import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindow } from '../window.mjs';

test('mid-month window spans 12 calendar months', () => {
  const w = computeWindow(new Date('2026-11-04T17:00:00Z'));
  assert.equal(w.from.toISOString(), '2025-12-01T00:00:00.000Z');
  assert.equal(w.to.toISOString(), '2026-11-04T17:00:00.000Z');
  assert.equal(w.months.length, 12);
  assert.deepEqual([w.months[0].key, w.months[11].key], ['2025-12', '2026-11']);
  assert.deepEqual([w.months[0].label, w.months[11].label], ['Dec', 'Nov']);
  assert.equal(w.rangeLabel, 'Dec 2025 – Nov 2026');
  assert.equal(w.updated, '2026-11-04');
});

test('January 1st crosses the year boundary', () => {
  const w = computeWindow(new Date('2026-01-01T00:05:00Z'));
  assert.equal(w.from.toISOString(), '2025-02-01T00:00:00.000Z');
  assert.equal(w.months[11].key, '2026-01');
  assert.equal(w.rangeLabel, 'Feb 2025 – Jan 2026');
});

test('last day of a 31-day month does not skip a short month', () => {
  const w = computeWindow(new Date('2026-03-31T23:59:59Z'));
  assert.deepEqual(w.months.map((m) => m.key).slice(-2), ['2026-02', '2026-03']);
  assert.equal(w.from.toISOString(), '2025-04-01T00:00:00.000Z');
});
