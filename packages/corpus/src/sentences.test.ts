import { describe, expect, it } from 'vitest';
import { segmentSentences } from './sentences.js';
import type { WordChunk } from './tokenize.js';

const words = (spec: readonly [string, number, string][]): WordChunk[] =>
  spec.map(([text, line, punctuation]) => ({ text, line, punctuation }));

describe('segmentSentences', () => {
  it('splits on periods, semicolons and question marks', () => {
    const sentences = segmentSentences(
      words([
        ['moenia', 7, '.'],
        ['Musa', 8, ','],
        ['memora', 8, ';'],
        ['quo', 8, '?'],
        ['tantaene', 9, '?'],
      ]),
    );
    expect(sentences.map((sentence) => sentence.words.map((word) => word.text))).toEqual([
      ['moenia'],
      ['Musa', 'memora'],
      ['quo'],
      ['tantaene'],
    ]);
    expect(sentences.map((sentence) => sentence.index)).toEqual([0, 1, 2, 3]);
  });

  it('does not split on colons', () => {
    const sentences = segmentSentences(
      words([
        ['secum', 37, ':'],
        ['Mene', 37, ','],
        ['victam', 37, ','],
      ]),
    );
    expect(sentences).toHaveLength(1);
  });

  it('does not split on a terminator inside parentheses', () => {
    // l. 251: navibus (infandum!) amissis, …
    const sentences = segmentSentences(
      words([
        ['navibus', 251, '('],
        ['infandum', 251, '!)'],
        ['amissis', 251, ','],
        ['oram', 251, '.'],
      ]),
    );
    expect(sentences.map((sentence) => sentence.words.map((word) => word.text))).toEqual([
      ['navibus', 'infandum', 'amissis', 'oram'],
    ]);
  });

  it('spans verse lines and reports lineStart/lineEnd from first/last token', () => {
    // Aeneid 1.1–7 is one sentence from "Arma" to "Romae."
    const sentences = segmentSentences(
      words([
        ['Arma', 1, ''],
        ['cano', 1, ','],
        ['venit', 2, ''],
        ['litora', 3, ','],
        ['Romae', 7, '.'],
        ['Musa', 8, ','],
      ]),
    );
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toMatchObject({ index: 0, lineStart: 1, lineEnd: 7 });
    expect(sentences[1]).toMatchObject({ index: 1, lineStart: 8, lineEnd: 8 });
  });

  it('closes a final sentence without trailing terminator', () => {
    const sentences = segmentSentences(words([['oris', 1, '']]));
    expect(sentences).toHaveLength(1);
    expect(sentences[0]?.words[0]?.text).toBe('oris');
  });
});
