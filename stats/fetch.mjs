export const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

export class StatsFetchError extends Error {
  constructor(kind, detail = '') {
    super(`Fetch failed: ${kind}${detail ? ` ${detail}` : ''}`);
    this.name = 'StatsFetchError';
    this.kind = kind;
    this.detail = detail;
  }
}

const SAFE_DETAIL = /^[A-Z0-9_]{1,40}$/;
const REQUEST_TIMEOUT_MS = 30_000;

export async function fetchContributions({ token, login, from, to, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'carlosmondra-stats-card' },
      body: JSON.stringify({ query: QUERY, variables: { login, from: from.toISOString(), to: to.toISOString() } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new StatsFetchError('network');
  }
  if (!response.ok) throw new StatsFetchError('http', String(response.status));

  let body;
  try {
    body = await response.json();
  } catch {
    throw new StatsFetchError('http', 'invalid-json');
  }
  if (body.errors?.length) {
    const type = String(body.errors[0].type ?? '');
    throw new StatsFetchError('graphql', SAFE_DETAIL.test(type) ? type : 'UNKNOWN');
  }
  const collection = body.data?.user?.contributionsCollection;
  if (!collection) throw new StatsFetchError('no-user');
  return collection;
}
