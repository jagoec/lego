import { describe, expect, it } from 'vitest';
import type { Chunk, Group, MorpheusAnalysis, Token } from '@lego/shared';
import { solveSentence } from './solver.js';
import type { SentenceSolution } from './solver.js';
import type { AnalysisMap } from '../groups.js';

const token = (form: string, index: number): Token => ({ index, text: form, form, line: 1 });

function analysis(pos: MorpheusAnalysis['pos'], extra: Partial<MorpheusAnalysis> = {}): MorpheusAnalysis {
  return { pos, lemma: pos, features: [], ...extra };
}

function mapOf(entries: readonly (readonly [string, MorpheusAnalysis[]])[]): AnalysisMap {
  return Object.fromEntries(entries);
}

/** Solve `forms` with the given analyses/groups/order; returns the solution array. */
function solve(
  forms: string[],
  analyses: AnalysisMap,
  groups: readonly Group[] = [],
  order: readonly Chunk[] = forms.map((_, i) => ({
    order: i + 1,
    tokenIndices: [i],
  })),
): SentenceSolution {
  const tokens = forms.map(token);
  return solveSentence(tokens, analyses, groups, order);
}

describe('solveSentence — finite-verb anchoring', () => {
  it('eliminates non-finite parses of a token anchoring a verb chunk', () => {
    // "missa" as participle + noun ("a missile") beside a finite reading
    const analyses = mapOf([
      ['missa', [
        analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['nom'], numbers: ['pl'], genders: ['fem'] }),
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
      ]],
    ]);
    const solution = solve(['missa'], analyses);
    expect(solution[0]).toMatchObject({ eliminated: [0], selected: 1 });
  });

  it('does not anchor the Arma noun+imperative collision', () => {
    const analyses = mapOf([
      ['Arma', [
        analysis('noun', { cases: ['nom', 'voc', 'acc'], numbers: ['pl'], genders: ['neut'] }),
        analysis('verb', { mood: 'imperat', persons: ['2nd'], numbers: ['sg'] }),
      ]],
    ]);
    const solution = solve(['Arma'], analyses);
    // no finite-verb role (imperative beside nominal parses) → nothing eliminated
    expect(solution[0]).toMatchObject({ eliminated: [] });
    expect(solution[0]?.selected).toBeUndefined();
  });
});

describe('solveSentence — agreement links', () => {
  it("keeps only parses compatible with the partner's matched features", () => {
    // saevae ↔ vi (dat sg fem): the nominative reading of saevae contradicts
    const analyses = mapOf([
      ['saevae', [
        analysis('adjective', { cases: ['nom', 'voc'], numbers: ['sg'], genders: ['fem'] }),
        analysis('adjective', { cases: ['dat'], numbers: ['sg'], genders: ['fem'] }),
        analysis('adjective', { cases: ['gen'], numbers: ['sg'], genders: ['fem'] }),
      ]],
      ['vi', [analysis('noun', { cases: ['dat', 'abl'], numbers: ['sg'], genders: ['fem'] })]],
    ]);
    const groups: Group[] = [{ kind: 'agreement', tokenIndices: [0, 1], matched: 'dat sg fem' }];
    const solution = solve(['saevae', 'vi'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [0, 2], selected: 1 });
  });

  it('eliminates parses that cannot play either agreement role', () => {
    // an ambiguous form with an adverb reading beside an adjective reading
    const analyses = mapOf([
      ['felicis', [
        analysis('adjective', { cases: ['acc'], numbers: ['sg'], genders: ['masc', 'fem'] }),
        analysis('adverb'),
      ]],
      ['finis', [analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['masc'] })]],
    ]);
    const groups: Group[] = [{ kind: 'agreement', tokenIndices: [0, 1], matched: 'acc sg masc' }];
    const solution = solve(['felicis', 'finis'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [1], selected: 0 });
  });

  it('respects gender: common matches masc/fem, not neut', () => {
    const analyses = mapOf([
      ['pars', [
        analysis('noun', { cases: ['nom'], numbers: ['sg'], genders: ['fem'] }),
        analysis('noun', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] }),
      ]],
      ['media', [analysis('adjective', { cases: ['nom'], numbers: ['sg'], genders: ['common'] })]],
    ]);
    const groups: Group[] = [{ kind: 'agreement', tokenIndices: [0, 1], matched: 'nom sg fem' }];
    const solution = solve(['pars', 'media'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [1], selected: 0 });
  });
});

describe('solveSentence — subject-verb links', () => {
  it('eliminates verb parses of the wrong person', () => {
    // "cano" beside ego: only the 1st sg reading survives the link
    const analyses = mapOf([
      ['ego', [analysis('pronoun', { cases: ['nom'], numbers: ['sg'] })]],
      ['cano', [
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] }),
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['pl'] }),
      ]],
    ]);
    const groups: Group[] = [{ kind: 'subject-verb', tokenIndices: [0, 1], matched: '1st sg' }];
    const solution = solve(['ego', 'cano'], analyses, groups);
    expect(solution[1]).toMatchObject({ eliminated: [1], selected: 0 });
  });

  it('eliminates subject parses without a nominative of the matched number', () => {
    // 3rd sg verb with a two-way ambiguous subject: only nom sg survives
    const analyses = mapOf([
      ['puella', [
        analysis('noun', { cases: ['nom'], numbers: ['sg'], genders: ['fem'] }),
        analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] }),
      ]],
      ['venit', [analysis('verb', { mood: 'ind', tense: 'perf', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    const groups: Group[] = [{ kind: 'subject-verb', tokenIndices: [0, 1], matched: '3rd sg' }];
    const solution = solve(['puella', 'venit'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [1], selected: 0 });
  });

  it('skips groups whose sides cannot be told apart', () => {
    const analyses = mapOf([
      ['lego', [
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] }),
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
      ]],
      ['legit', [
        analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
      ]],
    ]);
    // both sides have a finite-verb role → the solver declines to constrain
    const groups: Group[] = [{ kind: 'subject-verb', tokenIndices: [0, 1], matched: '3rd sg' }];
    const solution = solve(['lego', 'legit'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [] });
    expect(solution[0]?.selected).toBeUndefined();
  });
});

describe('solveSentence — soft evidence', () => {
  it('uses prepositional government to dominate: ab + abl', () => {
    // oris after ab: abl +2, gen/dat -2 → margin 4 selects the abl reading
    const analyses = mapOf([
      ['ab', [analysis('preposition')]],
      ['oris', [
        analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] }),
        analysis('noun', { cases: ['gen'], numbers: ['sg'], genders: ['masc'] }),
        analysis('noun', { cases: ['dat'], numbers: ['sg'], genders: ['masc'] }),
      ]],
    ]);
    const solution = solve(['ab', 'oris'], analyses);
    expect(solution[1]).toMatchObject({ eliminated: [], scores: [2, -2, -2], selected: 0 });
  });

  it('treats in/sub (either case) as non-discriminating', () => {
    const analyses = mapOf([
      ['in', [analysis('preposition')]],
      ['litora', [
        analysis('noun', { cases: ['acc'], numbers: ['pl'], genders: ['neut'] }),
        analysis('noun', { cases: ['nom'], numbers: ['pl'], genders: ['neut'] }),
      ]],
    ]);
    const solution = solve(['in', 'litora'], analyses);
    expect(solution[1]).toMatchObject({ scores: [0, 0] });
    expect(solution[1]?.selected).toBeUndefined();
  });

  it('gives nominative parses inside a subject chunk a +1 bonus', () => {
    const analyses = mapOf([
      ['Troiae', [
        analysis('name', { cases: ['gen'], numbers: ['sg'], genders: ['neut'] }),
        analysis('name', { cases: ['nom'], numbers: ['pl'], genders: ['neut'] }),
      ]],
    ]);
    const order: Chunk[] = [{ order: 1, label: 'subject', tokenIndices: [0] }];
    const solution = solve(['Troiae'], analyses, [], order);
    expect(solution[0]).toMatchObject({ scores: [0, 1] });
    expect(solution[0]?.selected).toBeUndefined(); // margin 1 < 2
  });

  it('selects only when the margin is at least SELECTION_MARGIN', () => {
    const analyses = mapOf([
      ['verbo', [
        analysis('noun', { cases: ['dat', 'abl'], numbers: ['sg'], genders: ['neut'] }),
        analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['neut'] }),
      ]],
    ]);
    const solution = solve(['verbo'], analyses);
    expect(solution[0]).toMatchObject({ eliminated: [], scores: [0, 0] });
    expect(solution[0]?.selected).toBeUndefined();
  });
});

describe('solveSentence — guards', () => {
  it('discards eliminations that would empty a token', () => {
    // matched says masc, but every parse is fem — evidence is contradictory
    const analyses = mapOf([
      ['irae', [
        analysis('noun', { cases: ['nom'], numbers: ['sg'], genders: ['fem'] }),
        analysis('noun', { cases: ['nom'], numbers: ['pl'], genders: ['fem'] }),
      ]],
      ['saevae', [analysis('adjective', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
    ]);
    const groups: Group[] = [{ kind: 'agreement', tokenIndices: [0, 1], matched: 'nom sg masc' }];
    const solution = solve(['irae', 'saevae'], analyses, groups);
    expect(solution[0]).toMatchObject({ eliminated: [] });
    expect(solution[0]?.selected).toBeUndefined();
  });

  it('leaves unambiguous tokens out of the solution', () => {
    const analyses = mapOf([
      ['cano', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] })]],
      ['arma', [
        analysis('noun', { cases: ['nom', 'acc'], numbers: ['pl'], genders: ['neut'] }),
        analysis('noun', { cases: ['voc'], numbers: ['pl'], genders: ['neut'] }),
      ]],
    ]);
    const solution = solve(['cano', 'arma'], analyses);
    expect(solution[0]).toBeUndefined();
    expect(solution[1]).toBeDefined();
  });
});
