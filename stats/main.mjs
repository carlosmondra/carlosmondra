import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { computeWindow } from './window.mjs';
import { fetchContributions, StatsFetchError } from './fetch.mjs';
import { DataCheckError, summarize } from './summarize.mjs';
import { renderCard } from './render.mjs';

const LOGIN = 'carlosmondra';
const THEMES = ['light', 'dark'];

// Workflow logs of a public repo are public: only fixed strings may be printed, never an error's own message.
export async function run({ env, now = new Date(), fetchImpl = fetch, writeFile, log = console.log, logError = console.error, outDir = 'assets' }) {
  const token = env.STATS_TOKEN;
  if (!token) {
    logError('STATS_TOKEN is not set');
    return 1;
  }

  try {
    const window = computeWindow(now);
    const collection = await fetchContributions({ token, login: LOGIN, from: window.from, to: window.to, fetchImpl });
    const card = summarize(collection, window);
    const svgs = THEMES.map((theme) => [join(outDir, `stats-card-${theme}.svg`), renderCard(card, theme)]);
    for (const [path, svg] of svgs) await writeFile(path, svg);
  } catch (err) {
    if (err instanceof StatsFetchError) logError(err.message);
    else if (err instanceof DataCheckError) logError(`Data check failed: ${err.message}`);
    else logError('Unexpected failure');
    return 1;
  }

  log('Stats card updated');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await run({ env: process.env, writeFile: fs.writeFile });
}
