/**
 * The import pipeline: TEI lines → words → sentences → analyses →
 * groups + reading order → `Passage`.
 *
 * Pure orchestration — all I/O (file reads, HTTP) is injected, so the
 * whole pipeline is testable without network (`fetchRaw` fixture maps).
 *
 * Analysis results are keyed by the EXACT queried form, with a
 * case-fallback: morpheus is case-sensitive in BOTH directions — some
 * capitalized common words return nothing ("Vix", "Vina", "Vesper" fail
 * while "vix", "vina", "vesper" parse) and lowercased proper names
 * return nothing ("syrtis" fails while "Syrtis" parses). Each form is
 * queried with its surface capitalization first; when that comes back
 * empty, the lowercased and re-capitalized variants are tried, and the
 * token's form becomes whichever variant morpheus answered — so the
 * `Passage.analyses` map is always keyed by a string that was actually
 * queried and answered (the frontend looks up analyses by token.form).
 */
import { parseMorpheus } from '@lego/shared';
import type { MorpheusAnalysis, Passage, PassageSource, Sentence, Token } from '@lego/shared';
import { analyzeForms } from './analyze.js';
import type { RawFetch } from './analyze.js';
import { buildGroups } from './groups.js';
import { buildOrder } from './order.js';
import { segmentSentences } from './sentences.js';
import type { TeiLine } from './tei.js';
import { candidateForms, extractWords, toToken } from './tokenize.js';

/** The bare enclitic forms, always included in the analyses map. */
export const BARE_ENCLITICS = ['que', 've', 'ne'] as const;

export interface BuildOptions {
  lines: readonly TeiLine[];
  source: PassageSource;
  fetchRaw: RawFetch;
  /** form → raw morpheus body; updated in place with newly fetched forms */
  cache: Record<string, string>;
  onProgress?: (done: number, total: number) => void;
}

export interface BuildResult {
  passage: Passage;
  /** the updated raw-body cache (same object passed in options) */
  cache: Record<string, string>;
  stats: {
    lines: number;
    sentences: number;
    tokens: number;
    distinctForms: number;
    analyzedForms: number;
    ambiguousForms: number;
    unanalyzedForms: string[];
    groups: number;
    agreementGroups: number;
    subjectVerbGroups: number;
    encliticSplits: number;
  };
}

export async function buildPassage(options: BuildOptions): Promise<BuildResult> {
  const { lines, source, fetchRaw, cache } = options;

  // 1. Tokenize (punctuation attached) and segment sentences.
  const words = extractWords(lines);
  const rawSentences = segmentSentences(words);

  // 2. Collect every distinct form morpheus must see: each surface word,
  //    each geometric enclitic candidate's stem, and the bare enclitics.
  //    Keyed by exact surface string (capitalization preserved).
  const queryForms = new Set<string>(BARE_ENCLITICS);
  for (const word of words) {
    for (const form of candidateForms(word.text)) queryForms.add(form);
  }

  // 3. Fetch (or reuse from cache) the raw responses. Forms that come
  //    back empty get a second chance through their case variants
  //    (lowercased / re-capitalized) — see the module doc.
  await analyzeForms([...queryForms], {
    fetchRaw,
    cache,
    onProgress: options.onProgress,
  });
  const caseVariants = new Set<string>();
  for (const form of queryForms) {
    if (parseMorpheus(cache[form] ?? '').length > 0) continue;
    for (const variant of [form.toLowerCase(), capitalize(form)]) {
      if (variant !== form && !(variant in cache)) caseVariants.add(variant);
    }
  }
  if (caseVariants.size > 0) {
    await analyzeForms([...caseVariants], { fetchRaw, cache });
  }

  const rawAnalyses: Record<string, string> = cache;
  /** The variant of a form that morpheus actually answered. */
  const resolveForm = (form: string): string => {
    if (parseMorpheus(rawAnalyses[form] ?? '').length > 0) return form;
    for (const variant of [form.toLowerCase(), capitalize(form)]) {
      if (variant !== form && parseMorpheus(rawAnalyses[variant] ?? '').length > 0) return variant;
    }
    return form; // unknown to morpheus under every capitalization
  };
  const isKnownForm = (form: string): boolean =>
    parseMorpheus(rawAnalyses[resolveForm(form)] ?? '').length > 0;

  // 4. Finalize tokens (enclitic splits via the lexicon, case fallback
  //    on the final form) and per-sentence groups + reading order.
  const sentences: Sentence[] = [];
  const analyses: Record<string, MorpheusAnalysis[]> = {};
  let encliticSplits = 0;

  for (const raw of rawSentences) {
    const tokens: Token[] = raw.words.map((word, index) => {
      const token = toToken(word, index, isKnownForm);
      token.form = resolveForm(token.form);
      if (token.enclitics !== undefined) encliticSplits += 1;
      return token;
    });
    const groups = buildGroups(tokens, analysesForTokens(tokens, rawAnalyses));
    const order = buildOrder(tokens, analysesForTokens(tokens, rawAnalyses));
    sentences.push({
      index: raw.index,
      lineStart: raw.lineStart,
      lineEnd: raw.lineEnd,
      tokens,
      groups,
      order,
    });
  }

  // 5. The output analyses map: exactly the forms the tokens use (already
  //    case-resolved), plus the bare enclitics. Parsed once per form.
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (!(token.form in analyses)) analyses[token.form] = parseMorpheus(rawAnalyses[token.form] ?? '');
    }
  }
  for (const enclitic of BARE_ENCLITICS) {
    if (!(enclitic in analyses)) analyses[enclitic] = parseMorpheus(rawAnalyses[resolveForm(enclitic)] ?? '');
  }

  const passage: Passage = {
    work: 'Vergil',
    book: 1,
    title: 'Aeneid',
    sentences,
    analyses,
    source,
  };

  const stats = computeStats(passage, rawSentences.length, encliticSplits);
  return { passage, cache, stats };
}

/** First letter uppercased ("syrtis" → "Syrtis"). */
function capitalize(form: string): string {
  return form.charAt(0).toUpperCase() + form.slice(1);
}

/** Parse the raw analyses of exactly the forms these tokens use. */
function analysesForTokens(  tokens: readonly Token[],
  rawAnalyses: Record<string, string>,
): Record<string, MorpheusAnalysis[]> {
  const map: Record<string, MorpheusAnalysis[]> = {};
  for (const token of tokens) {
    if (!(token.form in map)) map[token.form] = parseMorpheus(rawAnalyses[token.form] ?? '');
  }
  return map;
}

function computeStats(
  passage: Passage,
  sentenceCount: number,
  encliticSplits: number,
): BuildResult['stats'] {
  let tokens = 0;
  const forms = Object.keys(passage.analyses);
  const unanalyzed: string[] = [];
  let ambiguous = 0;
  for (const sentence of passage.sentences) tokens += sentence.tokens.length;
  for (const form of forms) {
    const analyses = passage.analyses[form] ?? [];
    if (analyses.length === 0) unanalyzed.push(form);
    else if (analyses.length > 1) ambiguous += 1;
  }
  const groups = passage.sentences.flatMap((sentence) => sentence.groups);
  return {
    lines: Math.max(...passage.sentences.map((sentence) => sentence.lineEnd), 0),
    sentences: sentenceCount,
    tokens,
    distinctForms: forms.length,
    analyzedForms: forms.length - unanalyzed.length,
    ambiguousForms: ambiguous,
    unanalyzedForms: unanalyzed,
    groups: groups.length,
    agreementGroups: groups.filter((group) => group.kind === 'agreement').length,
    subjectVerbGroups: groups.filter((group) => group.kind === 'subject-verb').length,
    encliticSplits,
  };
}
