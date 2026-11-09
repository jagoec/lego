import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis, Token } from '@lego/shared';
import { buildOrder } from './order.js';
import type { AnalysisMap } from './groups.js';

const token = (form: string, index: number): Token => ({ index, text: form, form, line: 1 });

function analysis(pos: MorpheusAnalysis['pos'], extra: Partial<MorpheusAnalysis> = {}): MorpheusAnalysis {
  return { pos, lemma: pos, features: [], ...extra };
}

function mapOf(entries: readonly (readonly [string, MorpheusAnalysis[]])[]): AnalysisMap {
  return Object.fromEntries(entries);
}

describe('buildOrder', () => {
  it('chunks the opening of Aeneid 1 into object run, verb, run, and prepositional phrase', () => {
    // "Arma virumque cano, Troiae qui primus ab oris"
    const tokens = ['Arma', 'virum', 'cano', 'Troiae', 'qui', 'primus', 'ab', 'oris'].map(token);
    const analyses = mapOf([
      // Arma is noun AND imperative of armo — must NOT be a verb trigger
      ['Arma', [analysis('noun', { cases: ['nom', 'voc', 'acc'], numbers: ['pl'], genders: ['neut'] }), analysis('verb', { mood: 'imperat', persons: ['2nd'], numbers: ['sg'] })]],
      ['virum', [analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['masc'] })]],
      ['cano', [analysis('verb', { mood: 'ind', persons: ['1st'], numbers: ['sg'] }), analysis('noun', { cases: ['abl', 'dat'], numbers: ['sg'], genders: ['masc'] })]],
      ['Troiae', [analysis('name', { cases: ['gen', 'dat'], numbers: ['sg'], genders: ['neut'] })]],
      ['qui', [analysis('pronoun', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['primus', [analysis('adjective', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['ab', [analysis('preposition')]],
      ['oris', [analysis('noun', { cases: ['abl', 'gen'], numbers: ['pl'], genders: ['fem'] })]],
    ]);
    expect(buildOrder(tokens, analyses)).toEqual([
      { order: 1, label: undefined, tokenIndices: [0, 1] }, // Arma virum — no confident label
      { order: 2, label: 'verb', tokenIndices: [2] }, // cano
      { order: 3, label: 'subject', tokenIndices: [3, 4, 5] }, // Troiae qui primus (qui is unambiguous nom)
      { order: 4, label: 'phrase', tokenIndices: [6, 7] }, // ab oris
    ]);
  });

  it('gives conjunctions their own single-token chunk', () => {
    // "litora, multum ille et terris iactatus et alto"
    const tokens = ['litora', 'multum', 'ille', 'et', 'terris', 'iactatus', 'et', 'alto'].map(token);
    const analyses = mapOf([
      ['litora', [analysis('noun', { cases: ['nom', 'acc'], numbers: ['pl'], genders: ['neut'] })]],
      ['multum', [analysis('adverb')]],
      ['ille', [analysis('pronoun', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['et', [analysis('conjunction')]],
      ['terris', [analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] })]],
      ['iactatus', [analysis('verb', { mood: 'part', cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['alto', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['neut'] })]],
    ]);
    const chunks = buildOrder(tokens, analyses);
    expect(chunks).toEqual([
      { order: 1, label: 'subject', tokenIndices: [0, 1, 2] },
      { order: 2, label: 'conjunction', tokenIndices: [3] },
      { order: 3, label: undefined, tokenIndices: [4, 5] },
      { order: 4, label: 'conjunction', tokenIndices: [6] },
      { order: 5, label: undefined, tokenIndices: [7] },
    ]);
  });

  it('lets a prepositional phrase absorb tokens until the next trigger', () => {
    // "vi superum saevae memorem Iunonis ob iram" (no verbs)
    const tokens = ['vi', 'superum', 'saevae', 'memorem', 'Iunonis', 'ob', 'iram'].map(token);
    const analyses = mapOf([
      ['vi', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['superum', [analysis('noun', { cases: ['gen'], numbers: ['pl'], genders: ['masc'] })]],
      ['saevae', [analysis('adjective', { cases: ['gen'], numbers: ['sg'], genders: ['fem'] })]],
      ['memorem', [analysis('adjective', { cases: ['acc'], numbers: ['sg'], genders: ['fem'] })]],
      ['Iunonis', [analysis('name', { cases: ['gen'], numbers: ['sg'], genders: ['fem'] })]],
      ['ob', [analysis('preposition')]],
      ['iram', [analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['fem'] })]],
    ]);
    expect(buildOrder(tokens, analyses)).toEqual([
      { order: 1, label: undefined, tokenIndices: [0, 1, 2, 3, 4] },
      { order: 2, label: 'phrase', tokenIndices: [5, 6] },
    ]);
  });

  it('classifies conj/prep ambiguous forms (cum) as conjunction', () => {
    const tokens = ['cum', 'gente'].map(token);
    const analyses = mapOf([
      ['cum', [analysis('conjunction'), analysis('preposition'), analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['neut'] })]],
      ['gente', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
    ]);
    expect(buildOrder(tokens, analyses)).toEqual([
      { order: 1, label: 'conjunction', tokenIndices: [0] },
      { order: 2, label: undefined, tokenIndices: [1] },
    ]);
  });

  it('leaves unanalyzed tokens in plain run chunks', () => {
    const tokens = ['gesserat', 'quianam'].map(token);
    expect(buildOrder(tokens, {})).toEqual([{ order: 1, label: undefined, tokenIndices: [0, 1] }]);
  });

  it('covers every token exactly once (property, randomized order of triggers)', () => {
    const tokens = ['a', 'b', 'c', 'd', 'e'].map(token);
    const analyses = mapOf([
      ['a', [analysis('adverb')]],
      ['b', [analysis('conjunction')]],
      ['c', [analysis('verb', { mood: 'subj', persons: ['3rd'], numbers: ['sg'] })]],
      ['d', [analysis('preposition')]],
      ['e', [analysis('noun', { cases: ['acc'], numbers: ['pl'], genders: ['neut'] })]],
    ]);
    const chunks = buildOrder(tokens, analyses);
    const covered = chunks.flatMap((chunk) => chunk.tokenIndices);
    expect(covered.sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
    expect(chunks.map((chunk) => chunk.order)).toEqual(chunks.map((_, i) => i + 1));
  });
});
