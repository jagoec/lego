import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis } from '@lego/shared';
import { morphologySummary, stemLabel, toAnalysisView } from './morphology';

const arma: MorpheusAnalysis = {
  pos: 'noun',
  lemma: 'arma',
  cases: ['nom', 'voc', 'acc'],
  numbers: ['pl'],
  genders: ['neut'],
  stem: 'um_i',
  features: [],
};

const cano: MorpheusAnalysis = {
  pos: 'verb',
  lemma: 'cano',
  tense: 'pres',
  mood: 'ind',
  voice: 'active',
  persons: ['1st'],
  numbers: ['sg'],
  stem: 'conj1,are_vb',
  features: ['poetic'],
};

describe('toAnalysisView (level filtering)', () => {
  it('level 1 shows the part of speech only', () => {
    const view = toAnalysisView(arma, 1);
    expect(view.pos).toBe('noun');
    expect(view.morphology).toBeUndefined();
    expect(view.lemma).toBeUndefined();
    expect(view.stem).toBeUndefined();
    expect(view.stemLabel).toBeUndefined();
    expect(view.features).toBeUndefined();
  });

  it('level 2 adds full morphology and the lemma', () => {
    const view = toAnalysisView(arma, 2);
    expect(view.pos).toBe('noun');
    expect(view.morphology).toBe('neut nom/voc/acc pl');
    expect(view.lemma).toBe('arma');
    expect(view.stem).toBeUndefined();
    expect(view.features).toBeUndefined();
  });

  it('level 3 adds the raw stem, a friendly stem label, and features', () => {
    const view = toAnalysisView(cano, 3);
    expect(view.morphology).toBe('1st sg pres ind active');
    expect(view.lemma).toBe('cano');
    expect(view.stem).toBe('conj1,are_vb');
    expect(view.stemLabel).toBe('1st conjugation');
    expect(view.features).toEqual(['poetic']);
  });

  it('level 4 filters exactly like level 3 (gloss is a separate reveal action)', () => {
    expect(toAnalysisView(arma, 4)).toEqual(toAnalysisView(arma, 3));
  });

  it('omits an empty morphology line for indeclinables', () => {
    const preposition: MorpheusAnalysis = { pos: 'preposition', lemma: 'ab', stem: 'prep', features: [] };
    expect(toAnalysisView(preposition, 2).morphology).toBeUndefined();
  });
});

describe('morphologySummary', () => {
  it('reads nominals as gender/case/number with slash groups', () => {
    const fato: MorpheusAnalysis = {
      pos: 'noun',
      lemma: 'fatum',
      cases: ['dat', 'abl'],
      numbers: ['sg'],
      genders: ['neut'],
      stem: 'um_i',
      features: [],
    };
    expect(morphologySummary(fato)).toBe('neut dat/abl sg');
  });

  it('reads verbals as person/number/tense/mood/voice', () => {
    expect(morphologySummary(cano)).toBe('1st sg pres ind active');
  });

  it('appends the degree for adjectives', () => {
    const primus: MorpheusAnalysis = {
      pos: 'adjective',
      lemma: 'primus',
      cases: ['nom'],
      numbers: ['sg'],
      genders: ['masc'],
      degree: 'positive',
      stem: 'us_a_um',
      features: [],
    };
    expect(morphologySummary(primus)).toBe('masc nom sg positive');
  });
});

describe('stemLabel', () => {
  it('looks up the stemtype, ignoring the derivtype after the comma', () => {
    expect(stemLabel('conj4,ire_vb')).toBe('4th conjugation');
    expect(stemLabel('a_ae')).toBe('1st declension (a, ae)');
  });

  it('returns undefined for unknown stems (the raw stem is still shown)', () => {
    expect(stemLabel('zzz_zyx')).toBeUndefined();
  });
});
