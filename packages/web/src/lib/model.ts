import type { MorpheusAnalysis, Passage, Sentence, Token } from '@lego/shared';

/** Identifies one token in the passage (tokens are indexed per sentence). */
export interface TokenKey {
  sentenceIndex: number;
  tokenIndex: number;
}

/** A token plus where it came from. */
export interface LineItem {
  key: TokenKey;
  token: Token;
}

/**
 * One verse line of the reader view. Because sentences can start and end
 * mid-line, a line can contain tokens from several sentences, in reading
 * order. Sentence boundaries inside a line are marked while rendering.
 */
export interface LineRow {
  line: number;
  items: LineItem[];
}

/**
 * Lay the whole passage out by verse line: tokens are grouped by their
 * `line` property, lines are sorted, and tokens keep sentence/reading
 * order within each line.
 */
export function buildLineRows(sentences: Sentence[]): LineRow[] {
  const byLine = new Map<number, LineItem[]>();
  sentences.forEach((sentence, sentenceIndex) => {
    sentence.tokens.forEach((token, tokenIndex) => {
      const key: TokenKey = { sentenceIndex, tokenIndex };
      const items = byLine.get(token.line);
      if (items === undefined) byLine.set(token.line, [{ key, token }]);
      else items.push({ key, token });
    });
  });
  return [...byLine.entries()]
    .sort(([a], [b]) => a - b)
    .map(([line, items]) => ({ line, items }));
}

/** True where the sentence changes between consecutive items of a line. */
export function sentenceBreaks(items: LineItem[]): boolean[] {
  return items.map((item, i) => i > 0 && items[i - 1]?.key.sentenceIndex !== item.key.sentenceIndex);
}

/** Look up a token, tolerating out-of-range indices from hand-edited data. */
export function getToken(sentence: Sentence, tokenIndex: number): Token | undefined {
  return sentence.tokens[tokenIndex];
}

/** Token text with its trailing punctuation, for plain-text rendering. */
export function tokenText(token: Token): string {
  return token.text + (token.punctuation ?? '');
}

/** Sentence line range as a short label, e.g. "line 3" / "lines 3–5". */
export function lineRangeLabel(sentence: Sentence): string {
  if (sentence.lineStart === sentence.lineEnd) return `line ${sentence.lineStart}`;
  return `lines ${sentence.lineStart}–${sentence.lineEnd}`;
}

/** Analyses for a token, from the passage's shared form→analyses map. */
export function analysesForToken(passage: Passage, token: Token) {
  return passage.analyses[token.form] ?? [];
}

/**
 * The contextually correct parse of an ambiguous form, as chosen by the
 * corpus disambiguator (`token.selected`). Null when the token has no
 * usable selection — no selection at all, a single parse (nothing to
 * disambiguate), or an out-of-range index from hand-edited data.
 */
export function selectedAnalysis(
  token: Token,
  analyses: MorpheusAnalysis[],
): MorpheusAnalysis | null {
  if (analyses.length <= 1 || token.selected === undefined) return null;
  return analyses[token.selected] ?? null;
}

/**
 * The parse the UI should treat as *the* parse of the word: the selected
 * one when present, otherwise the first analysis (v1 show-all behavior
 * still lists every parse; this is the one that gets top billing, drives
 * the ambiguous styling, and feeds the paradigm panel).
 */
export function chosenAnalysis(
  token: Token,
  analyses: MorpheusAnalysis[],
): MorpheusAnalysis | undefined {
  return selectedAnalysis(token, analyses) ?? analyses[0];
}
