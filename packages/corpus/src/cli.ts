/**
 * `pnpm import [book]` — rebuild `packages/web/public/corpus/aeneid-<book>.json`
 * (default book 1) from the committed TEI text.
 *
 * Requires the morpheus container (`pnpm morpheus:up`) unless every
 * needed form is already in the on-disk cache. The raw-response cache at
 * `texts/cache/analyses.json` is committed, so re-runs over an unchanged
 * text and unchanged morpheus are offline and reproducible.
 *
 * The import also computes the sentence alignment to the Williams
 * translation (both TEI files committed under texts/) and persists it
 * to `texts/cache/translation-alignment.json` — committed, reviewable
 * data that feeds the translation tiebreaker of the disambiguator.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { morpheusFetch } from './analyze.js';
import { alignBookSentences, extractEnglishBook } from './disambiguate/alignment.js';
import { buildPassage } from './pipeline.js';
import { extractBook } from './tei.js';
import { segmentSentences } from './sentences.js';
import { extractWords } from './tokenize.js';
import { validatePassage } from './validate.js';

const TEI_URL = new URL('../../../texts/vergil-aeneid.tei.xml', import.meta.url);
const ENG_TEI_URL = new URL('../../../texts/vergil-aeneid-eng.tei.xml', import.meta.url);
const CACHE_URL = new URL('../../../texts/cache/analyses.json', import.meta.url);
const ALIGNMENT_URL = new URL('../../../texts/cache/translation-alignment.json', import.meta.url);
const OUT_DIR = fileURLToPath(new URL('../../web/public/corpus/', import.meta.url));
const TEI_PATH = fileURLToPath(TEI_URL);
const ENG_TEI_PATH = fileURLToPath(ENG_TEI_URL);
const CACHE_PATH = fileURLToPath(CACHE_URL);
const ALIGNMENT_PATH = fileURLToPath(ALIGNMENT_URL);

const MORPHEUS_URL = process.env['MORPHEUS_URL'] ?? 'http://localhost:1315';

const book = Number(process.argv[2] ?? '1');
if (!Number.isInteger(book) || book < 1 || book > 12) {
  console.error(`usage: pnpm import [book 1..12] (got "${process.argv[2] ?? ''}")`);
  process.exit(1);
}

const SOURCE = {
  name: `Vergil, Aeneid, Book ${book} (TEI XML, phi0690.phi003.perseus-lat2)`,
  url: 'https://github.com/PerseusDL/canonical-latinlit/blob/master/data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml',
  license: 'CC BY-SA 4.0 — Perseus Digital Library (PerseusDL/canonical-latinlit)',
} as const;

const OUT_PATH = join(OUT_DIR, `aeneid-${book}.json`);

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

/** The committed alignment cache: { books: { "1": [ {lineStart, lineEnd, text} | null, … ] } }. */
interface AlignmentCache {
  books: Record<string, readonly (null | { lineStart: number; lineEnd: number; text: string })[]>;
}

async function saveAlignment(
  book: number,
  sentences: readonly (null | { lineStart: number; lineEnd: number; text: string })[],
): Promise<void> {
  let existing: AlignmentCache = { books: {} };
  try {
    existing = JSON.parse(await readFile(ALIGNMENT_PATH, 'utf8')) as AlignmentCache;
    if (existing.books === undefined || typeof existing.books !== 'object') existing = { books: {} };
  } catch {
    // no cache yet — create it
  }
  existing.books[String(book)] = sentences;
  await mkdir(dirname(ALIGNMENT_PATH), { recursive: true });
  await writeFile(ALIGNMENT_PATH, `${JSON.stringify(existing, null, 1)}\n`);
}

async function main(): Promise<void> {
  console.log(`reading TEI: ${TEI_PATH}`);
  const xml = await readFile(TEI_PATH, 'utf8');
  const lines = extractBook(xml, book);
  const maxLine = Math.max(...lines.map((line) => line.n));
  console.log(`book ${book}: ${lines.length} lines (1–${maxLine})`);

  // Sentence alignment to the Williams translation (translation
  // tiebreaker evidence; committed as reviewable data).
  const rawSentences = segmentSentences(extractWords(lines));
  const englishBook = extractEnglishBook(await readFile(ENG_TEI_PATH, 'utf8'), book);
  const aligned = alignBookSentences(englishBook, maxLine, rawSentences);
  const translations = aligned.map((record) => record?.text ?? null);
  const alignedCount = translations.filter((text) => text !== null).length;
  console.log(
    `translation alignment: ${alignedCount}/${rawSentences.length} sentences aligned (Williams 1910)`,
  );
  await saveAlignment(book, aligned);

  const cache = await loadCache();
  const fetchRaw = morpheusFetch(MORPHEUS_URL);

  let lastSaved = 0;
  const result = await buildPassage({
    lines,
    source: { ...SOURCE },
    book,
    fetchRaw,
    cache,
    translations,
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
  const selectedPct = ((stats.selectedBySolver / Math.max(stats.ambiguousTokens, 1)) * 100).toFixed(1);
  const clauseAvg = (stats.subordinateClauses / Math.max(stats.sentences, 1)).toFixed(2);
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
  console.log(`selected         ${stats.selectedBySolver} by solver (${selectedPct}% of ${stats.ambiguousTokens} ambiguous tokens)`);
  console.log(`                 ${stats.selectedByTranslation} by translation`);
  console.log(`clauses          ${stats.subordinateClauses} subordinate (${clauseAvg}/sentence, ${stats.sentencesWithSubordinateClauses} sentences)`);
  if (stats.unanalyzedForms.length > 0) {
    console.log(`unanalyzed (${stats.unanalyzedForms.length}): ${stats.unanalyzedForms.join(', ')}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
