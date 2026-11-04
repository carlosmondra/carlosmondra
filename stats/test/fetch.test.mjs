import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUERY, StatsFetchError, fetchContributions } from '../fetch.mjs';

const args = {
  token: 't0k',
  login: 'carlosmondra',
  from: new Date('2025-12-01T00:00:00Z'),
  to: new Date('2026-11-04T17:00:00Z'),
};

const respond = (status, body) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

async function rejection(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  assert.fail('expected a rejection');
}

test('QUERY never selects repository identity', () => {
  const compact = QUERY.replace(/\s+/g, '');
  const afterRepository = compact.slice(compact.indexOf('repository{') + 'repository{'.length);
  assert.ok(afterRepository.startsWith('languages('));
  assert.doesNotMatch(QUERY, /nameWithOwner|\burl\b|\bowner\b|\bid\b/);
});

test('sends bearer token and ISO variables', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ data: { user: { contributionsCollection: { totalCommitContributions: 1 } } } }), { status: 200 });
  };
  const collection = await fetchContributions({ ...args, fetchImpl });
  assert.equal(captured.url, 'https://api.github.com/graphql');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers.Authorization, 'bearer t0k');
  assert.deepEqual(JSON.parse(captured.init.body).variables, {
    login: 'carlosmondra',
    from: '2025-12-01T00:00:00.000Z',
    to: '2026-11-04T17:00:00.000Z',
  });
  assert.deepEqual(collection, { totalCommitContributions: 1 });
});

test('401 -> StatsFetchError kind http detail 401', async () => {
  const err = await rejection(fetchContributions({ ...args, fetchImpl: respond(401, 'secret-body') }));
  assert.ok(err instanceof StatsFetchError);
  assert.equal(err.kind, 'http');
  assert.equal(err.detail, '401');
  assert.ok(!err.message.includes('secret-body'));
});

test('GraphQL errors -> kind graphql, detail is errors[0].type', async () => {
  const body = { errors: [{ type: 'FORBIDDEN', message: 'openreview/private-repo denied' }] };
  const err = await rejection(fetchContributions({ ...args, fetchImpl: respond(200, body) }));
  assert.equal(err.kind, 'graphql');
  assert.equal(err.detail, 'FORBIDDEN');
  assert.ok(!err.message.includes('private-repo'));
});

test('null user -> kind no-user', async () => {
  const err = await rejection(fetchContributions({ ...args, fetchImpl: respond(200, { data: { user: null } }) }));
  assert.equal(err.kind, 'no-user');
});

test('network failure -> kind network', async () => {
  const fetchImpl = async () => {
    throw new Error('getaddrinfo openreview/private-repo');
  };
  const err = await rejection(fetchContributions({ ...args, fetchImpl }));
  assert.equal(err.kind, 'network');
  assert.ok(!err.message.includes('private-repo'));
  assert.equal(err.cause, undefined);
});
