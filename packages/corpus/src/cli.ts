/**
 * `pnpm import` — rebuild `packages/web/public/corpus/aeneid-1.json`
 * from the committed TEI text.
 *
 * Requires the morpheus container (`pnpm morpheus:up`) unless every
 * needed form is already in the on-disk cache. The raw-response cache at
 * `texts/cache/analyses.json` is committed, so re-runs over an unchanged
 * text and unchanged morpheus are offline and reproducible.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { morpheusFetch } from './analyze.js';
import { buildPassage } from './pipeline.js';
import { extractBook } from './tei.js';
import { validatePassage } from './validate.js';

const TEI_URL = new URL('../../../texts/vergil-aeneid.tei.xml', import.meta.url);
const CACHE_URL = new URL('../../../texts/cache/analyses.json', import.meta.url);
const OUT_DIR = fileURLToPath(new URL('../../web/public/corpus/', import.meta.url));
const TEI_PATH = fileURLToPath(TEI_URL);
const CACHE_PATH = fileURLToPath(CACHE_URL);
const OUT_PATH = join(OUT_DIR, 'aeneid-1.json');

const MORPHEUS_URL = process.env['MORPHEUS_URL'] ?? 'http://localhost:1315';

const SOURCE = {
  name: 'Vergil, Aeneid, Book 1 (TEI XML, phi0690.phi003.perseus-lat2)',
  url: 'https://github.com/PerseusDL/canonical-latinlit/blob/master/data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml',
  license: 'CC BY-SA 4.0 — Perseus Digital Library (PerseusDL/canonical-latinlit)',
} as const;

async function loadCache(): Promise<Record<string, string>> {
  try {
    const text = await readFile(CACHE_PATH, 'utf8');
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return {}; // no cache yet — first run
  }
}

async function saveCache(cache: Record<string, string>): Promise<void> {
  const forms = Object.keys(cache).sort();
  const sorted: Record<string, string> = {};
  for (const form of forms) sorted[form] = cache[form] ?? '';
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
}

async function main(): Promise<void> {
  console.log(`reading TEI: ${TEI_PATH}`);
  const xml = await readFile(TEI_PATH, 'utf8');
  const lines = extractBook(xml, 1);
  const maxLine = Math.max(...lines.map((line) => line.n));
  console.log(`book 1: ${lines.length} lines (1–${maxLine})`);

  const cache = await loadCache();
  const fetchRaw = morpheusFetch(MORPHEUS_URL);

  let lastSaved = 0;
  const result = await buildPassage({
    lines,
    source: { ...SOURCE },
    fetchRaw,
    cache,
    onProgress: (done, total) => {
      if (done % 50 === 0) process.stdout.write(`  morpheus ${done}/${total}\r`);
      if (done - lastSaved >= 250) {
        lastSaved = done;
        void saveCache(cache).catch(() => undefined); // crash-safety, best effort
      }
    },
  });
  console.log();

  const errors = validatePassage(result.passage, {
    maxLine,
    allowedExtraAnalyses: ['que', 've', 'ne'],
  });
  if (errors.length > 0) {
    console.error(`validation failed with ${errors.length} problems:`);
    for (const error of errors.slice(0, 30)) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  await saveCache(cache);
  await mkdir(OUT_DIR, { recursive: true });
  const json = `${JSON.stringify(result.passage, null, 2)}\n`;
  await writeFile(OUT_PATH, json);

  const { stats } = result;
  const kb = (json.length / 1024).toFixed(0);
  const analyzedPct = ((stats.analyzedForms / stats.distinctForms) * 100).toFixed(1);
  console.log(`wrote ${OUT_PATH} (${kb} KB)`);
  console.log('--- stats ---');
  console.log(`lines            ${stats.lines}`);
  console.log(`sentences        ${stats.sentences}`);
  console.log(`tokens           ${stats.tokens}`);
  console.log(`enclitic splits  ${stats.encliticSplits}`);
  console.log(`distinct forms   ${stats.distinctForms} (incl. bare que/ve/ne)`);
  console.log(`analyzed forms   ${stats.analyzedForms}/${stats.distinctForms} (${analyzedPct}%)`);
  console.log(`ambiguous forms  ${stats.ambiguousForms}`);
  console.log(`groups           ${stats.groups} (agreement ${stats.agreementGroups}, subject-verb ${stats.subjectVerbGroups})`);
  if (stats.unanalyzedForms.length > 0) {
    console.log(`unanalyzed (${stats.unanalyzedForms.length}): ${stats.unanalyzedForms.join(', ')}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
