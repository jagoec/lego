import type { AssistanceLevel, MorpheusAnalysis } from '@lego/shared';

/**
 * What the popover is allowed to show for one analysis at a given
 * assistance level. Levels only *filter* the analysis data — they never
 * add or invent information.
 */
export interface AnalysisView {
  /** part of speech, e.g. "noun" */
  pos: string;
  /** compact morphology, e.g. "neut nom/voc/acc pl" or "1st sg pres ind active" */
  morphology?: string;
  /** dictionary headword */
  lemma?: string;
  /** raw morpheus stem identifier, e.g. "a_ae", "conj1,are_vb" */
  stem?: string;
  /** friendly name for a known stem identifier, e.g. "1st declension" */
  stemLabel?: string;
  /** unrecognized morpheus flags, verbatim */
  features?: string[];
}

/**
 * Level 1 — part of speech only.
 * Level 2 — adds full morphology + lemma.
 * Level 3+ — adds the stem / declension pattern + leftover features.
 */
export function toAnalysisView(
  analysis: MorpheusAnalysis,
  level: AssistanceLevel,
): AnalysisView {
  const view: AnalysisView = { pos: analysis.pos };
  if (level >= 2) {
    const morphology = morphologySummary(analysis);
    if (morphology !== '') view.morphology = morphology;
    view.lemma = analysis.lemma;
  }
  if (level >= 3) {
    view.stem = analysis.stem;
    view.stemLabel = analysis.stem === undefined ? undefined : stemLabel(analysis.stem);
    if (analysis.features.length > 0) view.features = [...analysis.features];
  }
  return view;
}

/**
 * Compact one-line morphology summary.
 *
 * Nominals read gender/case/number ("neut nom/voc/acc pl"), verbals read
 * person/number/tense/mood/voice ("1st sg pres ind active"); slash groups
 * are joined with "/". Adjectives append their degree.
 */
export function morphologySummary(analysis: MorpheusAnalysis): string {
  const parts: string[] = [];
  if (analysis.persons) parts.push(analysis.persons.join('/'));
  if (analysis.genders) parts.push(analysis.genders.join('/'));
  if (analysis.cases) parts.push(analysis.cases.join('/'));
  if (analysis.numbers) parts.push(analysis.numbers.join('/'));
  if (analysis.tense) parts.push(analysis.tense);
  if (analysis.mood) parts.push(analysis.mood);
  if (analysis.voice) parts.push(analysis.voice);
  if (analysis.degree) parts.push(analysis.degree);
  return parts.join(' ');
}

/**
 * Friendly names for the morpheus stem identifiers we know about
 * (from morpheus `stemlib/Latin/rule_files/stemtypes.table`). The lookup
 * uses the stemtype — the part before the comma in "conj1,are_vb".
 * Unknown stems fall back to `undefined` and the raw stem is still shown.
 */
const STEM_LABELS: Readonly<Record<string, string>> = {
  a_ae: '1st declension (a, ae)',
  us_i: '2nd declension (us, i)',
  um_i: '2nd declension neuter (um, i)',
  us_a_um: '1st–2nd declension adjective (us, a, um)',
  er_ra_rum: '1st–2nd declension adjective (er, ra, rum)',
  is_e: '3rd declension adjective (is, e)',
  s_tis: '3rd declension consonant stem',
  conj1: '1st conjugation',
  conj2: '2nd conjugation',
  conj3: '3rd conjugation',
  conj3_io: '3rd conjugation (io)',
  conj4: '4th conjugation',
  prep: 'preposition',
  conj: 'conjunction',
  adverb: 'adverb',
  relative: 'relative pronoun',
};

export function stemLabel(stem: string): string | undefined {
  const stemType = stem.split(',')[0] ?? '';
  return STEM_LABELS[stemType];
}

/** Human labels for popover links, by group kind. */
export const GROUP_KIND_LABELS: Readonly<Record<string, string>> = {
  agreement: 'agrees with',
  'subject-verb': 'goes with',
  manual: 'linked with',
};
