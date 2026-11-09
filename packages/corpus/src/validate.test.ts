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

describe('validatePassage — v2 clauses and roles', () => {
  const options = { maxLine: 756, allowedExtraAnalyses: ['que', 've', 'ne'] };

  const withClauses: Passage = {
    ...validPassage,
    sentences: [
      {
        ...validPassage.sentences[0]!,
        order: [
          { order: 1, label: undefined, role: 'predicate', clauseId: 0, tokenIndices: [0, 1] },
          { order: 2, label: 'verb', role: 'verb', clauseId: 0, tokenIndices: [2] },
        ],
        clauses: [
          { id: 0, kind: 'main', tokenIndices: [0, 1, 2] },
        ],
      },
    ],
  };

  it('accepts clauses that cover all tokens exactly once with a main clause id 0', () => {
    expect(validatePassage(withClauses, options)).toEqual([]);
  });

  it('requires the first clause to be the main clause with id 0', () => {
    const broken: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          clauses: [{ id: 1, kind: 'relative', tokenIndices: [0, 1, 2] }],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].clauses[0]: first clause must be the main clause (id 0, kind "main")');
    expect(errors).toContain('sentence[0]: main clause must be id 0');
  });

  it('rejects clause token overlap, gaps, out-of-range and non-ascending indices', () => {
    const broken: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          clauses: [
            { id: 0, kind: 'main', tokenIndices: [2, 0] },
            { id: 1, kind: 'relative', tokenIndices: [1, 1] },
            { id: 2, kind: 'adverbial', tokenIndices: [9] },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].clauses[0]: tokenIndices not ascending');
    expect(errors).toContain('sentence[0].clauses[1]: duplicate tokenIndex 1');
    expect(errors).toContain('sentence[0].clauses[2]: tokenIndex 9 out of range');
  });

  it('requires subordinate clause ids in appearance order', () => {
    const broken: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          clauses: [
            { id: 0, kind: 'main', tokenIndices: [0] },
            { id: 2, kind: 'relative', tokenIndices: [1] },
            { id: 1, kind: 'adverbial', tokenIndices: [2] },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].clauses[2]: clause id 1 not in appearance order (previous 2)');
  });

  it('requires every chunk to carry a clauseId referencing an existing clause', () => {
    const broken: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          order: [
            { order: 1, role: 'predicate', clauseId: 0, tokenIndices: [0, 1] },
            { order: 2, label: 'verb', role: 'verb', clauseId: 5, tokenIndices: [2] },
          ],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].order[1]: clauseId 5 references no clause');

    const noClauseId: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          order: [
            { order: 1, role: 'predicate', clauseId: 0, tokenIndices: [0, 1] },
            { order: 2, label: 'verb', role: 'verb', tokenIndices: [2] },
          ],
        },
      ],
    };
    expect(validatePassage(noClauseId, options)).toContain(
      'sentence[0].order[1]: chunk without clauseId (sentence has clauses)',
    );
  });

  it('rejects unknown roles and unknown clause kinds', () => {
    const broken: Passage = {
      ...withClauses,
      sentences: [
        {
          ...withClauses.sentences[0]!,
          order: [
            { order: 1, role: 'object' as never, clauseId: 0, tokenIndices: [0, 1] },
            { order: 2, label: 'verb', role: 'verb', clauseId: 0, tokenIndices: [2] },
          ],
          clauses: [{ id: 0, kind: 'gerundial' as never, tokenIndices: [0, 1, 2] }],
        },
      ],
    };
    const errors = validatePassage(broken, options);
    expect(errors).toContain('sentence[0].order[0]: unknown role "object"');
    expect(errors).toContain('sentence[0].clauses[0]: unknown kind "gerundial"');
  });

  it('validates selected/selectedBy against the analyses map', () => {
    const good: Passage = {
      ...withClauses,
      analyses: { ...withClauses.analyses, cano: [{ pos: 'verb', lemma: 'cano', features: [] }, { pos: 'verb', lemma: 'cano', features: [] }] },
      sentences: [
        {
          ...withClauses.sentences[0]!,
          tokens: [
            withClauses.sentences[0]!.tokens[0]!,
            withClauses.sentences[0]!.tokens[1]!,
            { index: 2, text: 'cano', form: 'cano', line: 1, selected: 1, selectedBy: 'solver' },
          ],
        },
      ],
    };
    expect(validatePassage(good, options)).toEqual([]);

    const outOfRange: Passage = {
      ...good,
      sentences: [
        {
          ...good.sentences[0]!,
          tokens: good.sentences[0]!.tokens.map((token, i) =>
            i === 2 ? { ...token, selected: 5 } : token,
          ),
        },
      ],
    };
    expect(validatePassage(outOfRange, options)).toContain(
      'sentence[0].tokens[2]: selected 5 out of range for 2 analyses',
    );

    const noProvenance: Passage = {
      ...good,
      sentences: [
        {
          ...good.sentences[0]!,
          tokens: good.sentences[0]!.tokens.map((token, i) => {
            if (i !== 2) return token;
            const { selectedBy: _drop, ...rest } = token;
            return rest as typeof token;
          }),
        },
      ],
    };
    expect(validatePassage(noProvenance, options)).toContain(
      'sentence[0].tokens[2]: selected without selectedBy',
    );
  });
});
