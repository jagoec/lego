/**
 * lego data contract — the source of truth for every package.
 *
 * If you change anything in this file, you must update packages/api,
 * packages/corpus, and packages/web (and their tests) to match.
 */

// ---------------------------------------------------------------------------
// Morphology vocabulary
// ---------------------------------------------------------------------------

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'conjunction'
  | 'preposition'
  | 'pronoun'
  | 'particle'
  | 'numeral'
  | 'interjection'
  | 'name'
  | 'irregular';

export const LATIN_CASES = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'] as const;
export type LatinCase = (typeof LATIN_CASES)[number];

export type LatNumber = 'sg' | 'pl' | 'dual';
export type Gender = 'masc' | 'fem' | 'neut' | 'common';

export type Tense = 'pres' | 'imperf' | 'fut' | 'perf' | 'plup' | 'futp';
export type Mood =
  | 'ind'
  | 'subj'
  | 'imperat'
  | 'inf'
  | 'part'
  | 'ger'
  | 'gerundive'
  | 'supine';
export type Voice = 'active' | 'passive';
export type Person = '1st' | '2nd' | '3rd';
export type Degree = 'positive' | 'comparative' | 'superlative';

// ---------------------------------------------------------------------------
// Morpheus analysis
// ---------------------------------------------------------------------------

/**
 * A single parse of a word form, as produced by morpheus and normalized
 * by the parser in packages/shared/src/morpheus.ts.
 *
 * Slash groups in morpheus output (e.g. `nom/voc/acc`, `nom/voc/acc dual`)
 * become arrays; singletons are still arrays for uniformity. Verbal
 * categories are single-valued (a verb parse has one tense, one mood…).
 *
 * `features` preserves anything the normalizer did not recognize,
 * verbatim, so no information is silently dropped.
 */
export interface MorpheusAnalysis {
  pos: PartOfSpeech;
  /** headword / lemma, e.g. "femina" */
  lemma: string;

  // nominal categories
  cases?: LatinCase[];
  numbers?: LatNumber[];
  genders?: Gender[];

  // verbal categories
  tense?: Tense;
  mood?: Mood;
  voice?: Voice;
  persons?: Person[];

  // adjectival category
  degree?: Degree;

  /** morpheus stem identifier, e.g. "us_i", "ow_pr", "a_ae" */
  stem?: string;
  /** dialect / style flags from morpheus, e.g. "poetic", "contr" */
  features: string[];
}

/** Analyses for one word form (usually 1, often several for ambiguous forms). */
export interface FormAnalysis {
  form: string;
  analyses: MorpheusAnalysis[];
}

// ---------------------------------------------------------------------------
// Corpus model
// ---------------------------------------------------------------------------

/** A word token within a sentence. */
export interface Token {
  /** index within the sentence */
  index: number;
  /** surface text as displayed, e.g. "feminaeque" */
  text: string;
  /** the form sent to morpheus (enclitics removed, lowercased), e.g. "feminae" */
  form: string;
  /** verse line number */
  line: number;
  /** trailing punctuation attached to this token, e.g. "," */
  punctuation?: string;
  /** enclitics split off before analysis ("-que", "-ve", "-ne") */
  enclitics?: string[];
}

export type GroupKind = 'agreement' | 'subject-verb' | 'manual';

/** Words that belong together (highlighted jointly in the UI). */
export interface Group {
  kind: GroupKind;
  /** token indices within the sentence */
  tokenIndices: number[];
  /** human-readable description of what matched, e.g. "fem acc sg" */
  matched?: string;
}

/** One sense-unit in the reading-order view of a sentence. */
export interface Chunk {
  /** 1-based position in reading order */
  order: number;
  /** optional label, e.g. "subject", "verb", "phrase" */
  label?: string;
  tokenIndices: number[];
}

export interface Sentence {
  index: number;
  lineStart: number;
  lineEnd: number;
  tokens: Token[];
  groups: Group[];
  order: Chunk[];
}

export interface PassageSource {
  name: string;
  url: string;
  license: string;
}

/**
 * A complete, precomputed passage. `analyses` is keyed by word form and
 * shared across all tokens with that form (the vocabulary of Aeneid 1 is
 * small; this keeps the JSON compact and hover lookups instant).
 */
export interface Passage {
  work: string;
  book: number;
  title: string;
  sentences: Sentence[];
  /** form → analyses for every distinct form in the passage */
  analyses: Record<string, MorpheusAnalysis[]>;
  source: PassageSource;
}

// ---------------------------------------------------------------------------
// Assistance levels (web)
// ---------------------------------------------------------------------------

/**
 * 1 — part of speech only
 * 2 — full morphology + lemma
 * 3 — principal parts / declension pattern (no English)
 * 4 — click-to-reveal English gloss
 */
export type AssistanceLevel = 1 | 2 | 3 | 4;
