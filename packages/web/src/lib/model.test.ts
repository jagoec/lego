import { describe, expect, it } from 'vitest';
import {
  analysesForToken,
  buildLineRows,
  getToken,
  lineRangeLabel,
  sentenceBreaks,
  tokenText,
} from './model';
import { mockPassage } from './loadPassage';

describe('buildLineRows', () => {
  const rows = buildLineRows(mockPassage.sentences);

  it('lays the passage out by verse line, sorted', () => {
    expect(rows.map((row) => row.line)).toEqual([1, 2]);
  });

  it('merges tokens from different sentences that share a line', () => {
    const line1 = rows[0];
    if (line1 === undefined) throw new Error('row for line 1 missing');
    // sentence 0 (Arma virumque cano) + first half of sentence 2
    expect(line1.items.map((item) => item.token.text)).toEqual([
      'Arma',
      'virumque',
      'cano',
      'troiae',
      'qui',
      'primus',
      'ab',
      'oris',
    ]);
    expect(line1.items.map((item) => item.key.sentenceIndex)).toEqual([0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('marks the sentence boundary inside a shared line', () => {
    const line1 = rows[0];
    if (line1 === undefined) throw new Error('row for line 1 missing');
    expect(sentenceBreaks(line1.items)).toEqual([
      false,
      false,
      false,
      true, // cano, | troiae
      false,
      false,
      false,
      false,
    ]);
    const line2 = rows[1];
    if (line2 === undefined) throw new Error('row for line 2 missing');
    expect(sentenceBreaks(line2.items).every((isBreak) => isBreak === false)).toBe(true);
  });
});

describe('helpers', () => {
  const sentence = mockPassage.sentences[1];
  if (sentence === undefined) throw new Error('fixture: sentence 1 missing');

  it('getToken tolerates bad indices', () => {
    expect(getToken(sentence, 2)?.text).toBe('primus');
    expect(getToken(sentence, 99)).toBeUndefined();
  });

  it('tokenText appends punctuation', () => {
    const cano = getToken(mockPassage.sentences[0]!, 2);
    if (cano === undefined) throw new Error('fixture: cano missing');
    expect(tokenText(cano)).toBe('cano,');
    const qui = getToken(sentence, 1);
    if (qui === undefined) throw new Error('fixture: qui missing');
    expect(tokenText(qui)).toBe('qui');
  });

  it('lineRangeLabel collapses single-line ranges', () => {
    expect(lineRangeLabel(mockPassage.sentences[0]!)).toBe('line 1');
    expect(lineRangeLabel(sentence)).toBe('lines 1–2');
  });

  it('analysesForToken reads the shared analyses map', () => {
    expect(analysesForToken(mockPassage, getToken(sentence, 2)!)).toHaveLength(1);
    expect(analysesForToken(mockPassage, getToken(sentence, 7)!)).toEqual([]);
  });
});
