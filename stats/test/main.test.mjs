import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { run } from '../main.mjs';

const collection = JSON.parse(readFileSync(new URL('./fixtures/collection.json', import.meta.url), 'utf8'));
const now = new Date('2026-11-04T17:00:00Z');

function harness({ env = { STATS_TOKEN: 't0k' }, fetchImpl } = {}) {
  const writes = [];
  const logs = [];
  return {
    writes,
    logs,
    options: {
      env,
      now,
      fetchImpl: fetchImpl ?? (async () => new Response(JSON.stringify({ data: { user: { contributionsCollection: collection } } }), { status: 200 })),
      writeFile: async (path, content) => writes.push({ path, content }),
      log: (...args) => logs.push(args.join(' ')),
      logError: (...args) => logs.push(args.join(' ')),
    },
  };
}

test('happy path writes both files and returns 0', async () => {
  const h = harness();
  assert.equal(await run(h.options), 0);
  assert.deepEqual(h.writes.map((w) => w.path).sort(), ['assets/stats-card-dark.svg', 'assets/stats-card-light.svg']);
  assert.ok(h.writes.every((w) => w.content.includes('1,740')));
  assert.deepEqual(h.logs, ['Stats card updated']);
});

test('missing token -> 1, no writes', async () => {
  const h = harness({ env: {} });
  assert.equal(await run(h.options), 1);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.logs, ['STATS_TOKEN is not set']);
});

test('error text never reaches logs', async () => {
  const h = harness({
    fetchImpl: async () => {
      throw new Error('openreview/private-repo boom');
    },
  });
  assert.equal(await run(h.options), 1);
  assert.equal(h.writes.length, 0);
  assert.ok(!h.logs.join('\n').includes('private-repo'));
  assert.deepEqual(h.logs, ['Fetch failed: network']);
});

test('GraphQL error message never reaches logs', async () => {
  const body = { errors: [{ type: 'FORBIDDEN', message: 'openreview/private-repo' }] };
  const h = harness({ fetchImpl: async () => new Response(JSON.stringify(body), { status: 200 }) });
  assert.equal(await run(h.options), 1);
  assert.ok(!h.logs.join('\n').includes('private-repo'));
  assert.deepEqual(h.logs, ['Fetch failed: graphql FORBIDDEN']);
});

test('restricted contributions -> 1, no writes, fixed message', async () => {
  const restricted = { ...collection, restrictedContributionsCount: 2 };
  const h = harness({ fetchImpl: async () => new Response(JSON.stringify({ data: { user: { contributionsCollection: restricted } } }), { status: 200 }) });
  assert.equal(await run(h.options), 1);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.logs, ['Data check failed: restricted contributions present']);
});

test('a calendar with null days is a malformed response', async () => {
  const broken = { ...collection, contributionCalendar: { weeks: [{ contributionDays: null }] } };
  const h = harness({ fetchImpl: async () => new Response(JSON.stringify({ data: { user: { contributionsCollection: broken } } }), { status: 200 }) });
  assert.equal(await run(h.options), 1);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.logs, ['Data check failed: malformed response']);
});

test('malformed response -> 1, no writes, fixed message', async () => {
  const broken = { ...collection, totalCommitContributions: null };
  const h = harness({ fetchImpl: async () => new Response(JSON.stringify({ data: { user: { contributionsCollection: broken } } }), { status: 200 }) });
  assert.equal(await run(h.options), 1);
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.logs, ['Data check failed: malformed response']);
});

test('unexpected failure never leaks its message', async () => {
  const h = harness();
  h.options.writeFile = async () => {
    throw new Error('EACCES openreview/private-repo');
  };
  assert.equal(await run(h.options), 1);
  assert.deepEqual(h.logs, ['Unexpected failure']);
});
