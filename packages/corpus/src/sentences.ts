/**
 * Sentence segmentation for the tokenized stream.
 *
 * A sentence ends after any token whose trailing punctuation contains a
 * sentence terminator — `.` `;` `?` `!` — EXCEPT inside an unbalanced
 * parenthesis: the one parenthetical interjection of this text,
 * `(infandum!)` at Aen. 1.251, must not break its sentence open.
 * Colons (frequent before speeches: `haec secum:`, `his vocibus usa est:`)
 * are not sentence boundaries. Sentences routinely span verse lines;
 * `lineStart`/`lineEnd` come from the first/last token's line.
 *
 * There are no abbreviations to guard against in Vergil.
 */
import type { WordChunk } from './tokenize.js';
import { SENTENCE_TERMINATORS } from './tokenize.js';

export interface RawSentence {
  /** 0-based position in the passage */
  index: number;
  lineStart: number;
  lineEnd: number;
  words: WordChunk[];
}

const TERMINATORS: readonly string[] = ['.', ';', '?', '!'];

/**
 * Whether the trailing punctuation ends the sentence. Terminators inside
 * an unbalanced parenthesis do not count — and the check is positional:
 * in `(infandum!)` the `!` sits before the closing `)`, so the paren is
 * still open there.
 */
function terminates(punctuation: string, parenDepthBefore: number): boolean {
  let depth = parenDepthBefore;
  for (const ch of punctuation) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (depth <= 0 && TERMINATORS.includes(ch)) return true;
  }
  return false;
}

function parenDelta(punctuation: string): number {
  let delta = 0;
  for (const ch of punctuation) {
    if (ch === '(') delta += 1;
    else if (ch === ')') delta -= 1;
  }
  return delta;
}

/**
 * Segment the flat word stream into sentences. Every input word ends up
 * in exactly one sentence, in order.
 */
export function segmentSentences(words: readonly WordChunk[]): RawSentence[] {
  const sentences: RawSentence[] = [];
  let current: WordChunk[] = [];
  let parenDepth = 0;

  const close = (): void => {
    if (current.length === 0) return;
    sentences.push({
      index: sentences.length,
      lineStart: current[0]?.line ?? 0,
      lineEnd: current[current.length - 1]?.line ?? 0,
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    current.push(word);
    if (terminates(word.punctuation, parenDepth)) close();
    parenDepth += parenDelta(word.punctuation);
  }
  close();
  return sentences;
}
