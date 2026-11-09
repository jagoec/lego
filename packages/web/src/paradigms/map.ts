import type { MorpheusAnalysis } from '@lego/shared';
import { TABLES } from './data';
import type { ParadigmTable, TableId } from './types';

/**
 * Stem/lemma → paradigm table mapping, data-driven from morpheus's
 * stemtypes (`stemlib/Latin/rule_files/stemtypes.table`).
 *
 * Lookup order for one analysis:
 *   1. exact full-stem rules (e.g. `pp4,are_vb` — the `,are_vb` suffix
 *      marks a regular 1st-conjugation verb regardless of the prefix)
 *   2. pronoun stems — routed by LEMMA to the right pronoun table
 *   3. perfect/participle stems — routed by LEMMA to the irregular
 *      families (sum → esse, eō → īre, ferō → ferre, volō …)
 *   4. stemtype rules: fixed tables, gender-dispatched tables (2nd/4th
 *      declension m vs n), and 3rd-declension (consonant vs i-stem)
 *   5. explicit allowlist (`UNMAPPED_STEMS`) — never maps, with a reason
 *
 * Every rule is keyed data; there is no silent fallback. A corpus test
 * enumerates the real stems and asserts each one is known to this map.
 */

export type AnalysisMapping =
  | { table: ParadigmTable; note?: string }
  | { reason: string };

// ---------------------------------------------------------------------------
// 1. exact full-stem rules
// ---------------------------------------------------------------------------

/** Stems whose comma-suffix identifies the conjugation outright. */
const FULL_STEM_RULES: Readonly<Record<string, TableId>> = {
  'conj1,are_vb': 'verb1',
  'conj4,ire_vb': 'verb4',
  // regular ā-verbs with an irregular perfect or participle stem
  'pp4,are_vb': 'verb1',
  'avperf,are_vb': 'verb1',
};

// ---------------------------------------------------------------------------
// 2. pronoun stems → table by lemma
// ---------------------------------------------------------------------------

/** Stems morpheus uses for pronouns (`indecl3` in stemtypes.table). */
const PRONOUN_STEMS: ReadonlySet<string> = new Set([
  'pron1', 'pron2', 'pron3', 'demonstr', 'relative', 'interrog', 'indef', 'reflex',
]);

/** sense markers (qui#1 → qui) are stripped before this lookup */
const PRONOUN_LEMMA_TABLES: Readonly<Record<string, TableId>> = {
  ego: 'pron-ego',
  nos: 'pron-ego',
  tu: 'pron-tu',
  vos: 'pron-tu',
  is: 'pron-is',
  idem: 'pron-is',
  ille: 'pron-ille',
  illic: 'pron-ille',
  hic: 'pron-hic',
  iste: 'pron-iste',
  ipse: 'pron-ipse',
  qui: 'pron-qui',
  quisquis: 'pron-qui',
  quicumque: 'pron-qui',
  aliqui: 'pron-qui',
  quis: 'pron-quis',
  quisquam: 'pron-quis',
  se: 'pron-se',
  sui: 'pron-se',
};

// ---------------------------------------------------------------------------
// 3. perfect/participle stems → irregular families by lemma
// ---------------------------------------------------------------------------

/**
 * Stems morpheus uses for perfect-system and participle forms. They do
 * not encode a conjugation, so only the irregular families (and a few
 * known conjugations) are mapped — everything else lands on the
 * allowlist reason below.
 */
const PERFECT_SYSTEM_STEMS: ReadonlySet<string> = new Set([
  'perfstem', 'avperf', 'evperf', 'ivperf', 'pp4', 'irreg_pp1', 'irreg_pp2',
]);

const PERFECT_STEM_REASON =
  'perfect-stem or participle form — the stem does not encode the conjugation';

/** exact lemma (with sense marker) wins over the stripped lemma */
const VERB_LEMMA_TABLES_EXACT: Readonly<Record<string, TableId>> = {
  'edo#1': 'verb3', // ēdō “eat” is 3rd conjugation; “publish” (ēdō, ēdere) is 2nd
};

/** lemma with any `#n` sense marker stripped */
const VERB_LEMMA_TABLES: Readonly<Record<string, TableId>> = {
  // esse family
  sum: 'esse',
  absum: 'esse',
  adsum: 'esse',
  desum: 'esse',
  insum: 'esse',
  intersum: 'esse',
  prosum: 'esse',
  supersum: 'esse',
  // posse
  possum: 'posse',
  // īre family
  eo: 'ire',
  abeo: 'ire',
  adeo: 'ire',
  deeo: 'ire',
  exeo: 'ire',
  ineo: 'ire',
  obeo: 'ire',
  prodeo: 'ire',
  redeo: 'ire',
  subeo: 'ire',
  transeo: 'ire',
  // ferre family
  fero: 'ferre',
  aufero: 'ferre',
  circumfero: 'ferre',
  differo: 'ferre',
  effero: 'ferre',
  infero: 'ferre',
  offero: 'ferre',
  perfero: 'ferre',
  refero: 'ferre',
  transfero: 'ferre',
  // velle
  volo: 'volo',
  // irregular members of otherwise regular conjugations
  do: 'verb1',
  circumdo: 'verb1',
  for: 'verb1',
};

const VERB_LEMMA_NOTES: Readonly<Record<string, string>> = {
  do: 'dō is irregular within the 1st conjugation (short a: dās, dat, dare)',
  circumdo: 'circumdō is irregular within the 1st conjugation (short a)',
  for: 'fārī, fātus sum is semi-deponent; its present system is 1st-conjugation',
};

// ---------------------------------------------------------------------------
// 4. stemtype rules
// ---------------------------------------------------------------------------

/** stemtype → one fixed table */
const STEM_TABLES: Readonly<Record<string, TableId>> = {
  // 1st declension (morpheus noun1: also Greek -e/-ēs and -ās types)
  a_ae: 'noun1',
  e_es: 'noun1',
  es_ae: 'noun1',
  as_ae: 'noun1',
  // 5th declension
  es_ei: 'noun5',
  es_eLi: 'noun5',
  // 1st–2nd declension adjectives
  us_a_um: 'adj12-us',
  '0_a_um': 'adj12-us',
  ius_ia_ium: 'adj12-us',
  er_ra_rum: 'adj12-er',
  er_era_erum: 'adj12-er',
  // 3rd declension adjectives
  is_e: 'adj3-two',
  er_ris_re: 'adj3-three',
  '0_adj3': 'adj3-two',
  ens_adj: 'adj3-one',
  ans_adj: 'adj3-one',
  ax_adj: 'adj3-one',
  ox_adj: 'adj3-one',
  ix_adj: 'adj3-one',
  s_tis_adj: 'adj3-one',
  ex_icis_adj: 'adj3-one',
  s_dis_adj: 'adj3-one',
  peLs_pedis_adj: 'adj3-one',
  irreg_adj3: 'adj3-one',
  // conjugations (the comma-suffixed variants resolve via the same stemtype)
  conj1: 'verb1',
  conj2: 'verb2',
  conj3: 'verb3',
  conj3_io: 'verb3io',
  conj4: 'verb4',
};

/** stemtype → {masc, neut} tables; the parse's gender picks one */
const GENDER_RULES: Readonly<Record<string, { masc: TableId; neut: TableId }>> = {
  // 2nd declension (morpheus noun2)
  us_i: { masc: 'noun2m', neut: 'noun2n' },
  um_i: { masc: 'noun2m', neut: 'noun2n' },
  ius_i: { masc: 'noun2m', neut: 'noun2n' },
  os_i: { masc: 'noun2m', neut: 'noun2n' },
  '0_i': { masc: 'noun2m', neut: 'noun2n' },
  er_ri: { masc: 'noun2m', neut: 'noun2n' },
  ios_i: { masc: 'noun2m', neut: 'noun2n' },
  eus_ei: { masc: 'noun2m', neut: 'noun2n' },
  irreg_nom2: { masc: 'noun2m', neut: 'noun2n' },
  // 4th declension
  us_us: { masc: 'noun4-mf', neut: 'noun4-n' },
  o_us: { masc: 'noun4-mf', neut: 'noun4-n' },
};

/**
 * 3rd declension stemtypes (morpheus noun3), classified consonant vs
 * i-stem. The parse's gender then picks the m/f or neuter table.
 */
const THIRD_STEMS: Readonly<Record<string, 'consonant' | 'i'>> = {
  // i-stems: nominative -is with genitive -is (cīvis-type) and neuter -e (mare-type)
  is_is: 'i',
  is_is_C: 'i',
  e_is: 'i',
  // consonant stems (the rest of morpheus's noun3 list)
  x_gis: 'consonant',
  or_oris: 'consonant',
  s_is: 'consonant',
  es_is: 'consonant',
  ens_entis: 'consonant',
  ans_antis: 'consonant',
  tas_tatis: 'consonant',
  o_onis: 'consonant',
  x_cis: 'consonant',
  is_idis: 'consonant',
  men_minis: 'consonant',
  ix_iLcis: 'consonant',
  ix_icis: 'consonant',
  o_oLnis: 'consonant',
  en_inis: 'consonant',
  ma_matis: 'consonant',
  as_adis: 'consonant',
  oLn_oLnis: 'consonant',
  oLn_onis: 'consonant',
  or_oLris: 'consonant',
  ex_icis: 'consonant',
  uns_untis: 'consonant',
  er_eris: 'consonant',
  eLr_eLris: 'consonant',
  s_tis: 'consonant',
  '0_is': 'consonant',
  es_itis: 'consonant',
  us_untis: 'consonant',
  or_uris: 'consonant',
  uLs_uLris: 'consonant',
  es_eLtis: 'consonant',
  as_antis: 'consonant',
  on_ontis: 'consonant',
  s_nis: 'consonant',
  o_inis: 'consonant',
  x_ctis: 'consonant',
  os_ois: 'consonant',
  ys_yos: 'consonant',
  is_eris: 'consonant',
  er_ris: 'consonant',
  s_dis: 'consonant',
  peLs_pedis: 'consonant',
  es_eLdis: 'consonant',
  is_eos: 'consonant',
  is_idos: 'consonant',
  ex_igis: 'consonant',
  eps_ipis: 'consonant',
  o_eLnis: 'consonant',
  an_aLnis: 'consonant',
  us_eris: 'consonant',
  us_oris: 'consonant',
  eLs_eris: 'consonant',
  ur_oris: 'consonant',
  es_idis: 'consonant',
  aLs_aris: 'consonant',
  as_anis: 'consonant',
};

const THIRD_BY_CLASS: Readonly<
  Record<'consonant' | 'i', { mf: TableId; neut: TableId }>
> = {
  consonant: { mf: 'noun3c-mf', neut: 'noun3c-n' },
  i: { mf: 'noun3i-mf', neut: 'noun3i-n' },
};

// ---------------------------------------------------------------------------
// 5. allowlist — never maps, with a reason (no silent gaps)
// ---------------------------------------------------------------------------

/**
 * Stems that deliberately have no paradigm table. The corpus coverage
 * test fails if a real corpus stem is missing from here AND from the
 * rules above.
 */
export const UNMAPPED_STEMS: Readonly<Record<string, string>> = {
  adverb: 'adverbs are invariable',
  conj: 'conjunctions are invariable',
  prep: 'prepositions are invariable',
  exclam: 'interjections are invariable',
  indecl: 'indeclinable words (tōt, fās)',
  numeral: 'numerals — no paradigm table (unsurprisingly irregular)',
  irreg_nom3: 'irregular 3rd-declension nouns (vīs, ōs) — no regular table fits',
  us_ius_adj: 'ūnus-type adjectives (gen sg -īus, dat sg -ī) — no table yet',
  '0_ius_adj': 'ūnus-type adjectives (gen sg -īus, dat sg -ī) — no table yet',
  ior_ius_comp: 'comparative adjectives — no table yet',
  or_us_comp: 'comparative adjectives — no table yet',
  // perfect-system stems fall back to this reason when the lemma is not
  // one of the mapped irregular families
  perfstem: PERFECT_STEM_REASON,
  avperf: PERFECT_STEM_REASON,
  evperf: PERFECT_STEM_REASON,
  ivperf: PERFECT_STEM_REASON,
  pp4: PERFECT_STEM_REASON,
  irreg_pp1: PERFECT_STEM_REASON,
  irreg_pp2: PERFECT_STEM_REASON,
};

/** Enclitic particles never get a table (they were split off pre-analysis). */
export const ENCLITIC_FORMS: ReadonlySet<string> = new Set(['que', 've', 'ne']);

// ---------------------------------------------------------------------------
// lookup
// ---------------------------------------------------------------------------

/** morpheus lemmas carry sense markers: "qui#1" → "qui". */
function stripSense(lemma: string): string {
  return lemma.split('#')[0] ?? lemma;
}

/** All-neuter parses pick the neuter table; anything else the m/f one. */
function isNeut(analysis: MorpheusAnalysis): boolean {
  const genders = analysis.genders;
  return genders !== undefined && genders.length > 0 && genders.every((g) => g === 'neut');
}

/**
 * Map one parse to its paradigm table. Returns either the table (plus an
 * optional caveat note) or a human-readable reason why there is none.
 */
export function tableForAnalysis(analysis: MorpheusAnalysis): AnalysisMapping {
  const stem = analysis.stem;
  if (stem === undefined) return { reason: 'no stem in the analysis' };

  // 1. exact full-stem rules
  const full = FULL_STEM_RULES[stem];
  if (full !== undefined) return { table: TABLES[full] };

  const stemType = stem.split(',')[0] ?? stem;
  const lemma = analysis.lemma;
  const bareLemma = stripSense(lemma);

  // 2. pronoun stems route by lemma
  if (PRONOUN_STEMS.has(stemType)) {
    const table = PRONOUN_LEMMA_TABLES[bareLemma];
    if (table !== undefined) return { table: TABLES[table] };
    return { reason: `no pronoun table for “${lemma}”` };
  }

  // 3. perfect/participle stems route by lemma
  if (PERFECT_SYSTEM_STEMS.has(stemType)) {
    const exact = VERB_LEMMA_TABLES_EXACT[lemma] ?? VERB_LEMMA_TABLES[bareLemma];
    if (exact !== undefined) {
      return { table: TABLES[exact], note: VERB_LEMMA_NOTES[bareLemma] };
    }
    return { reason: PERFECT_STEM_REASON };
  }

  // 4a. fixed stemtype rules
  const fixed = STEM_TABLES[stemType];
  if (fixed !== undefined) {
    if (stemType === '0_adj3') {
      // the stem does not reveal how many nominative endings the
      // adjective has — default to the two-ending table and say so
      return { table: TABLES['adj3-two'], note: 'ending count unknown from the stem — two-ending table shown' };
    }
    return { table: TABLES[fixed] };
  }

  // 4b. gender-dispatched stemtypes (2nd and 4th declension)
  const genderRule = GENDER_RULES[stemType];
  if (genderRule !== undefined) {
    if (stemType === 'irreg_nom2') {
      return {
        table: TABLES[isNeut(analysis) ? genderRule.neut : genderRule.masc],
        note: 'irregular 2nd-declension noun (deus/virus) — regular table shown as reference',
      };
    }
    return { table: TABLES[isNeut(analysis) ? genderRule.neut : genderRule.masc] };
  }

  // 4c. 3rd declension: consonant vs i-stem × m/f vs neuter
  const third = THIRD_STEMS[stemType];
  if (third !== undefined) {
    const pair = THIRD_BY_CLASS[third];
    return { table: TABLES[isNeut(analysis) ? pair.neut : pair.mf] };
  }

  // 5. allowlist
  const reason = UNMAPPED_STEMS[stemType];
  if (reason !== undefined) return { reason };

  return { reason: `unknown stem “${stem}”` };
}
