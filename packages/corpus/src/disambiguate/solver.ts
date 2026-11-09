/**
 * Constraint solver for parse disambiguation (Task A, step 1 —
 * deterministic, `selectedBy: 'solver'`).
 *
 * For every ambiguous token of a sentence, each candidate parse is
 * either ELIMINATED by contradicting evidence or kept, and the kept
 * parses collect small SOFT plausibility scores. A parse is selected
 * only when
 *
 * - exactly one parse survives the eliminations, or
 * - the best survivor beats the runner-up by at least
 *   {@link SELECTION_MARGIN} soft points ("dominates clearly").
 *
 * Otherwise `selected` stays unset and the UI keeps showing all parses.
 *
 * ## Evidence (hard eliminations)
 *
 * 1. **Agreement groups** (v1 `agreement` links, `Group.matched` such as
 *    `acc sg fem`): both participating tokens must be able to play their
 *    agreement role under the matched features — a parse survives only
 *    if it is adjectival (adjective / participle) or nominal
 *    (noun / pronoun / name) AND its case, number and gender intersect
 *    the matched features (`common` gender agrees with masc/fem). Pares
 *    of other parts of speech (a finite-verb or adverb reading of the
 *    same form) contradict the agreement link and are eliminated.
 * 2. **Subject–verb groups** (v1 `subject-verb` links, `matched` such as
 *    `3rd sg`): the verb side (the token with a finite-verb role) loses
 *    every non-finite parse and every finite parse whose person or
 *    number is incompatible with the matched person/number; the subject
 *    side loses every non-nominal parse and every nominal parse without
 *    a nominative of the matched number. A 1st/2nd-person link comes
 *    from the ego/nos/tu/vos lexicon, so it constrains only the verb.
 * 3. **Finite-verb anchoring**: a token with a finite-verb role (the
 *    reading-order `verb` chunk anchor per `hasFiniteVerbRole`) must be
 *    read as a finite verb — noun / infinitive / participle readings of
 *    that form are eliminated. (The `Arma` = noun + imperative-of-armo
 *    collision is safe: such tokens never get the finite-verb role.)
 *
 * When eliminations would remove every parse of a token (contradictory
 * evidence), the eliminations are discarded for that token — the
 * constraints are heuristics and must never make a token unanalyzable.
 *
 * ## Soft plausibility (never eliminates)
 *
 * - **Prepositional government** (±2): a nominal token immediately
 *   following an unambiguous ablative-governing preposition (ab, ex, de,
 *   cum, …) scores its abl parses +2 and others −2; likewise for
 *   accusative-governing prepositions (ad, ob, per, …). Ambiguous-government
 *   prepositions (in, sub, super) impose nothing.
 * - **Subject-side nominatives** (+1): tokens inside a reading-order
 *   chunk labeled `subject` (v1's confident nominative run) give their
 *   nominative parses a small plausibility bonus.
 */
import type { Gender, Group, LatinCase, LatNumber, MorpheusAnalysis, Person, Token, Chunk } from '@lego/shared';
import { hasFiniteVerbRole, isAdjectival, isFiniteAnalysis } from '../groups.js';
import type { AnalysisMap } from '../groups.js';

/** Select only when the best survivor leads by this many soft points. */
export const SELECTION_MARGIN = 2;

/** Soft weight of prepositional-government evidence. */
export const PREPOSITION_WEIGHT = 2;

/** Soft weight of the subject-side nominative bonus. */
export const SUBJECT_BONUS = 1;

/** Prepositions governing (almost) only the ablative. */
const PREP_ABL: ReadonlySet<string> = new Set([
  'ab', 'abs', 'e', 'ex', 'de', 'cum', 'sine', 'pro', 'prae', 'coram', 'palam', 'tenus',
]);

/** Prepositions governing (almost) only the accusative. */
const PREP_ACC: ReadonlySet<string> = new Set([
  'ad', 'ante', 'apud', 'circum', 'contra', 'erga', 'extra', 'infra', 'intra', 'inter',
  'iuxta', 'ob', 'per', 'pone', 'post', 'praeter', 'propter', 'secundum', 'trans',
  'ultra', 'usque', 'versus', 'citra',
]);
// `in`, `sub`, `super`, `subter` govern both cases and impose nothing.

/** One ambiguous token's outcome within the sentence. */
export interface ParseSolution {
  /** parse indices contradicted by hard evidence */
  eliminated: number[];
  /** soft plausibility score per parse (aligned with the analyses array) */
  scores: number[];
  /** the selected parse index — only set when decisive */
  selected?: number;
}

/** Solutions per token index; undefined = token is unambiguous (nothing to solve). */
export type SentenceSolution = (ParseSolution | undefined)[];

function analysesOf(analyses: AnalysisMap, token: Token): MorpheusAnalysis[] {
  return analyses[token.form] ?? [];
}

function isNominal(analysis: MorpheusAnalysis): boolean {
  return analysis.pos === 'noun' || analysis.pos === 'pronoun' || analysis.pos === 'name';
}

/** `common` gender agrees with masc/fem but not neut (as in groups.ts). */
function genderAgrees(a: readonly Gender[], b: readonly Gender[]): boolean {
  for (const ga of a) {
    for (const gb of b) {
      if (ga === gb) return true;
      if ((ga === 'common' || gb === 'common') && ga !== 'neut' && gb !== 'neut') return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Group.matched parsing
// ---------------------------------------------------------------------------

const CASE_WORDS: Readonly<Record<string, LatinCase>> = {
  nom: 'nom', gen: 'gen', dat: 'dat', acc: 'acc', abl: 'abl', voc: 'voc', loc: 'loc',
};
const NUMBER_WORDS: Readonly<Record<string, LatNumber>> = { sg: 'sg', pl: 'pl', dual: 'dual' };
const GENDER_WORDS: Readonly<Record<string, Gender>> = {
  masc: 'masc', fem: 'fem', neut: 'neut', common: 'common',
};
const PERSON_WORDS: Readonly<Record<string, Person>> = { '1st': '1st', '2nd': '2nd', '3rd': '3rd' };

/** The agreement features encoded in `Group.matched`, e.g. `acc sg fem`. */
export interface ParsedAgreement {
  cases: LatinCase[];
  numbers: LatNumber[];
  genders: Gender[];
}

/** Parse an agreement group's `matched` string (`nom/voc pl fem`, `dat sg fem`). */
export function parseAgreementMatched(matched: string): ParsedAgreement | null {
  const cases: LatinCase[] = [];
  const numbers: LatNumber[] = [];
  const genders: Gender[] = [];
  let sawAny = false;
  for (const word of matched.split(/\s+/)) {
    let hit = false;
    for (const sub of word.split('/')) {
      if (CASE_WORDS[sub] !== undefined && !cases.includes(CASE_WORDS[sub]!)) {
        cases.push(CASE_WORDS[sub]!);
        hit = true;
      } else if (NUMBER_WORDS[sub] !== undefined && !numbers.includes(NUMBER_WORDS[sub]!)) {
        numbers.push(NUMBER_WORDS[sub]!);
        hit = true;
      } else if (GENDER_WORDS[sub] !== undefined && !genders.includes(GENDER_WORDS[sub]!)) {
        genders.push(GENDER_WORDS[sub]!);
        hit = true;
      }
    }
    if (hit) sawAny = true;
  }
  return sawAny && cases.length > 0 && numbers.length > 0 ? { cases, numbers, genders } : null;
}

/** The person/number encoded in a subject-verb group's `matched` (`3rd sg`). */
export interface ParsedSubjectVerb {
  person: Person;
  numbers: LatNumber[];
}

/** Parse a subject-verb group's `matched` string (`1st sg`, `3rd pl/sg`). */
export function parseSubjectVerbMatched(matched: string): ParsedSubjectVerb | null {
  const words = matched.split(/\s+/);
  const person = words[0] !== undefined ? PERSON_WORDS[words[0]] : undefined;
  if (person === undefined) return null;
  const numbers: LatNumber[] = [];
  for (const word of words.slice(1)) {
    for (const sub of word.split('/')) {
      const n = NUMBER_WORDS[sub];
      if (n !== undefined && !numbers.includes(n)) numbers.push(n);
    }
  }
  return numbers.length > 0 ? { person, numbers } : null;
}

// ---------------------------------------------------------------------------
// Per-parse compatibility tests
// ---------------------------------------------------------------------------

/**
 * Whether a parse can play an agreement role (adjectival or nominal side)
 * under the matched features: case and number must intersect, and gender
 * must agree when both carry gender.
 */
function agreementCompatible(
  parse: MorpheusAnalysis,
  matched: ParsedAgreement,
): boolean {
  if (!(isAdjectival(parse) || isNominal(parse))) return false;
  if (parse.cases === undefined || parse.numbers === undefined) return false;
  if (!parse.cases.some((c) => matched.cases.includes(c))) return false;
  if (!parse.numbers.some((n) => matched.numbers.includes(n))) return false;
  if (
    parse.genders !== undefined &&
    matched.genders.length > 0 &&
    !genderAgrees(parse.genders, matched.genders)
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Solver
// ---------------------------------------------------------------------------

/**
 * Solve one sentence. Returns, per ambiguous token, the eliminated parse
 * indices, the soft scores, and (when decisive) the selected parse index.
 * Deterministic; no I/O.
 */
export function solveSentence(
  tokens: readonly Token[],
  analyses: AnalysisMap,
  groups: readonly Group[],
  order: readonly Chunk[],
): SentenceSolution {
  const solution: SentenceSolution = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined) continue;
    const tokenAnalyses = analysesOf(analyses, token);
    if (tokenAnalyses.length < 2) continue; // unambiguous — nothing to solve
    solution[i] = {
      eliminated: [],
      scores: tokenAnalyses.map(() => 0),
    };
  }

  const eliminate = (tokenIndex: number, parseIndex: number): void => {
    const sol = solution[tokenIndex];
    if (sol === undefined) return; // token unambiguous
    if (!sol.eliminated.includes(parseIndex)) sol.eliminated.push(parseIndex);
  };

  // 1. Finite-verb anchoring: a verb-anchor token must read as finite.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined || solution[i] === undefined) continue;
    const tokenAnalyses = analysesOf(analyses, token);
    if (!hasFiniteVerbRole(tokenAnalyses)) continue;
    tokenAnalyses.forEach((parse, k) => {
      if (!isFiniteAnalysis(parse)) eliminate(i, k);
    });
  }

  // 2. Agreement groups: both sides must be able to play their role.
  for (const group of groups) {
    if (group.kind !== 'agreement') continue;
    const matched = group.matched === undefined ? null : parseAgreementMatched(group.matched);
    if (matched === null) continue;
    for (const index of group.tokenIndices) {
      const token = tokens[index];
      if (token === undefined || solution[index] === undefined) continue;
      analysesOf(analyses, token).forEach((parse, k) => {
        if (!agreementCompatible(parse, matched)) eliminate(index, k);
      });
    }
  }

  // 3. Subject–verb groups: person/number compatibility both ways.
  for (const group of groups) {
    if (group.kind !== 'subject-verb') continue;
    const matched = group.matched === undefined ? null : parseSubjectVerbMatched(group.matched);
    if (matched === null) continue;
    const [a, b] = group.tokenIndices;
    if (a === undefined || b === undefined) continue;
    const tokenA = tokens[a];
    const tokenB = tokens[b];
    if (tokenA === undefined || tokenB === undefined) continue;
    const verbIsA = hasFiniteVerbRole(analysesOf(analyses, tokenA));
    const verbIsB = hasFiniteVerbRole(analysesOf(analyses, tokenB));
    if (verbIsA === verbIsB) continue; // cannot tell the sides apart — skip
    const verbIndex = verbIsA ? a : b;
    const subjectIndex = verbIsA ? b : a;

    // verb side: finite, of the matched person and number
    const verb = tokens[verbIndex]!;
    analysesOf(analyses, verb).forEach((parse, k) => {
      if (!isFiniteAnalysis(parse)) {
        eliminate(verbIndex, k);
        return;
      }
      const persons = parse.persons ?? [];
      const numbers = parse.numbers ?? [];
      if (persons.length > 0 && !persons.includes(matched.person)) eliminate(verbIndex, k);
      if (numbers.length > 0 && !numbers.some((n) => matched.numbers.includes(n))) {
        eliminate(verbIndex, k);
      }
    });

    // subject side: nominal, nominative, of the matched number
    // (1st/2nd-person links come from the pronoun lexicon; the pronoun
    // form itself is usually unambiguous, so this mainly disciplines
    // 3rd-person subjects)
    const subject = tokens[subjectIndex]!;
    analysesOf(analyses, subject).forEach((parse, k) => {
      if (!isNominal(parse)) {
        eliminate(subjectIndex, k);
        return;
      }
      if (parse.cases === undefined || !parse.cases.includes('nom')) {
        eliminate(subjectIndex, k);
        return;
      }
      if (
        matched.person === '3rd' &&
        parse.numbers !== undefined &&
        parse.numbers.length > 0 &&
        !parse.numbers.some((n) => matched.numbers.includes(n))
      ) {
        eliminate(subjectIndex, k);
      }
    });
  }

  // Guard: eliminations must never remove every parse of a token.
  for (let i = 0; i < solution.length; i++) {
    const sol = solution[i];
    const token = tokens[i];
    if (sol === undefined || token === undefined) continue;
    const count = analysesOf(analyses, token).length;
    if (sol.eliminated.length >= count) sol.eliminated = [];
  }

  // 4a. Soft: prepositional government on the immediately following token.
  for (let i = 1; i < tokens.length; i++) {
    const sol = solution[i];
    const previous = tokens[i - 1];
    const token = tokens[i];
    if (sol === undefined || previous === undefined || token === undefined) continue;
    const previousAnalyses = analysesOf(analyses, previous);
    if (previousAnalyses.length === 0) continue;
    if (!previousAnalyses.every((parse) => parse.pos === 'preposition')) continue;
    const form = previous.form.toLowerCase();
    const governed = PREP_ABL.has(form)
      ? (['abl'] as LatinCase[])
      : PREP_ACC.has(form)
        ? (['acc'] as LatinCase[])
        : null;
    if (governed === null) continue;
    analysesOf(analyses, token).forEach((parse, k) => {
      if (parse.cases === undefined) return;
      sol.scores[k] = parse.cases.some((c) => governed.includes(c))
        ? sol.scores[k]! + PREPOSITION_WEIGHT
        : sol.scores[k]! - PREPOSITION_WEIGHT;
    });
  }

  // 4b. Soft: nominative parses inside a `subject`-labeled chunk.
  for (const chunk of order) {
    if (chunk.label !== 'subject') continue;
    for (const index of chunk.tokenIndices) {
      const sol = solution[index];
      const token = tokens[index];
      if (sol === undefined || token === undefined) continue;
      analysesOf(analyses, token).forEach((parse, k) => {
        if (parse.cases !== undefined && parse.cases.includes('nom')) {
          sol.scores[k] = sol.scores[k]! + SUBJECT_BONUS;
        }
      });
    }
  }

  // 5. Selection: unique survivor, or a clear soft-margin winner.
  for (let i = 0; i < solution.length; i++) {
    const sol = solution[i];
    const token = tokens[i];
    if (sol === undefined || token === undefined) continue;
    const tokenAnalyses = analysesOf(analyses, token);
    const survivors = tokenAnalyses
      .map((_, k) => k)
      .filter((k) => !sol.eliminated.includes(k));
    if (survivors.length === 1) {
      sol.selected = survivors[0];
      continue;
    }
    if (survivors.length > 1) {
      const ranked = [...survivors].sort(
        (x, y) => sol.scores[y]! - sol.scores[x]! || x - y, // stable: morpheus order on ties
      );
      const best = ranked[0]!;
      const second = ranked[1]!;
      if (sol.scores[best]! - sol.scores[second]! >= SELECTION_MARGIN) sol.selected = best;
    }
  }

  return solution;
}
