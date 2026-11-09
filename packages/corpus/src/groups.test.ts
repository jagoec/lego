import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis, Token } from '@lego/shared';
import { agreementGroups, buildGroups, hasFiniteVerbRole, subjectVerbGroups } from './groups.js';
import type { AnalysisMap } from './groups.js';

// ---------------------------------------------------------------------------
// Synthetic fixtures
// ---------------------------------------------------------------------------

const token = (form: string, index: number): Token => ({ index, text: form, form, line: 1 });

function analysis(partial: Partial<MorpheusAnalysis> & { pos: MorpheusAnalysis['pos']; lemma: string }): MorpheusAnalysis {
  return { features: [], ...partial };
}

const noun = (form: string, cases: string[], numbers: string[], genders?: string[]): MorpheusAnalysis =>
  analysis({ pos: 'noun', lemma: form, cases: cases as MorpheusAnalysis['cases'], numbers: numbers as MorpheusAnalysis['numbers'], genders: genders as MorpheusAnalysis['genders'] });

const adjective = (lemma: string, cases: string[], numbers: string[], genders?: string[]): MorpheusAnalysis =>
  analysis({ pos: 'adjective', lemma, cases: cases as MorpheusAnalysis['cases'], numbers: numbers as MorpheusAnalysis['numbers'], genders: genders as MorpheusAnalysis['genders'] });

const participle = (lemma: string, cases: string[], numbers: string[], genders?: string[]): MorpheusAnalysis =>
  analysis({ pos: 'verb', lemma, mood: 'part', cases: cases as MorpheusAnalysis['cases'], numbers: numbers as MorpheusAnalysis['numbers'], genders: genders as MorpheusAnalysis['genders'] });

const verb = (persons: string[], numbers: string[], mood: 'ind' | 'subj' | 'imperat' = 'ind'): MorpheusAnalysis =>
  analysis({ pos: 'verb', lemma: 'ago', mood, persons: persons as MorpheusAnalysis['persons'], numbers: numbers as MorpheusAnalysis['numbers'] });

/** Analyses for whole "words" keyed by form. */
function mapOf(entries: readonly (readonly [string, MorpheusAnalysis[]])[]): AnalysisMap {
  return Object.fromEntries(entries);
}

describe('agreementGroups', () => {
  it('pairs adjectives with agreeing nouns on both sides: saevae ↔ Iunonis (gen sg fem), memorem ↔ iram (acc sg fem)', () => {
    // "saevae memorem Iunonis ob iram": the real syntax of Aeneid 1.4 —
    // saevae belongs forward to Iunonis, memorem forward to iram.
    const tokens = ['saevae', 'memorem', 'Iunonis', 'ob', 'iram'].map(token);
    const analyses = mapOf([
      ['saevae', [adjective('saevus', ['gen', 'dat'], ['sg'], ['fem'])]],
      ['memorem', [adjective('memor', ['acc'], ['sg'], ['fem'])]],
      ['Iunonis', [analysis({ pos: 'name', lemma: 'Iuno', cases: ['gen'], numbers: ['sg'], genders: ['fem'] })]],
      ['ob', [analysis({ pos: 'preposition', lemma: 'ob' })]],
      ['iram', [noun('ira', ['acc'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([
      { kind: 'agreement', tokenIndices: [0, 2], matched: 'gen sg fem' },
      { kind: 'agreement', tokenIndices: [1, 4], matched: 'acc sg fem' },
    ]);
  });

  it('pairs an adjective with the nearest following noun when nothing precedes', () => {
    // "multum ille et terris iactatus et alto": iactatus ↔ ille (nom sg masc)
    const tokens = ['multum', 'ille', 'et', 'terris', 'iactatus', 'et', 'alto'].map(token);
    const analyses = mapOf([
      ['multum', [analysis({ pos: 'adverb', lemma: 'multum' })]],
      ['ille', [analysis({ pos: 'pronoun', lemma: 'ille', cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['et', [analysis({ pos: 'conjunction', lemma: 'et' })]],
      ['terris', [noun('terra', ['abl'], ['pl'], ['fem'])]],
      ['iactatus', [participle('iacto', ['nom'], ['sg'], ['masc'])]],
      ['alto', [noun('altum', ['abl'], ['sg'], ['neut'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([
      { kind: 'agreement', tokenIndices: [1, 4], matched: 'nom sg masc' },
    ]);
  });

  it('requires gender agreement when both sides have genders', () => {
    const tokens = ['puellam', 'bonam'].map(token); // fem noun + fem adj
    const tokensM = ['virum', 'bonam'].map(token); // masc noun + fem adj
    const analyses = mapOf([
      ['puellam', [noun('puella', ['acc'], ['sg'], ['fem'])]],
      ['virum', [noun('vir', ['acc'], ['sg'], ['masc'])]],
      ['bonam', [adjective('bonus', ['acc'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([
      { kind: 'agreement', tokenIndices: [0, 1], matched: 'acc sg fem' },
    ]);
    expect(agreementGroups(tokensM, analyses)).toEqual([]);
  });

  it('treats common gender as agreeing with masc/fem but not neut', () => {
    const analyses = mapOf([
      ['nautam', [noun('nauta', ['acc'], ['sg'], ['common'])]],
      ['bonam', [adjective('bonus', ['acc'], ['sg'], ['fem'])]],
      ['bonum', [adjective('bonus', ['acc'], ['sg'], ['neut'])]],
    ]);
    expect(agreementGroups(['nautam', 'bonam'].map(token), analyses)).toHaveLength(1);
    expect(agreementGroups(['nautam', 'bonum'].map(token), analyses)).toEqual([]);
  });

  it('skips non-agreeing nearer nouns and reaches the agreeing one behind them', () => {
    // "memorem Iunonis ob iram" without saevae: Iunonis (gen) skipped
    const tokens = ['memorem', 'Iunonis', 'ob', 'iram'].map(token);
    const analyses = mapOf([
      ['memorem', [adjective('memor', ['acc'], ['sg'], ['fem'])]],
      ['Iunonis', [analysis({ pos: 'name', lemma: 'Iuno', cases: ['gen'], numbers: ['sg'], genders: ['fem'] })]],
      ['ob', [analysis({ pos: 'preposition', lemma: 'ob' })]],
      ['iram', [noun('ira', ['acc'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([
      { kind: 'agreement', tokenIndices: [0, 3], matched: 'acc sg fem' },
    ]);
  });

  it('never pairs two adjectives or two nouns with each other', () => {
    const tokens = ['saevae', 'memorem'].map(token);
    const analyses = mapOf([
      ['saevae', [adjective('saevus', ['acc'], ['sg'], ['fem'])]],
      ['memorem', [adjective('memor', ['acc'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([]);
  });

  it('ignores adjective parses of a form that is really a finite verb when far away (cano ↔ fato)', () => {
    // cano (verb + adjective parses of canus) is 7 tokens from fato —
    // beyond the agreement distance cap, so no group even though both
    // carry abl sg neut parses.
    const filler = ['a', 'b', 'c', 'd', 'e', 'f'];
    const tokens = ['cano', ...filler, 'fato'].map(token);
    const analyses = mapOf([
      ['cano', [verb(['1st'], ['sg']), adjective('canus', ['abl'], ['sg'], ['neut'])]],
      ['fato', [noun('fatum', ['abl'], ['sg'], ['neut'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([]);
  });

  it('caps agreement distance: nearby noun matches, distant one does not', () => {
    // acc sg fem adjective; matching noun at distance 2 and distance 8
    const tokens = ['bonam', 'x', 'oram', 'x', 'x', 'x', 'x', 'x', 'puellam'].map(token);
    const analyses = mapOf([
      ['bonam', [adjective('bonus', ['acc'], ['sg'], ['fem'])]],
      ['oram', [noun('ora', ['acc'], ['sg'], ['fem'])]],
      ['puellam', [noun('puella', ['acc'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([
      { kind: 'agreement', tokenIndices: [0, 2], matched: 'acc sg fem' },
    ]);
  });

  it('does not let a participle anchor match through its own noun parses', () => {
    // passus: participle (nom sg masc) + noun parses (acc pl masc);
    // deos: acc pl masc — the noun parses must not create the match
    const tokens = ['passus', 'deos'].map(token);
    const analyses = mapOf([
      ['passus', [participle('patior', ['nom'], ['sg'], ['masc']), noun('passus', ['acc'], ['pl'], ['masc'])]],
      ['deos', [noun('deus', ['acc'], ['pl'], ['masc'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toEqual([]);
  });

  it('emits a pair found from both directions only once', () => {
    // fato and alto both carry noun + adjective abl sg parses
    const tokens = ['fato', 'alto'].map(token);
    const analyses = mapOf([
      ['fato', [noun('fatum', ['abl'], ['sg'], ['neut']), adjective('fatus', ['abl'], ['sg'], ['neut'])]],
      ['alto', [noun('altum', ['abl'], ['sg'], ['neut']), adjective('altus', ['abl'], ['sg'], ['neut'])]],
    ]);
    expect(agreementGroups(tokens, analyses)).toHaveLength(1);
  });

  it('does not match across case or number', () => {
    const analyses = mapOf([
      ['iram', [noun('ira', ['acc'], ['sg'], ['fem'])]],
      ['bonas', [adjective('bonus', ['acc'], ['pl'], ['fem'])]],
      ['boni', [adjective('bonus', ['gen'], ['sg'], ['fem'])]],
    ]);
    expect(agreementGroups(['iram', 'bonas'].map(token), analyses)).toEqual([]);
    expect(agreementGroups(['iram', 'boni'].map(token), analyses)).toEqual([]);
  });
});

describe('subjectVerbGroups', () => {
  it('pairs a 3rd-person verb with the nearest preceding nominative of matching number', () => {
    const tokens = ['puellae', 'deo', 'canit'].map(token);
    const analyses = mapOf([
      ['puellae', [noun('puella', ['nom'], ['sg'], ['fem'])]],
      ['deo', [noun('deus', ['dat'], ['sg'], ['masc'])]],
      ['canit', [verb(['3rd'], ['sg'])]],
    ]);
    expect(subjectVerbGroups(tokens, analyses)).toEqual([
      { kind: 'subject-verb', tokenIndices: [0, 2], matched: '3rd sg' },
    ]);
  });

  it('pairs 1st/2nd person verbs with ego/nos/tu/vos via the pronoun lexicon', () => {
    // "Ast ego … bella gero" — far-apart but nearest matching pronoun
    const tokens = ['ego', 'annos', 'gero'].map(token);
    const analyses = mapOf([
      ['ego', [analysis({ pos: 'pronoun', lemma: 'ego', cases: ['nom'], numbers: ['sg'], genders: ['masc', 'fem'] })]],
      ['annos', [noun('annus', ['acc'], ['pl'], ['masc'])]],
      ['gero', [verb(['1st'], ['sg'])]],
    ]);
    expect(subjectVerbGroups(tokens, analyses)).toEqual([
      { kind: 'subject-verb', tokenIndices: [0, 2], matched: '1st sg' },
    ]);
  });

  it('requires person match: a nominative noun does not satisfy a 2nd-person verb', () => {
    // "Musa … memora" (vocative Musa, 2nd sg imperative)
    const tokens = ['Musa', 'memora'].map(token);
    const analyses = mapOf([
      ['Musa', [analysis({ pos: 'name', lemma: 'Musa', cases: ['nom', 'voc'], numbers: ['sg'], genders: ['fem'] })]],
      ['memora', [verb(['2nd'], ['sg'], 'imperat')]],
    ]);
    expect(subjectVerbGroups(tokens, analyses)).toEqual([]);
  });

  it('requires number match between subject and verb', () => {
    const analyses = mapOf([
      ['Troii', [analysis({ pos: 'name', lemma: 'Troius', cases: ['nom'], numbers: ['pl'], genders: ['masc'] })]],
      ['veniunt', [verb(['3rd'], ['pl'])]],
      ['venit', [verb(['3rd'], ['sg'])]],
    ]);
    expect(subjectVerbGroups(['Troii', 'veniunt'].map(token), analyses)).toHaveLength(1);
    expect(subjectVerbGroups(['Troii', 'venit'].map(token), analyses)).toEqual([]);
  });

  it('emits at most one group per verb', () => {
    const tokens = ['pater', 'Aeneas', 'orat'].map(token);
    const analyses = mapOf([
      ['pater', [noun('pater', ['nom'], ['sg'], ['masc'])]],
      ['Aeneas', [analysis({ pos: 'name', lemma: 'Aeneas', cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['orat', [verb(['3rd'], ['sg'])]],
    ]);
    expect(subjectVerbGroups(tokens, analyses)).toEqual([
      { kind: 'subject-verb', tokenIndices: [1, 2], matched: '3rd sg' },
    ]);
  });
});

describe('hasFiniteVerbRole', () => {
  it('counts indicative/subjunctive parses even beside noun parses (cano)', () => {
    const cano = [verb(['1st'], ['sg']), noun('canus', ['abl', 'dat'], ['sg'], ['masc'])];
    expect(hasFiniteVerbRole(cano)).toBe(true);
  });

  it('rejects a bare imperative beside nominal parses (Arma)', () => {
    const arma = [noun('arma', ['nom', 'voc', 'acc'], ['pl'], ['neut']), verb(['2nd'], ['sg'], 'imperat')];
    expect(hasFiniteVerbRole(arma)).toBe(false);
  });

  it('accepts a genuine imperative with no nominal parses (Solve)', () => {
    expect(hasFiniteVerbRole([verb(['2nd'], ['sg'], 'imperat')])).toBe(true);
  });

  it('rejects non-finite verb forms (participles, infinitives)', () => {
    expect(hasFiniteVerbRole([participle('iacto', ['nom'], ['sg'], ['masc'])])).toBe(false);
    expect(hasFiniteVerbRole([analysis({ pos: 'verb', lemma: 'ire', mood: 'inf' })])).toBe(false);
  });

  it('treats moodless verb parses with persons as finite (morpheus infero quirk)', () => {
    // inferret → "imperf act 3rd sg" — no mood token, but finite
    const inferret = [analysis({ pos: 'verb', lemma: 'infero', tense: 'imperf', voice: 'active', persons: ['3rd'], numbers: ['sg'] })];
    expect(hasFiniteVerbRole(inferret)).toBe(true);
  });
});

describe('buildGroups', () => {
  it('concatenates agreement groups before subject-verb groups', () => {
    const tokens = ['altae', 'moenia', 'Romae', 'ponunt'].map(token);
    const analyses = mapOf([
      ['altae', [adjective('altus', ['gen'], ['sg'], ['fem'])]],
      ['moenia', [noun('moenia', ['nom', 'acc'], ['pl'], ['neut'])]],
      ['Romae', [analysis({ pos: 'name', lemma: 'Roma', cases: ['gen'], numbers: ['sg'], genders: ['fem'] })]],
      ['ponunt', [verb(['3rd'], ['pl'])]],
    ]);
    const groups = buildGroups(tokens, analyses);
    expect(groups.map((group) => group.kind)).toEqual(['agreement', 'subject-verb']);
  });
});
