/**
 * Tokenization: verse lines → word tokens with attached punctuation and
 * enclitic splits.
 *
 * ## Punctuation model
 *
 * The TEI text of Aeneid 1 contains only `, ; . ? : — ! ( )` besides
 * letters and spaces. Words are split on whitespace; each whitespace
 * chunk is then cut into alternating letter-runs and punctuation-runs.
 * Punctuation attaches to the adjacent word:
 *
 * - a punctuation run AFTER a word (chunk-final) is that word's trailing
 *   `Token.punctuation`;
 * - a punctuation run BETWEEN two words inside one chunk (e.g. the em
 *   dashes of `socii—neque`, `additur,—Ilus`) attaches to the preceding
 *   word as trailing punctuation;
 * - a punctuation run BEFORE the first word of a chunk (only `(` occurs:
 *   `(infandum!)`, `(fabor`, `(neque`) attaches to the previous token's
 *   punctuation — unless that token already ended a sentence or there is
 *   no previous token, in which case it is dropped (the contract models
 *   trailing punctuation only).
 *
 * ## Enclitic splitting
 *
 * Morpheus does not consistently analyze enclitic-bearing forms: ordinary
 * `Xque` forms return parses of X alone (e.g. `virumque` → analyses of
 * `virum`), while a handful of enclitic compounds and lexicalized words
 * have their own dictionary entries (`namque`, `mecumque`, `mene`,
 * `tune`, `quodcumque`, `ubique`, `Iove`, `Solve`, `sine`). We therefore
 * split `-que` / `-ve` / `-ne` off with a layered rule:
 *
 * 1. geometric rule — the remainder after stripping the enclitic must be
 *    ≥ 2 letters and contain a vowel (so bare `que`/`ve`/`ne` are never
 *    split and vowelless crumbs like `immane → imma` are rejected…
 *    `imma` has a vowel; it is rejected by rule 3 instead);
 * 2. stoplist — words that are themselves lexical despite the ending:
 *    `sine` (prep), `Iove` (abl. of Iuppiter), `Solve` (imperative of
 *    solvo — its stem `sol` analyzes!), `nave`, `fave`, and the
 *    lexicalized adverbs `usque`, `undique`, `denique`, `ubique`,
 *    `quoque`;
 * 3. `-ne` allowlist — real `-ne` enclitics in this text are rare and
 *    the ending is also the ending of many ordinary words (every
 *    `-ine`/`-one` ablative: `numine`, `ordine`, `sanguine`…). `-ne` is
 *    split only for the attested interrogative forms: `mene`, `tune`,
 *    `tantaene`, `tantane`, `pallasne`, `hominesne`, `feraene`
 *    (extend this list for other books);
 * 4. lexicon-guided preference for `-que`/`-ve` — split when the stem
 *    is a known morpheus form (`virumque → virum`, `namque → nam`,
 *    `mecumque → mecum`); keep the whole word when the stem is unknown
 *    but the whole form is known (`quodcumque`, `quaecumque → quicumque`
 *    entries); when neither is known, split anyway (enclitic `-que` is
 *    overwhelmingly more likely, and the unanalyzable stem gets flagged
 *    by the UI either way).
 *
 * The split decision therefore needs to know which forms morpheus can
 * analyze — `isKnownForm` is injectable so tests run without network.
 *
 * `Token.form` keeps the SURFACE capitalization of the stem (morpheus is
 * case-insensitive for common words but returns nothing for lowercased
 * proper names), and `Token.text` keeps the full surface word including
 * the enclitic.
 */
import type { Token } from '@lego/shared';
import type { TeiLine } from './tei.js';

// ---------------------------------------------------------------------------
// Punctuation attachment
// ---------------------------------------------------------------------------

/** Characters that end a sentence (see sentences.ts). */
export const SENTENCE_TERMINATORS = '.;?!' as const;

export interface WordChunk {
  /** letters-only surface word (enclitic still attached) */
  text: string;
  /** trailing punctuation attached to this word (possibly '') */
  punctuation: string;
  /** verse line the word came from */
  line: number;
}

const LETTER_RUN = /[A-Za-z]+|[^A-Za-z]+/g;

const TERMINATORS: readonly string[] = ['.', ';', '?', '!'];

function endsSentence(punctuation: string): boolean {
  return TERMINATORS.some((ch) => punctuation.includes(ch));
}

/**
 * Split verse lines into word chunks with attached punctuation.
 * See the module doc for the attachment rules.
 */
export function extractWords(lines: readonly TeiLine[]): WordChunk[] {
  const words: WordChunk[] = [];
  /** punctuation waiting to attach to the next word (leading punct) */
  let pending = '';

  for (const line of lines) {
    for (const chunk of line.text.split(/\s+/)) {
      if (chunk === '') continue;
      const segments = chunk.match(LETTER_RUN) ?? [];
      for (const segment of segments) {
        if (/^[A-Za-z]+$/.test(segment)) {
          // A word: any pending punctuation is leading punctuation —
          // attach it to the previous word unless that word already
          // ended a sentence (then it belongs to this sentence and is
          // dropped: the contract has no leading-punctuation field).
          const previous = words[words.length - 1];
          if (pending !== '') {
            if (previous !== undefined && !endsSentence(previous.punctuation)) {
              previous.punctuation += pending;
            }
            pending = '';
          }
          words.push({ text: segment, punctuation: '', line: line.n });
        } else {
          pending += segment;
        }
      }
      // Chunk-final punctuation is trailing punctuation of this chunk's
      // last word. A punctuation-only chunk (none in this text) would
      // keep `pending` for the next word as leading punctuation.
      if (pending !== '') {
        const chunkHasWord = segments.some((s) => /^[A-Za-z]+$/.test(s));
        if (chunkHasWord) {
          const last = words[words.length - 1];
          if (last !== undefined) last.punctuation += pending;
          // else: the text starts with punctuation — drop it.
          pending = '';
        }
      }
    }
  }
  return words;
}

// ---------------------------------------------------------------------------
// Enclitics
// ---------------------------------------------------------------------------

/** The enclitic particles morpheus cannot reliably analyze attached. */
export const ENCLITICS = ['que', 've', 'ne'] as const;
export type Enclitic = (typeof ENCLITICS)[number];

/** Lexical words that merely end in an enclitic-shaped string (lowercase). */
export const ENCLITIC_STOPWORDS: ReadonlySet<string> = new Set([
  'sine', // preposition "without" (stem "si" analyzes — trap)
  'iove', // ablative of Iuppiter (stem "Io" analyzes — trap)
  'solve', // imperative of solvo (stem "Sol" analyzes — trap)
  'nave', // ablative of navis
  'fave', // imperative of faveo
  'usque', // lexicalized adverbs in -que
  'undique',
  'denique',
  'ubique',
  'quoque',
]);

/**
 * Attested interrogative `-ne` forms of this text (lowercase). Ordinary
 * words ending in -ne (all the -ine/-one ablatives, `magne`, `immane`,
 * `fine`, …) are NOT split.
 */
export const NE_ENCLITIC_ALLOWLIST: ReadonlySet<string> = new Set([
  'mene',
  'tune',
  'tantaene',
  'tantane',
  'pallasne',
  'hominesne',
  'feraene',
]);

export interface EncliticSplit {
  /** the form to send to morpheus (surface capitalization) */
  form: string;
  /** the enclitics split off, e.g. ["que"] */
  enclitics: Enclitic[];
}

const VOWEL = /[aeiouy]/i;

/**
 * Decide the enclitic split for one surface word. Returns null when the
 * word should be analyzed whole. `isKnownForm` reports whether morpheus
 * has analyses for a form (used by rule 4; injectable for tests).
 */
export function splitEnclitics(
  word: string,
  isKnownForm: (form: string) => boolean,
): EncliticSplit | null {
  const lower = word.toLowerCase();
  if (ENCLITIC_STOPWORDS.has(lower)) return null;

  for (const enclitic of ENCLITICS) {
    if (!lower.endsWith(enclitic)) continue;
    const stem = word.slice(0, -enclitic.length);
    // Rule 1 — geometric: a real stem, not a bare enclitic or crumb.
    if (stem.length < 2 || !VOWEL.test(stem)) return null;
    // Rule 3 — -ne only for attested interrogative forms.
    if (enclitic === 'ne' && !NE_ENCLITIC_ALLOWLIST.has(lower)) return null;
    // Rule 4 — lexicon-guided preference for -que / -ve.
    if (enclitic !== 'ne' && !isKnownForm(stem) && isKnownForm(word)) return null;
    return { form: stem, enclitics: [enclitic] };
  }
  return null;
}

/**
 * All forms that must be looked up to tokenize `word`: the surface form
 * and, for geometric enclitic candidates, the stem. (The stoplist and
 * allowlist are static and need no lookups.)
 */
export function candidateForms(word: string): string[] {
  const lower = word.toLowerCase();
  if (ENCLITIC_STOPWORDS.has(lower)) return [word];
  for (const enclitic of ENCLITICS) {
    if (!lower.endsWith(enclitic)) continue;
    const stem = word.slice(0, -enclitic.length);
    if (stem.length < 2 || !VOWEL.test(stem)) break;
    if (enclitic === 'ne' && !NE_ENCLITIC_ALLOWLIST.has(lower)) break;
    return [word, stem];
  }
  return [word];
}

/**
 * Build the final `Token` for a word chunk given the lexicon. Enclitic
 * split tokens keep the full surface in `text` and the stem in `form`.
 */
export function toToken(word: WordChunk, index: number, isKnownForm: (form: string) => boolean): Token {
  const split = splitEnclitics(word.text, isKnownForm);
  const token: Token = {
    index,
    text: word.text,
    form: split ? split.form : word.text,
    line: word.line,
  };
  if (word.punctuation !== '') token.punctuation = word.punctuation;
  if (split) token.enclitics = [...split.enclitics];
  return token;
}
