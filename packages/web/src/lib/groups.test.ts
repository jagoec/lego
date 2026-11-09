import { describe, expect, it } from 'vitest';
import type { Sentence } from '@lego/shared';
import { groupsForToken, linkedTokenIndices } from './groups';
import { mockPassage } from './loadPassage';

const sentence = mockPassage.sentences[1];
if (sentence === undefined) throw new Error('fixture: sentence 1 missing');

describe('groupsForToken', () => {
  it('returns the groups that include the token', () => {
    // primus (index 2) agrees with qui (index 1)
    const groups = groupsForToken(sentence, 2);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe('agreement');
    expect(groups[0]?.matched).toBe('masc nom sg');
  });

  it('returns several groups for tokens in more than one', () => {
    // litora (index 10): agreement with lavinia + subject-verb with venit
    const kinds = groupsForToken(sentence, 10).map((group) => group.kind);
    expect(kinds).toEqual(expect.arrayContaining(['agreement', 'subject-verb']));
  });

  it('returns nothing for ungrouped tokens', () => {
    expect(groupsForToken(sentence, 0)).toEqual([]);
    const first = mockPassage.sentences[0];
    if (first === undefined) throw new Error('fixture: sentence 0 missing');
    expect(groupsForToken(first, 0)).toEqual([]);
  });
});

describe('linkedTokenIndices', () => {
  it('unions group partners and excludes the token itself', () => {
    // venit (index 9): subject-verb with litora
    expect(linkedTokenIndices(sentence, 9)).toEqual(new Set([10]));
    // litora (index 10): lavinia + venit
    expect(linkedTokenIndices(sentence, 10)).toEqual(new Set([8, 9]));
  });

  it('is empty when the token has no groups', () => {
    expect(linkedTokenIndices(sentence, 3)).toEqual(new Set());
  });
});
