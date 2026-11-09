import type {
  Degree,
  Gender,
  LatinCase,
  LatNumber,
  Mood,
  MorpheusAnalysis,
  PartOfSpeech,
  Person,
  Tense,
  Voice,
} from './types.js';

/**
 * Parse morpheus "Perseus format" output into structured analyses.
 *
 * ## Input format (verified against the live morpheus container and the
 * morpheus C source, `src/anal/prntanal.c` + `src/morphlib/sprntGkflags.c`)
 *
 * The HTTP body echoes the input word on the first line, then concatenates
 * one `<NL>…</NL>` record per analysis with no separator:
 *
 * ```
 * feminam
 * <NL>N fe_minam,femina  fem acc sg\t\t\ta_ae</NL><NL>…</NL>
 * ```
 *
 * Inside a record, fields are TAB-separated (empty fields possible):
 *
 * ```
 * POS [workword,]lemma ENDINGS \t dialects \t [geographic] \t [domains] \t morphflags \t STEM[,derivtype]
 * ```
 *
 * - `POS` — a single letter: `N` (nominal forms: nouns, adjectives, names,
 *   pronouns, numerals, indeclinables, supines), `V` (finite verb forms),
 *   `P` (participles), `I` (other indeclinables — not observed for Latin),
 *   `E` (Greek-only English fallback, never for Latin).
 * - `workword,lemma` — the accented (quantity-marked) form when it differs
 *   from the input, then the plain dictionary lemma. With no comma the
 *   single token is the lemma. Morpheus marks long vowels with `_` after a
 *   vowel (`fe_minam` = fēminam); the plain lemma never carries these, and
 *   per the repo convention (AGENTS.md) we store the plain lemma, applying
 *   {@link decodeMacrons} as a safety net. The accented workword itself is
 *   intentionally not kept (the corpus stores text without macrons).
 * - `ENDINGS` — space-separated tokens; combined values are slash groups
 *   (`nom/voc/acc`, `masc/fem/neut`). Vocabulary: cases `nom gen dat acc
 *   abl voc loc`, numbers `sg pl dual`, genders `masc fem neut`, persons
 *   `1st 2nd 3rd`, tenses `pres imperf fut perf plup futperf`, moods
 *   `ind subj imperat inf part ger gerundive supine`, voices `act pass`,
 *   degrees `comp superl`. Note `futperf` maps to the contract's `futp`,
 *   `act`/`pass` map to `active`/`passive`. Latin morpheus labels gerunds
 *   as `gerundive` and emits no `dual`/`loc`/`opt`.
 * - middle TAB fields — dialect/style/formation flags (`poetic`, `early`,
 *   `contr`, `indeclform`, `irreg_superl`, …), preserved verbatim in
 *   `features`.
 * - `STEM` — the last TAB field, a declension/conjugation identifier from
 *   `stemlib/Latin/rule_files/stemtypes.table` (`a_ae`, `us_a_um`,
 *   `conj1,are_vb` = stemtype + derivtype). Stored verbatim in `stem`.
 *
 * ## Part-of-speech mapping
 *
 * The `N` letter covers many POS; the stem decides:
 * - indeclinable stems carry the real POS themselves (`adverb`, `conj`,
 *   `prep`, `exclam` → interjection, `numeral`, `interrog`/`indef`/
 *   `relative`/`demonstr`/`pron1`-`pron3`/`reflex` → pronoun, …);
 * - adjective stems (`us_a_um`, `er_ra_rum`, `is_e`, `*_adj`, `*_comp`, …)
 *   → adjective;
 * - verb stems (`conj1`-`conj4`, `perfstem`, `pp4`, …) → verb (supines);
 * - other nominal stems → noun;
 * - a capitalized lemma (only produced for capitalized dictionary entries,
 *   e.g. `Tullia`, `Augustus`, `Aeneas`) → name.
 *
 * Unrecognized ending tokens and unusual POS letters are preserved in
 * `features` verbatim — no information is dropped.
 */
export function parseMorpheus(output: string): MorpheusAnalysis[] {
  const analyses: MorpheusAnalysis[] = [];

  for (const match of output.matchAll(RECORD_RE)) {
    const record = match[1] ?? '';

    // Split into TAB-separated fields: head, flags…, stem (last).
    const fields = record.split('\t').map((f) => f.trim());
    const head = fields[0] ?? '';
    const stem = fields.length > 1 ? (fields.at(-1) ?? '') : undefined;
    const flagTokens: string[] = [];
    for (const field of fields.slice(1, fields.length > 1 ? -1 : 1)) {
      for (const token of field.split(/\s+/)) {
        if (token) flagTokens.push(token);
      }
    }

    // Head: "POS workword,lemma endings…" (all single tokens; the
    // form/lemma part never contains whitespace).
    const headTokens = head.split(/\s+/).filter((t) => t.length > 0);
    const posLetter = headTokens[0] ?? '';
    const formLemma = headTokens[1] ?? '';
    if (formLemma === '') continue; // malformed record, nothing to build on

    const comma = formLemma.indexOf(',');
    const lemmaField = comma >= 0 ? formLemma.slice(comma + 1) : formLemma;
    const lemma = decodeMacrons(lemmaField);

    const features: string[] = [];
    for (const flag of flagTokens) pushUnique(features, flag);

    const pos = classifyPos(posLetter, stem ?? '', lemma, features);

    const analysis: MorpheusAnalysis = { pos, lemma, features };
    applyEndings(headTokens.slice(2), analysis, features);
    if (stem) analysis.stem = stem;

    analyses.push(analysis);
  }

  return analyses;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/** Matches one `<NL>…</NL>` record; record bodies never contain `<`. */
const RECORD_RE = /<NL>([^<]*)<\/NL>/g;

// ---------------------------------------------------------------------------
// Macron decoding
// ---------------------------------------------------------------------------

/**
 * Morpheus marks long vowels with `_` after the vowel (`fe_minam` =
 * fēminam, `cano_` = canō). Convert `a_`→`ā`, … (upper- and lowercase,
 * including Greek `y`). Underscores not following a vowel are left alone.
 * Only ever apply this to lemmas/forms — never to stem identifiers.
 */
export function decodeMacrons(text: string): string {
  return text.replace(
    /([aeiouyAEIOUY])_/g,
    (match, vowel: string) => MACRON_MAP[vowel] ?? match,
  );
}

const MACRON_MAP: Readonly<Record<string, string>> = {
  a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū', y: 'ȳ',
  A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū', Y: 'Ȳ',
};

// ---------------------------------------------------------------------------
// Part-of-speech classification
// ---------------------------------------------------------------------------

/**
 * Indeclinable-type stems that name their own part of speech.
 * From morpheus `stemlib/Latin/rule_files/stemtypes.table` (indecl rows).
 */
const INDECL_POS: Readonly<Record<string, PartOfSpeech>> = {
  adverb: 'adverb',
  conj: 'conjunction',
  prep: 'preposition',
  exclam: 'interjection',
  numeral: 'numeral',
  particle: 'particle',
  connect: 'particle',
  expletive: 'particle',
  article: 'particle',
  interrog: 'pronoun',
  indef: 'pronoun',
  indef_pron: 'pronoun',
  relative: 'pronoun',
  rel_pron: 'pronoun',
  indef_rel_pron: 'pronoun',
  demonstr: 'pronoun',
  pron1: 'pronoun',
  pron2: 'pronoun',
  pron3: 'pronoun',
  reflex: 'pronoun',
  pron_adj1: 'adjective',
  pron_adj3: 'adjective',
  indecl_noun: 'noun',
  indecl_adj: 'adjective',
  alphabetic: 'irregular',
  abbrev: 'irregular',
  indecl: 'irregular',
};

/** Adjective stem identifiers (adj1/adj2/adj3 rows of stemtypes.table, `L` normalized away). */
const ADJECTIVE_STEMS: ReadonlySet<string> = new Set([
  // adj1
  'us_a_um', '0_a_um', 'er_ra_rum', 'er_era_erum', 'ius_ia_ium', 'irreg_adj1', 'irreg_adj2',
  // adj3
  'is_e', 'er_ris_re', 'ans_adj', 'ens_adj', 'us_ius_adj', '0_ius_adj', 'ior_ius_comp',
  'or_us_comp', 'ax_adj', '0_adj3', 'pes_pedis_adj', 'ox_adj', 'ix_adj', 's_tis_adj',
  'eps_ipitis', 'ex_icis_adj', 's_dis_adj', 'irreg_adj3',
]);

/** Verb-family stem identifiers (pp_pr / pp_pf / pp_su / verbstem rows). */
const VERB_STEMS: ReadonlySet<string> = new Set([
  'conj1', 'conj2', 'conj3', 'conj4', 'conj3_io',
  'perfstem', 'ivperf', 'avperf', 'evperf',
  'pp4', 'irreg_pp1', 'irreg_pp2', 'irreg_fut',
  'are_vb', 'ire_vb',
]);

function classifyPos(
  posLetter: string,
  stem: string,
  lemma: string,
  features: string[],
): PartOfSpeech {
  // The stem field is "stemtype[,derivtype]"; classification uses the
  // stemtype. Source names may contain an uppercase `L` placeholder
  // (e.g. `peLs_pedis_adj`), normalized away for lookup only.
  const stemType = stem.split(',')[0]?.replace(/L/g, '') ?? '';
  const indeclPos = INDECL_POS[stemType];
  const isProperName = /^[A-Z]/.test(lemma);

  if (posLetter === 'V' || posLetter === 'P') return 'verb';

  if (posLetter === 'N') {
    if (indeclPos !== undefined) return indeclPos;
    if (VERB_STEMS.has(stemType)) return 'verb'; // e.g. supines: "N venio supine neut nom sg pp4"
    if (ADJECTIVE_STEMS.has(stemType)) return isProperName ? 'name' : 'adjective';
    return isProperName ? 'name' : 'noun'; // noun1-5, irreg_nom*, unknown nominal stems
  }

  // Unusual POS letters (I, E, …) — classify from the stem where possible
  // and always keep the raw letter in features.
  pushUnique(features, `pos:${posLetter}`);
  if (indeclPos !== undefined) return indeclPos;
  if (VERB_STEMS.has(stemType)) return 'verb';
  if (ADJECTIVE_STEMS.has(stemType)) return 'adjective';
  if (stemType !== '') return 'noun';
  return posLetter === 'I' ? 'particle' : 'irregular';
}

// ---------------------------------------------------------------------------
// Ending tokens
// ---------------------------------------------------------------------------

const CASE_TOKENS: Readonly<Record<string, LatinCase>> = {
  nom: 'nom', gen: 'gen', dat: 'dat', acc: 'acc', abl: 'abl', voc: 'voc', loc: 'loc',
};

const NUMBER_TOKENS: Readonly<Record<string, LatNumber>> = {
  sg: 'sg', pl: 'pl', dual: 'dual',
};

const GENDER_TOKENS: Readonly<Record<string, Gender>> = {
  masc: 'masc', fem: 'fem', neut: 'neut', common: 'common',
};

const PERSON_TOKENS: Readonly<Record<string, Person>> = {
  '1st': '1st', '2nd': '2nd', '3rd': '3rd',
};

const TENSE_TOKENS: Readonly<Record<string, Tense>> = {
  pres: 'pres', imperf: 'imperf', fut: 'fut', perf: 'perf', plup: 'plup',
  futperf: 'futp', // morpheus says "futperf"; the contract says "futp"
  futp: 'futp',
};

const MOOD_TOKENS: Readonly<Record<string, Mood>> = {
  ind: 'ind', subj: 'subj', imperat: 'imperat', inf: 'inf', part: 'part',
  ger: 'ger', gerundive: 'gerundive', supine: 'supine',
  // 'opt' (Greek subjunctive) is not in the contract's Mood union; Latin
  // morpheus never emits it, and an unknown token lands in `features`.
};

const VOICE_TOKENS: Readonly<Record<string, Voice>> = {
  act: 'active', active: 'active', pass: 'passive', passive: 'passive',
};

const DEGREE_TOKENS: Readonly<Record<string, Degree>> = {
  comp: 'comparative', comparative: 'comparative',
  superl: 'superlative', superlative: 'superlative',
  positive: 'positive',
};

/**
 * Map the space-separated ending tokens of a record onto the analysis.
 * Slash groups (`nom/voc/acc`) expand into arrays. Unrecognized tokens go
 * verbatim into `features` — never dropped.
 */
function applyEndings(
  tokens: readonly string[],
  analysis: MorpheusAnalysis,
  features: string[],
): void {
  const cases: LatinCase[] = [];
  const numbers: LatNumber[] = [];
  const genders: Gender[] = [];
  const persons: Person[] = [];

  for (const token of tokens) {
    for (const sub of token.split('/')) {
      if (sub === '') continue;
      const c = CASE_TOKENS[sub];
      const n = NUMBER_TOKENS[sub];
      const g = GENDER_TOKENS[sub];
      const p = PERSON_TOKENS[sub];
      const t = TENSE_TOKENS[sub];
      const m = MOOD_TOKENS[sub];
      const v = VOICE_TOKENS[sub];
      const d = DEGREE_TOKENS[sub];
      if (c !== undefined) pushUnique(cases, c);
      else if (n !== undefined) pushUnique(numbers, n);
      else if (g !== undefined) pushUnique(genders, g);
      else if (p !== undefined) pushUnique(persons, p);
      else if (t !== undefined) setSingle('tense', t, analysis, features, sub);
      else if (m !== undefined) setSingle('mood', m, analysis, features, sub);
      else if (v !== undefined) setSingle('voice', v, analysis, features, sub);
      else if (d !== undefined) setSingle('degree', d, analysis, features, sub);
      else pushUnique(features, sub); // e.g. "adverbial" — keep verbatim
    }
  }

  if (cases.length > 0) analysis.cases = cases;
  if (numbers.length > 0) analysis.numbers = numbers;
  if (genders.length > 0) analysis.genders = genders;
  if (persons.length > 0) analysis.persons = persons;
}

/** Verbal categories are single-valued; a conflicting second value goes to features. */
function setSingle<K extends 'tense' | 'mood' | 'voice' | 'degree'>(
  key: K,
  value: MorpheusAnalysis[K],
  analysis: MorpheusAnalysis,
  features: string[],
  token: string,
): void {
  const current = analysis[key];
  if (current === undefined || current === value) {
    analysis[key] = value;
  } else {
    pushUnique(features, token);
  }
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}
