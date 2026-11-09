/**
 * Agreement groups (heuristic, overridable later).
 *
 * Two kinds of groups are detected, both conservative — false negatives
 * are fine, false positives are worse:
 *
 * 1. agreement (adjective ↔ noun): a token whose analyses include an
 *    adjective or a participle (pos verb, mood part) is paired with the
 *    nearest preceding nominal token (noun / pronoun / name) within
 *    MAX_AGREEMENT_DISTANCE tokens whose analyses intersect with it on
 *    case AND number — and on gender when both sides carry gender
 *    (morpheus `common` matches masc/fem). If no preceding nominal
 *    matches, the nearest following one within the cap is tried (e.g.
 *    `saevae … memorem Iunonis ob iram`: `memorem` ↔ `iram`). Only the
 *    adjectival parses of the anchor and the nominal parses of the
 *    partner participate (the participle `passus` must not match
 *    through its own noun parses), and identical pairs found from both
 *    directions are emitted once. The distance cap (about one verse
 *    line) suppresses most cross-clause false positives while keeping
 *    real Vergilian hyperbaton — remaining noise comes from genuine
 *    parse ambiguity (e.g. `vi` ↔ `saevae`, both dat sg fem) and is
 *    expected to be overridden by hand later. `matched` is the
 *    intersected features, e.g. `acc sg fem`, `nom/voc pl`.
 *
 * 2. subject-verb: a finite verb (per `hasFiniteVerbRole`: ind/subj
 *    parses always; bare imperatives only without nominal co-analyses,
 *    to avoid the `Arma` = noun + imperative-of-`armo` collision) is
 *    paired with the nearest preceding subject:
 *    - 1st/2nd person: morpheus does not tag pronouns with person
 *      (`tu` → `nom/voc sg`, no person), so a small pronoun lexicon
 *      (ego/nos/tu/vos) supplies it; the pronoun must match the verb's
 *      person and number. `matched` = `1st sg`, …
 *    - 3rd person: the nearest preceding nominal with a nominative-case
 *      analysis whose number intersects the verb's. `matched` = `3rd sg`.
 *
 * Each adjective and each verb yields at most one group; unanalyzed
 * tokens never participate.
 */
import type { Gender, Group, MorpheusAnalysis, Token } from '@lego/shared';

/** Analyses keyed by form, as in `Passage.analyses`. */
export type AnalysisMap = Record<string, MorpheusAnalysis[]>;

/** Nouns, pronouns and proper names — the possible heads of agreement. */
const NOMINAL_POS: ReadonlySet<string> = new Set(['noun', 'pronoun', 'name']);

/**
 * Pronouns morpheus leaves untagged for person. Note: this is keyed by
 * the token FORM (surface case is normalized), not the lemma.
 */
const PERSON_PRONOUNS: ReadonlyMap<string, { person: '1st' | '2nd'; number: 'sg' | 'pl' }> = new Map([
  ['ego', { person: '1st', number: 'sg' }],
  ['nos', { person: '1st', number: 'pl' }],
  ['tu', { person: '2nd', number: 'sg' }],
  ['vos', { person: '2nd', number: 'pl' }],
]);

function analysesFor(analyses: AnalysisMap, token: Token): MorpheusAnalysis[] {
  return analyses[token.form] ?? [];
}

function isAdjectival(analysis: MorpheusAnalysis): boolean {
  return analysis.pos === 'adjective' || (analysis.pos === 'verb' && analysis.mood === 'part');
}

/**
 * A verb parse counts as finite when it has an indicative/subjunctive/
 * imperative mood, or — a morpheus quirk for some irregular stems
 * (`inferret` → "imperf act 3rd sg", no mood token) — when it carries
 * person endings without any mood at all (infinitives and participles
 * always carry their mood).
 */
export function isFiniteAnalysis(analysis: MorpheusAnalysis): boolean {
  if (analysis.pos !== 'verb') return false;
  if (analysis.mood === 'ind' || analysis.mood === 'subj' || analysis.mood === 'imperat') return true;
  return analysis.mood === undefined && analysis.persons !== undefined && analysis.persons.length > 0;
}

/** POS values that make a form "basically nominal" for trigger decisions. */
const NOMINALISH_POS: ReadonlySet<string> = new Set(['noun', 'pronoun', 'name', 'adjective', 'numeral']);

/**
 * Whether a token really acts as a finite verb. Indicative/subjunctive
 * parses never collide with nouns, so they always count. A bare
 * imperative parse alongside nominal parses does NOT: that is the
 * classic a-stem collision (morpheus reads `Arma` as noun `arma` AND
 * imperative of `armo`, `sacra` as noun AND imperative of `sacro`),
 * while genuine imperatives (`Solve`, `age`, `memora`) carry no nominal
 * analyses of their own.
 */
export function hasFiniteVerbRole(analyses: readonly MorpheusAnalysis[]): boolean {
  // Indicative/subjunctive parses (and moodless parses with persons,
  // see isFiniteAnalysis) never collide with nouns — always count.
  if (analyses.some((a) => isFiniteAnalysis(a) && a.mood !== 'imperat')) return true;
  if (!analyses.some((a) => a.pos === 'verb' && a.mood === 'imperat')) return false;
  return !analyses.some((a) => NOMINALISH_POS.has(a.pos));
}

function isNominal(analysis: MorpheusAnalysis): boolean {
  return NOMINAL_POS.has(analysis.pos);
}

function isNominalToken(analyses: AnalysisMap, token: Token): boolean {
  return analysesFor(analyses, token).some(isNominal);
}

/** `common` gender agrees with masc/fem but not neut. */
function genderAgrees(a: readonly Gender[], b: readonly Gender[]): boolean {
  for (const ga of a) {
    for (const gb of b) {
      if (ga === gb) return true;
      if ((ga === 'common' || gb === 'common') && ga !== 'neut' && gb !== 'neut') return true;
    }
  }
  return false;
}

function intersect<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): T[] {
  if (a === undefined || b === undefined) return [];
  return a.filter((value) => b.includes(value));
}

interface PairMatch {
  cases: string[];
  numbers: string[];
  genders?: Gender[];
}

/**
 * Feature intersection of two analysis sets: the first pair of analyses
 * (adjective-side × noun-side, in morpheus order) that agrees on case
 * and number — and on gender when both sides have genders. Only the
 * ADJECTIVAL analyses of the adjective and the NOMINAL analyses of the
 * noun participate: e.g. the participle `passus` must not match a noun
 * through its own noun parses.
 */
function agreementBetween(
  adjectives: readonly MorpheusAnalysis[],
  nominals: readonly MorpheusAnalysis[],
): PairMatch | null {
  for (const adj of adjectives) {
    if (!isAdjectival(adj)) continue;
    if (adj.cases === undefined || adj.numbers === undefined) continue;
    for (const noun of nominals) {
      if (!isNominal(noun)) continue;
      if (noun.cases === undefined || noun.numbers === undefined) continue;
      const cases = intersect(adj.cases, noun.cases);
      const numbers = intersect(adj.numbers, noun.numbers);
      if (cases.length === 0 || numbers.length === 0) continue;
      if (adj.genders !== undefined && noun.genders !== undefined) {
        if (!genderAgrees(adj.genders, noun.genders)) continue;
        return { cases, numbers, genders: intersectGender(adj.genders, noun.genders) };
      }
      return { cases, numbers };
    }
  }
  return null;
}

/** The genders shared by both sides, `common` kept as-is. */
function intersectGender(a: readonly Gender[], b: readonly Gender[]): Gender[] {
  const shared: Gender[] = [];
  for (const g of a) {
    if (b.includes(g) && !shared.includes(g)) shared.push(g);
    else if (g === 'common' && (b.includes('masc') || b.includes('fem'))) shared.push(g);
  }
  return shared;
}

function matchedString(match: PairMatch): string {
  const parts = [match.cases.join('/'), match.numbers.join('/')];
  if (match.genders !== undefined && match.genders.length > 0) {
    parts.push(match.genders.join('/'));
  }
  return parts.join(' ');
}

/**
 * Agreement partners must be within this many tokens (≈ one verse line):
 * real agreement in Vergil is local; cross-clause matches are usually
 * artifacts of parse ambiguity. Tunable.
 */
export const MAX_AGREEMENT_DISTANCE = 6;

/** Agreement groups for one sentence (see module doc). */
export function agreementGroups(tokens: readonly Token[], analyses: AnalysisMap): Group[] {
  const groups: Group[] = [];
  /** already-emitted agreement pairs, as "min-max" index keys */
  const seen = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const adjAnalyses = analysesFor(analyses, token);
    if (!adjAnalyses.some(isAdjectival)) continue;

    // Nearest preceding nominal that agrees (within the distance cap),
    // else the nearest following one.
    let partner: number | undefined;
    let match: PairMatch | null = null;
    for (let j = i - 1; j >= 0 && i - j <= MAX_AGREEMENT_DISTANCE; j--) {
      const other = tokens[j];
      if (other === undefined || !isNominalToken(analyses, other)) continue;
      match = agreementBetween(adjAnalyses, analysesFor(analyses, other));
      if (match !== null) {
        partner = j;
        break;
      }
    }
    if (partner === undefined || match === null) {
      for (let j = i + 1; j < tokens.length && j - i <= MAX_AGREEMENT_DISTANCE; j++) {
        const other = tokens[j];
        if (other === undefined || !isNominalToken(analyses, other)) continue;
        match = agreementBetween(adjAnalyses, analysesFor(analyses, other));
        if (match !== null) {
          partner = j;
          break;
        }
      }
    }
    if (partner === undefined || match === null) continue;

    const key = `${Math.min(partner, i)}-${Math.max(partner, i)}`;
    if (seen.has(key)) continue; // both directions can find the same pair
    seen.add(key);

    groups.push({
      kind: 'agreement',
      tokenIndices: [partner, i].sort((a, b) => a - b),
      matched: matchedString(match),
    });
  }
  return groups;
}

/** Subject-verb groups for one sentence (see module doc). */
export function subjectVerbGroups(tokens: readonly Token[], analyses: AnalysisMap): Group[] {
  const groups: Group[] = [];

  for (let v = 0; v < tokens.length; v++) {
    const verb = tokens[v];
    if (verb === undefined) continue;
    const allAnalyses = analysesFor(analyses, verb);
    if (!hasFiniteVerbRole(allAnalyses)) continue;
    const finite = allAnalyses.filter(isFiniteAnalysis);
    if (finite.length === 0) continue;

    for (const analysis of finite) {
      const persons = analysis.persons ?? [];
      const numbers = analysis.numbers ?? [];
      if (persons.length === 0 || numbers.length === 0) continue;

      const person = persons[0]; // '1st' | '2nd' | '3rd' (morpheus emits one)
      if (person === undefined) continue;

      if (person === '1st' || person === '2nd') {
        // Nearest preceding ego/nos/tu/vos matching person + number.
        for (let j = v - 1; j >= 0; j--) {
          const subject = tokens[j];
          if (subject === undefined) continue;
          const entry = PERSON_PRONOUNS.get(subject.form.toLowerCase());
          if (entry === undefined) continue;
          if (entry.person !== person || !numbers.includes(entry.number)) continue;
          groups.push({
            kind: 'subject-verb',
            tokenIndices: [j, v],
            matched: `${person} ${entry.number}`,
          });
          break;
        }
      } else {
        // 3rd person: nearest preceding nominative nominal of matching number.
        for (let j = v - 1; j >= 0; j--) {
          const subject = tokens[j];
          if (subject === undefined || !isNominalToken(analyses, subject)) continue;
          const nominative = analysesFor(analyses, subject).some(
            (a) => a.cases !== undefined && a.cases.includes('nom') && intersect(a.numbers, numbers).length > 0,
          );
          if (!nominative) continue;
          groups.push({
            kind: 'subject-verb',
            tokenIndices: [j, v],
            matched: `3rd ${numbers.join('/')}`,
          });
          break;
        }
      }
      if (groups.some((group) => group.tokenIndices.includes(v))) break; // one group per verb
    }
  }
  return groups;
}

/** All groups of one sentence: agreement first, then subject-verb. */
export function buildGroups(tokens: readonly Token[], analyses: AnalysisMap): Group[] {
  return [...agreementGroups(tokens, analyses), ...subjectVerbGroups(tokens, analyses)];
}
