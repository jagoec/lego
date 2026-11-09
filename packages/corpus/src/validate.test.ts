import { describe, expect, it } from 'vitest';
import type { Group, Passage } from '@lego/shared';
import { validatePassage } from './validate.js';

const source = { name: 'n', url: 'u', license: 'l' };

const validPassage: Passage = {
  work: 'Vergil',
  book: 1,
  title: 'Aeneid',
  sentences: [
    {
      index: 0,
      lineStart: 1,
      lineEnd: 1,
      tokens: [
        { index: 0, text: 'Arma', form: 'Arma', line: 1 },
        { index: 1, text: 'virumque', form: 'virum', line: 1, punctuation: ',' },
        { index: 2, text: 'cano', form: 'cano', line: 1, punctuation: ',', enclitics: undefined },
      ],
      groups: [
        { kind: 'agreement', tokenIndices: [0, 1], matched: 'acc pl' },
        { kind: 'subject-verb', tokenIndices: [0, 2], matched: '3rd pl' },
      ],
      order: [
        { order: 1, label: undefined, tokenIndices: [0, 1] },
        { order: 2, label: 'verb', tokenIndices: [2] },
      ],
    },
  ],
  analyses: {
    Arma: [],
    virum: [],
    cano: [],
    que: [],
    ve: [],
    ne: [],
  },
  source,
};

describe('validatePassage', () => {
  const options = { maxLine: 756, allowedExtraAnalyses: ['que', 've', 'ne'] };

  it('accepts a well-formed passage', () => {
    expect(validatePassage(validPassage, options)).toEqual([]);
  });

  it('requires every token form in the analyses map', () => {
    const broken: Passage = {
      ...validPassage,
      analyses: { Arma: [], cano: [], que: [], ve: [], ne: [] }, // virum missing
    };
    expect(validatePassage(broken, options)).toContain('analyses map is missing form "virum" (token "virumque")');
  });

  it('flags analysis entries no token uses (beyond the bare enclitics)', () => {
    const broken: Passage = {
      ...validPassage,
      analyses: { ...validPassage.analyses, vacca: [] },
    };
    expect(validatePassage(broken, options)).toContain('analyses map has an entry for "vacca" but no token uses that form');
  });

  it('checks token indices, lines and sentence line ranges', () => {
    const broken: Passage = {
      ...validPassage,
      sentences: [
        {
          ...validPassage.sentences[0]!,
          index: 3,
          lineStart: 2,
          lineEnd: 0,
          tokens: [
            { index: 0, text: 'Arma', form: 'Arma', line: 900 },
            { index: 5, text: 'cano', form: 'cano', line: 1 },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0]: index is 3, expected 0');
    expect(errors).toContain('sentence[0].tokens[1]: index is 5, expected 1');
    expect(errors).toContain('sentence[0].tokens[0]: line 900 out of range 1..756');
    expect(errors).toContain('sentence[0]: lineStart is 2, expected 1');
    expect(errors).toContain('sentence[0]: lineEnd is 0, expected 900');
  });

  it('checks group token indices and duplicates', () => {
    const broken: Passage = {
      ...validPassage,
      sentences: [
        {
          ...validPassage.sentences[0]!,
          groups: [
            { kind: 'agreement', tokenIndices: [0] },
            { kind: 'agreement', tokenIndices: [0, 9] },
            { kind: 'subject-verb', tokenIndices: [0, 0] },
            { kind: 'bogus' as Group['kind'], tokenIndices: [0, 1] },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].groups[0]: fewer than 2 tokenIndices');
    expect(errors).toContain('sentence[0].groups[1]: tokenIndex 9 out of range');
    expect(errors).toContain('sentence[0].groups[2]: duplicate tokenIndex 0');
    expect(errors.some((error) => error.includes('unknown kind "bogus"'))).toBe(true);
  });

  it('requires reading-order chunks to cover every token exactly once, in order', () => {
    const missing: Passage = {
      ...validPassage,
      sentences: [
        { ...validPassage.sentences[0]!, order: [{ order: 1, label: 'verb', tokenIndices: [2] }] },
      ],
    };
    expect(validatePassage(missing, options)).toContain('sentence[0]: token 0 is in no reading-order chunk');

    const duplicate: Passage = {
      ...validPassage,
      sentences: [
        {
          ...validPassage.sentences[0]!,
          order: [
            { order: 1, tokenIndices: [0, 1] },
            { order: 1, tokenIndices: [1, 2] },
          ],
        },
      ],
    };
    const errors = validatePassage(duplicate, options);
    expect(errors).toContain('sentence[0].order[1]: order is 1, expected 2');
    expect(errors).toContain('sentence[0].order[1]: token 1 already covered by an earlier chunk');
  });

  it('rejects empty metadata and non-word forms', () => {
    const broken: Passage = {
      ...validPassage,
      work: '',
      source: { name: '', url: '', license: '' },
      sentences: [
        {
          ...validPassage.sentences[0]!,
          tokens: [
            { index: 0, text: 'Arma,', form: 'arma virum', line: 1 },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('passage.work is empty');
    expect(errors).toContain('passage.source.name is empty');
    expect(errors).toContain('passage.source.url is empty');
    expect(errors).toContain('passage.source.license is empty');
    expect(errors).toContain('sentence[0].tokens[0]: text "Arma," is not a bare word');
    expect(errors).toContain('sentence[0].tokens[0]: form "arma virum" is not a bare word');
  });
});
