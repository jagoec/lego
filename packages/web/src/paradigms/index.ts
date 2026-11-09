import type { Passage, Token } from '@lego/shared';
import { analysesForToken, chosenAnalysis, getToken, type TokenKey } from '../lib/model';
import { ENCLITIC_FORMS, tableForAnalysis } from './map';
import { highlightsFor } from './highlight';
import type { ParadigmTable } from './types';

export type { ParadigmTable, TableId, Highlight } from './types';
export { TABLES, getTable } from './data';
export { tableForAnalysis, UNMAPPED_STEMS, ENCLITIC_FORMS } from './map';
export { highlightsFor, nominalHighlights, verbHighlights } from './highlight';

/**
 * What the side panel should show for the current word. `idle` when no
 * word is active; `none` for words with no table (unmapped stems,
 * enclitics, unanalyzed forms); `table` with the word's highlighted
 * cells otherwise.
 */
export type ParadigmState =
  | { kind: 'idle' }
  | { kind: 'none'; word: string; reason?: string }
  | { kind: 'table'; word: string; table: ParadigmTable; note?: string; highlights: ReturnType<typeof highlightsFor> };

/**
 * The paradigm state for the currently hovered/focused token (the same
 * `active` key that drives the popover). Uses the corpus-selected parse
 * when present, else the first analysis.
 */
export function paradigmForActive(passage: Passage, active: TokenKey | null): ParadigmState {
  if (active === null) return { kind: 'idle' };
  const sentence = passage.sentences[active.sentenceIndex];
  if (sentence === undefined) return { kind: 'idle' };
  const token = getToken(sentence, active.tokenIndex);
  if (token === undefined) return { kind: 'idle' };
  return paradigmForToken(passage, token);
}

/**
 * The paradigm state for one token. Enclitic particles never get a
 * table; neither do forms morpheus could not parse.
 */
export function paradigmForToken(passage: Passage, token: Token): ParadigmState {
  if (ENCLITIC_FORMS.has(token.form)) {
    return { kind: 'none', word: token.text, reason: 'enclitic particle' };
  }
  const analyses = analysesForToken(passage, token);
  if (analyses.length === 0) {
    return { kind: 'none', word: token.text, reason: 'no analysis available' };
  }
  const chosen = chosenAnalysis(token, analyses);
  if (chosen === undefined) return { kind: 'none', word: token.text };

  const mapping = tableForAnalysis(chosen);
  if ('table' in mapping) {
    return {
      kind: 'table',
      word: token.text,
      table: mapping.table,
      note: mapping.note,
      highlights: highlightsFor(chosen, mapping.table),
    };
  }
  return { kind: 'none', word: token.text, reason: mapping.reason };
}
