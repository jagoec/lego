/**
 * Reading-order chunks (heuristic, overridable later).
 *
 * First-pass sense-unit chunking, deliberately simple and deterministic:
 *
 * - a conjunction (any analysis with pos conjunction) closes the current
 *   chunk and forms its own single-token chunk labeled `conjunction`;
 * - a finite verb anchors a single-token chunk labeled `verb` — a form
 *   counts as a finite verb only per `hasFiniteVerbRole`: indicative or
 *   subjunctive parses always qualify, but a bare imperative parse
 *   beside nominal parses does not (morpheus reads `Arma` as both noun
 *   and imperative of `armo`);
 * - a preposition (pos preposition) starts a chunk labeled `phrase` that
 *   absorbs the following tokens until the next trigger (conjunction,
 *   preposition, or finite verb);
 * - all remaining tokens accumulate into run chunks in between. A run
 *   chunk is labeled `subject` only when it contains a token all of whose
 *   analyses are unambiguous nominatives of a noun/pronoun/name — the
 *   most common subject shape. Otherwise the label is omitted rather
 *   than guessed.
 *
 * Trigger classification precedence is conjunction > preposition >
 * finite verb (a form like `cum`, analyzable as both conj and prep,
 * becomes a conjunction chunk). Every token lands in exactly one chunk
 * and chunks are emitted in sentence order with `order` = 1..n.
 */
import type { Chunk, MorpheusAnalysis, Token } from '@lego/shared';
import { hasFiniteVerbRole } from './groups.js';
import type { AnalysisMap } from './groups.js';

type Trigger = 'conjunction' | 'preposition' | 'verb';

function triggerOf(analyses: readonly MorpheusAnalysis[]): Trigger | null {
  if (analyses.some((a) => a.pos === 'conjunction')) return 'conjunction';
  if (analyses.some((a) => a.pos === 'preposition')) return 'preposition';
  if (hasFiniteVerbRole(analyses)) return 'verb';
  return null;
}

/** A run chunk is labeled subject only if some token is an unambiguous nominative nominal. */
export function isUnambiguousNominative(analyses: readonly MorpheusAnalysis[]): boolean {
  if (analyses.length === 0) return false;
  return analyses.every(
    (a) =>
      (a.pos === 'noun' || a.pos === 'pronoun' || a.pos === 'name') &&
      a.cases !== undefined &&
      a.cases.length === 1 &&
      a.cases[0] === 'nom',
  );
}

/** Reading-order chunks for one sentence (see module doc). */
export function buildOrder(tokens: readonly Token[], analyses: AnalysisMap): Chunk[] {
  const chunks: Chunk[] = [];
  /** indices of the currently open run chunk (empty = none open) */
  let run: number[] = [];
  /** label of the open run: 'phrase' after a preposition, else undefined */
  let runLabel: string | undefined;

  const closeRun = (): void => {
    if (run.length === 0) return;
    const label =
      runLabel === 'phrase'
        ? 'phrase'
        : run.some((index) => isUnambiguousNominative(analyses[tokens[index]?.form ?? ''] ?? []))
          ? 'subject'
          : undefined;
    chunks.push({ order: 0, label, tokenIndices: run });
    run = [];
    runLabel = undefined;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined) continue;
    const trigger = triggerOf(analyses[token.form] ?? []);

    if (trigger === null) {
      run.push(i);
    } else if (trigger === 'conjunction') {
      closeRun();
      chunks.push({ order: 0, label: 'conjunction', tokenIndices: [i] });
    } else if (trigger === 'preposition') {
      closeRun();
      run = [i];
      runLabel = 'phrase';
    } else {
      closeRun();
      chunks.push({ order: 0, label: 'verb', tokenIndices: [i] });
    }
  }
  closeRun();
  return chunks.map((chunk, i) => ({ ...chunk, order: i + 1 }));
}
