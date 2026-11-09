/**
 * Translation evidence for parse disambiguation (Task A, step 2 —
 * `selectedBy: 'translation'`).
 *
 * A soft signal table over the ENGLISH sentence aligned to the Latin
 * sentence (see alignment.ts). Signals only ever ADD score to parses
 * that match them; a parse wins only when it leads the runner-up by at
 * least {@link SELECTION_MARGIN} points, and translation evidence is
 * applied ONLY to tokens the solver left undecided (never overturning a
 * solver selection, and only among parses the solver did not eliminate).
 *
 * ## Signal table (documented, deliberately modest)
 *
 * | English cue (regex, case-insensitive)            | signal          | weight |
 * |--------------------------------------------------|-----------------|--------|
 * | `\bI\b`                                          | person 1st      | +2     |
 * | `\b(my|me|mine)\b`                               | person 1st      | +1     |
 * | `\b(we|our|ours|us)\b`                           | person 1st      | +1     |
 * | `\b(you|your|yours|thou|thy|thee)\b`             | person 2nd      | +1     |
 * | `\b(am|is|are|was|were|be|been|being) … X(ed|en)` | passive         | +2     |
 * | `\bhaving … X(ed|en)\b`                          | participle      | +2     |
 * | `\b…Xing\b` (progressive/relative)               | participle      | +1     |
 * | `\bto <word>\b` (infinitive after verbs)         | infinitive      | +1     |
 * | `\bof\b` ("of X" constructions)                  | genitive        | +1     |
 *
 * Weights accumulate per occurrence and are capped (person 4,
 * participle 3, infinitive 3, genitive 4, passive 4) so one noisy
 * sentence cannot overwhelm everything. The caps double as guards:
 * a single "I" alone reaches margin 2 (the intended "I sing" → 1st sg
 * case), while weaker cues need several occurrences to decide.
 *
 * Scored on a Latin token's candidate parses:
 * - finite verb parse: + its person's weight;
 * - verb parse, voice passive: + passive weight;
 * - verb parse, mood participle: + participle weight;
 * - verb parse, mood infinitive: + infinitive weight;
 * - nominal parse (noun/pronoun/name/adjective) with genitive case:
 *   + genitive weight.
 */
import type { MorpheusAnalysis, Person, Token } from '@lego/shared';
import type { AnalysisMap } from '../groups.js';
import type { SentenceSolution } from './solver.js';

/** Select only when the best candidate leads by this many points. */
export const SELECTION_MARGIN = 2;

/** Signal weights per English cue; see the module doc table. */
export interface TranslationSignals {
  person: Partial<Record<Person, number>>;
  passive: number;
  participle: number;
  infinitive: number;
  genitive: number;
}

const CAPS = { person: 4, passive: 4, participle: 3, infinitive: 3, genitive: 4 } as const;

const PERSON_CUES: Readonly<{ re: RegExp; person: Person; weight: number }[]> = [
  { re: /\bI\b/g, person: '1st', weight: 2 },
  { re: /\b(?:my|me|mine)\b/gi, person: '1st', weight: 1 },
  { re: /\b(?:we|our|ours|us)\b/gi, person: '1st', weight: 1 },
  { re: /\b(?:you|your|yours|thou|thy|thee)\b/gi, person: '2nd', weight: 1 },
];

const PASSIVE_RE = /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/gi;
const HAVING_PARTICIPLE_RE = /\bhaving\s+\w+(?:ed|en|ne|t)\b/gi;
const PROGRESSIVE_RE = /\b\w+ing\b/g;
const INFINITIVE_RE = /\bto\s+[a-z]+\b/gi;
const GENITIVE_RE = /\bof\b/gi;

const cap = (value: number, max: number): number => Math.min(value, max);

/** Extract the signal table from one aligned English sentence. */
export function extractSignals(english: string): TranslationSignals {
  const person: Partial<Record<Person, number>> = {};
  for (const cue of PERSON_CUES) {
    const hits = english.match(cue.re)?.length ?? 0;
    if (hits > 0) person[cue.person] = (person[cue.person] ?? 0) + hits * cue.weight;
  }
  for (const p of ['1st', '2nd', '3rd'] as const) {
    if (person[p] !== undefined) person[p] = cap(person[p]!, CAPS.person);
  }
  return {
    person,
    passive: cap((english.match(PASSIVE_RE)?.length ?? 0) * 2, CAPS.passive),
    participle: cap(
      (english.match(HAVING_PARTICIPLE_RE)?.length ?? 0) * 2 +
        (english.match(PROGRESSIVE_RE)?.length ?? 0),
      CAPS.participle,
    ),
    infinitive: cap(english.match(INFINITIVE_RE)?.length ?? 0, CAPS.infinitive),
    genitive: cap(english.match(GENITIVE_RE)?.length ?? 0, CAPS.genitive),
  };
}

function isNominalish(parse: MorpheusAnalysis): boolean {
  return (
    parse.pos === 'noun' ||
    parse.pos === 'pronoun' ||
    parse.pos === 'name' ||
    parse.pos === 'adjective'
  );
}

/** Score one candidate parse under the signal table. */
function signalScore(parse: MorpheusAnalysis, signals: TranslationSignals): number {
  let score = 0;
  if (parse.pos === 'verb') {
    if (parse.persons !== undefined && parse.persons.length > 0) {
      const person: Person | undefined = parse.persons[0];
      if (person !== undefined) score += signals.person[person] ?? 0;
    }
    if (parse.voice === 'passive') score += signals.passive;
    if (parse.mood === 'part') score += signals.participle;
    if (parse.mood === 'inf') score += signals.infinitive;
  } else if (isNominalish(parse) && parse.cases?.includes('gen')) {
    score += signals.genitive;
  }
  return score;
}

/**
 * Apply translation evidence to the tokens of one sentence. Returns
 * tokenIndex → selected parse index for the tokens the solver left
 * undecided where the signals decide clearly; never touches solver
 * selections and never considers solver-eliminated parses.
 */
export function applyTranslationEvidence(
  tokens: readonly Token[],
  analyses: AnalysisMap,
  solution: SentenceSolution,
  signals: TranslationSignals,
): Map<number, number> {
  const picks = new Map<number, number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const sol = solution[i];
    if (token === undefined || sol === undefined) continue;
    if (sol.selected !== undefined) continue; // solver already decided

    const tokenAnalyses = analyses[token.form] ?? [];
    const candidates = tokenAnalyses
      .map((_, k) => k)
      .filter((k) => !sol.eliminated.includes(k));
    if (candidates.length < 2) continue;

    const ranked = candidates
      .map((k) => ({ k, score: signalScore(tokenAnalyses[k]!, signals) }))
      .sort((a, b) => b.score - a.score || a.k - b.k);
    const best = ranked[0]!;
    const second = ranked[1]!;
    if (best.score - second.score >= SELECTION_MARGIN) picks.set(i, best.k);
  }
  return picks;
}
