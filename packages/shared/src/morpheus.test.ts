import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeMacrons, parseMorpheus } from './morpheus.js';
import type { MorpheusAnalysis } from './types.js';

/** Golden fixtures captured verbatim from the live morpheus container (:1315, ?opts=S). */
function fixture(name: string): string {
  return readFileSync(new URL(`../test/fixtures/${name}.txt`, import.meta.url), 'utf8');
}

describe('parseMorpheus — golden fixtures from the live container', () => {
  it('parses a simple noun (feminam)', () => {
    expect(parseMorpheus(fixture('feminam'))).toEqual([
      {
        pos: 'noun',
        lemma: 'femina',
        cases: ['acc'],
        numbers: ['sg'],
        genders: ['fem'],
        features: [],
        stem: 'a_ae',
      },
    ]);
  });

  it('keeps every analysis of an ambiguous form (arma: noun + verb)', () => {
    expect(parseMorpheus(fixture('arma'))).toEqual([
      {
        pos: 'noun',
        lemma: 'arma',
        cases: ['nom', 'voc', 'acc'],
        numbers: ['pl'],
        genders: ['neut'],
        features: [],
        stem: 'us_i',
      },
      {
        pos: 'verb',
        lemma: 'armo',
        tense: 'pres',
        mood: 'imperat',
        voice: 'active',
        persons: ['2nd'],
        numbers: ['sg'],
        features: [],
        stem: 'conj1,are_vb',
      },
    ]);
  });

  it('parses cano: verb + four adjective analyses', () => {
    const out = parseMorpheus(fixture('cano'));
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({
      pos: 'verb',
      lemma: 'cano',
      tense: 'pres',
      mood: 'ind',
      voice: 'active',
      persons: ['1st'],
      numbers: ['sg'],
      features: [],
      stem: 'conj3',
    });
    const nounish = out.slice(1);
    for (const a of nounish) {
      expect(a.pos).toBe('adjective');
      expect(a.lemma).toBe('canus');
      expect(a.stem).toBe('us_a_um');
      expect(a.numbers).toEqual(['sg']);
    }
    expect(nounish.map((a) => `${a.genders}:${a.cases}`).sort()).toEqual([
      'masc:abl', 'masc:dat', 'neut:abl', 'neut:dat',
    ]);
  });

  it('parses virum: dialect flags, indeclform, missing comma+lemma', () => {
    const out = parseMorpheus(fixture('virum'));
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({
      pos: 'noun',
      lemma: 'vir',
      cases: ['gen'],
      numbers: ['pl'],
      genders: ['masc'],
      features: ['poetic'],
      stem: '0_i',
    });
    expect(out[1]).toEqual({
      pos: 'noun',
      lemma: 'vir', // no comma — lemma is the bare form field
      cases: ['acc'],
      numbers: ['sg'],
      genders: ['masc'],
      features: [],
      stem: '0_i',
    });
    expect(out[2]).toEqual({
      pos: 'noun',
      lemma: 'virus',
      cases: ['nom', 'voc', 'acc'],
      numbers: ['sg'],
      genders: ['neut'],
      features: ['indeclform'],
      stem: 'irreg_nom2',
    });
    expect(out[3]).toEqual({
      pos: 'noun',
      lemma: 'virus',
      cases: ['gen'],
      numbers: ['pl'],
      genders: ['neut'],
      features: ['poetic'],
      stem: 'us_i',
    });
    expect(out[4]).toEqual({
      pos: 'noun',
      lemma: 'virus',
      cases: ['nom', 'voc', 'acc'],
      numbers: ['sg'],
      genders: ['neut'],
      features: [],
      stem: 'us_i',
    });
  });

  it('parses puella: macron lemma is plain, slash group nom/voc', () => {
    const out = parseMorpheus(fixture('puella'));
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      pos: 'noun',
      lemma: 'puella',
      cases: ['abl'],
      numbers: ['sg'],
      genders: ['fem'],
      features: [],
      stem: 'a_ae',
    });
    expect(out[1]?.cases).toEqual(['nom', 'voc']);
    expect(out[1]?.lemma).toBe('puella');
  });

  it('maps indeclinable stems to their part of speech', () => {
    expect(parseMorpheus(fixture('celeriter'))).toEqual([
      { pos: 'adverb', lemma: 'celeriter', features: ['indeclform'], stem: 'adverb' },
    ]);
    expect(parseMorpheus(fixture('et'))).toEqual([
      { pos: 'conjunction', lemma: 'et', features: ['indeclform'], stem: 'conj' },
    ]);
    expect(parseMorpheus(fixture('in'))).toEqual([
      { pos: 'preposition', lemma: 'in', features: ['indeclform'], stem: 'prep' },
    ]);
    expect(parseMorpheus(fixture('o'))).toEqual([
      { pos: 'interjection', lemma: 'o', features: ['indeclform'], stem: 'exclam' },
    ]);
    expect(parseMorpheus(fixture('ipsum'))[0]).toMatchObject({
      pos: 'pronoun',
      lemma: 'ipse',
      stem: 'demonstr',
    });
  });

  it('maps pronoun and numeral stems (quis, tres)', () => {
    const quis = parseMorpheus(fixture('quis'));
    expect(quis).toHaveLength(3);
    expect(quis[0]).toEqual({
      pos: 'verb',
      lemma: 'queo',
      tense: 'pres',
      mood: 'ind',
      voice: 'active',
      persons: ['2nd'],
      numbers: ['sg'],
      features: [],
      stem: 'irreg_pp1',
    });
    expect(quis[1]).toEqual({
      pos: 'pronoun',
      lemma: 'quis#1',
      cases: ['nom'],
      numbers: ['sg'],
      genders: ['masc', 'fem'],
      features: ['indeclform'],
      stem: 'interrog',
    });
    expect(quis[2]).toMatchObject({ pos: 'pronoun', lemma: 'quis#2', stem: 'indef' });

    expect(parseMorpheus(fixture('tres'))[0]).toEqual({
      pos: 'numeral',
      lemma: 'tres',
      cases: ['acc'],
      numbers: ['pl'],
      genders: ['masc', 'fem'],
      features: ['indeclform'],
      stem: 'numeral',
    });
  });

  it('classifies adjectives by stem (magnam: us_a_um)', () => {
    const out = parseMorpheus(fixture('magnam'));
    expect(out).toHaveLength(2);
    expect(out.map((a) => a.lemma)).toEqual(['magnus', 'magnus#1']);
    for (const a of out) {
      expect(a).toEqual({
        pos: 'adjective',
        lemma: a.lemma,
        cases: ['acc'],
        numbers: ['sg'],
        genders: ['fem'],
        features: [],
        stem: 'us_a_um',
      });
    }
  });

  it('treats a capitalized lemma as a proper name (Tullia, Aeneas, Augustum)', () => {
    const tullia = parseMorpheus(fixture('Tullia'));
    expect(tullia).toHaveLength(2);
    expect(tullia.every((a) => a.pos === 'name' && a.lemma === 'Tullia')).toBe(true);
    expect(tullia[0]?.cases).toEqual(['abl']);
    expect(tullia[1]?.cases).toEqual(['nom', 'voc']);

    const aeneas = parseMorpheus(fixture('Aeneas'));
    expect(aeneas.map((a) => `${a.pos}:${a.lemma}:${a.stem}`)).toEqual([
      'name:Aenea:a_ae',
      'name:Aeneas:as_ae',
      'name:Aeneas:as_ae',
      'adjective:aeneus:us_a_um',
    ]);

    const augustum = parseMorpheus(fixture('Augustum'));
    expect(augustum[0]).toMatchObject({ pos: 'name', lemma: 'Augustus', stem: 'us_i' });
    expect(augustum.slice(1).every((a) => a.pos === 'adjective' && a.lemma === 'augustus#1')).toBe(true);
  });

  it('maps every tense (amabat imperf, amavit perf, amavisset plup, amavero futperf→futp)', () => {
    expect(parseMorpheus(fixture('amabat'))[0]).toMatchObject({ tense: 'imperf', mood: 'ind' });
    expect(parseMorpheus(fixture('amavit'))[0]).toMatchObject({ tense: 'perf', mood: 'ind' });
    expect(parseMorpheus(fixture('amavisset'))[0]).toMatchObject({ tense: 'plup', mood: 'subj' });
    expect(parseMorpheus(fixture('amavero'))[0]).toEqual({
      pos: 'verb',
      lemma: 'amo',
      tense: 'futp',
      mood: 'ind',
      voice: 'active',
      persons: ['1st'],
      numbers: ['sg'],
      features: [],
      stem: 'avperf,are_vb',
    });
  });

  it('parses participles (P): pres/fut/perf, act/pass, gender slash groups', () => {
    const amans = parseMorpheus(fixture('amans'));
    expect(amans).toHaveLength(2);
    expect(amans.every((a) => a.pos === 'verb' && a.mood === 'part')).toBe(true);
    expect(amans[0]).toMatchObject({
      lemma: 'amo',
      tense: 'pres',
      cases: ['acc'],
      genders: ['neut'],
      numbers: ['sg'],
      stem: 'conj1,are_vb',
    });
    expect(amans[1]).toMatchObject({
      tense: 'pres',
      cases: ['nom', 'voc'],
      genders: ['masc', 'fem', 'neut'],
      numbers: ['sg'],
    });
    // present active participles carry no voice token — field stays absent
    expect(amans.every((a) => a.voice === undefined)).toBe(true);

    expect(parseMorpheus(fixture('amaturus'))[0]).toEqual({
      pos: 'verb',
      lemma: 'amo',
      tense: 'fut',
      mood: 'part',
      voice: 'active',
      cases: ['nom'],
      numbers: ['sg'],
      genders: ['masc'],
      features: [],
      stem: 'pp4,are_vb',
    });

    expect(parseMorpheus(fixture('iratus'))[0]).toEqual({
      pos: 'verb',
      lemma: 'irascor',
      tense: 'perf',
      mood: 'part',
      voice: 'passive',
      cases: ['nom'],
      numbers: ['sg'],
      genders: ['masc'],
      features: [],
      stem: 'pp4',
    });
  });

  it('parses infinitives, gerundives and supines', () => {
    const amari = parseMorpheus(fixture('amari'));
    const inf = amari.find((a) => a.mood === 'inf');
    expect(inf).toMatchObject({ pos: 'verb', lemma: 'amo', tense: 'pres', voice: 'passive' });

    const amandum = parseMorpheus(fixture('amandum'));
    expect(amandum.every((a) => a.pos === 'verb' && a.mood === 'gerundive' && a.lemma === 'amo')).toBe(true);
    expect(amandum.some((a) => a.cases?.includes('acc') && a.genders?.includes('masc'))).toBe(true);

    const ventum = parseMorpheus(fixture('ventum'));
    const supine = ventum.find((a) => a.mood === 'supine');
    expect(supine).toMatchObject({ pos: 'verb', lemma: 'venio', stem: 'pp4' });
    expect(ventum.some((a) => a.pos === 'noun' && a.lemma === 'ventus')).toBe(true);
  });

  it('handles degrees: comp/superl and adverbial usage (brevius, brevissime, optimam)', () => {
    const brevius = parseMorpheus(fixture('brevius'));
    expect(brevius).toHaveLength(2);
    expect(brevius.every((a) => a.pos === 'adjective' && a.degree === 'comparative')).toBe(true);
    expect(brevius[0]?.features).toEqual(['adverbial']); // unrecognized token kept verbatim
    expect(brevius[1]?.cases).toEqual(['nom', 'voc', 'acc']);

    const brevissime = parseMorpheus(fixture('brevissime'));
    expect(brevissime.every((a) => a.degree === 'superlative')).toBe(true);

    const optimam = parseMorpheus(fixture('optimam'));
    expect(optimam[0]).toEqual({
      pos: 'adjective',
      lemma: 'bonus',
      cases: ['acc'],
      numbers: ['sg'],
      genders: ['fem'],
      features: ['irreg_superl'],
      stem: 'us_a_um',
    });
  });

  it('distinguishes homonym lemmas and comparative stems (maiorem, felices)', () => {
    const maiorem = parseMorpheus(fixture('maiorem'));
    expect(maiorem.map((a) => a.stem)).toEqual(['ior_ius_comp', 'or_us_comp']);
    expect(maiorem.every((a) => a.pos === 'adjective' && a.lemma === 'magnus' && a.degree === 'comparative')).toBe(true);

    const felices = parseMorpheus(fixture('felices'));
    expect(felices.map((a) => `${a.pos}:${a.lemma}:${a.stem}`)).toEqual([
      'adjective:felix#1:ix_adj',
      'adjective:felix#1:ix_adj',
      'noun:filix:ix_icis',
      'noun:filix:ix_icis',
    ]);
  });

  it('navigates a heavily ambiguous form (sui: pronoun, verb, noun, adjective)', () => {
    const out = parseMorpheus(fixture('sui'));
    expect(out).toHaveLength(9);
    const byPos = new Map<string, number>();
    for (const a of out) byPos.set(a.pos, (byPos.get(a.pos) ?? 0) + 1);
    expect(byPos.get('pronoun')).toEqual(2);
    expect(byPos.get('verb')).toEqual(2);
    expect(byPos.get('noun')).toEqual(2);
    expect(byPos.get('adjective')).toEqual(3);
  });

  it('parses eum: declined pronoun + poetic masc/neut variant', () => {
    const out = parseMorpheus(fixture('eum'));
    expect(out[0]).toEqual({
      pos: 'pronoun',
      lemma: 'is',
      cases: ['acc'],
      numbers: ['sg'],
      genders: ['masc'],
      features: ['indeclform'],
      stem: 'pron3',
    });
    expect(out[1]).toEqual({
      pos: 'pronoun',
      lemma: 'is',
      cases: ['gen'],
      numbers: ['pl'],
      genders: ['masc', 'neut'],
      features: ['poetic', 'indeclform'],
      stem: 'pron3',
    });
  });

  it('returns [] for unknown words and enclitics (empty morpheus body)', () => {
    expect(parseMorpheus(fixture('zzzzz'))).toEqual([]);
    expect(parseMorpheus(fixture('que'))).toEqual([]);
  });
});

describe('parseMorpheus — unit behavior', () => {
  it('returns [] for empty input', () => {
    expect(parseMorpheus('')).toEqual([]);
  });

  it('ignores the echoed input word and blank lines', () => {
    expect(parseMorpheus('arma\n\n')).toEqual([]);
    const out = parseMorpheus('feminam\n<NL>N fe_minam,femina  fem acc sg\t\t\ta_ae</NL>\n');
    expect(out).toHaveLength(1);
    expect(out[0]?.lemma).toBe('femina');
  });

  it('parses records concatenated with no separator', () => {
    const raw =
      '<NL>N arma  neut nom/voc/acc pl\t\t\tus_i</NL>' +
      '<NL>V arma_,armo  pres imperat act 2nd sg\t\t\tconj1,are_vb</NL>';
    const out = parseMorpheus(raw);
    expect(out).toHaveLength(2);
    expect(out.map((a) => a.pos)).toEqual(['noun', 'verb']);
  });

  it('expands slash groups into arrays', () => {
    const [a] = parseMorpheus('<NL>N ferox  masc/fem/neut nom/voc sg\t\t\tox_adj</NL>');
    expect(a?.cases).toEqual(['nom', 'voc']);
    expect(a?.genders).toEqual(['masc', 'fem', 'neut']);
    expect(a?.numbers).toEqual(['sg']);
  });

  it('keeps unrecognized ending tokens verbatim in features', () => {
    const [a] = parseMorpheus('<NL>N xyz  token1 token2/nom sg\t\t\ta_ae</NL>');
    expect(a?.cases).toEqual(['nom']);
    expect(a?.features).toEqual(['token1', 'token2']);
  });

  it('keeps comma stems intact and does not macron-decode them', () => {
    const [a] = parseMorpheus(fixture('amavit'));
    expect(a?.stem).toBe('avperf,are_vb');
    expect(a?.lemma).toBe('amo');
  });

  it('skips records with no lemma field rather than crashing', () => {
    const out = parseMorpheus('<NL>N \t\t\ta_ae</NL><NL>N femina  fem nom sg\t\t\ta_ae</NL>');
    expect(out).toHaveLength(1);
    expect(out[0]?.lemma).toBe('femina');
  });
});

describe('decodeMacrons', () => {
  it('converts underscore macrons after vowels', () => {
    expect(decodeMacrons('fe_minam')).toBe('fēminam');
    expect(decodeMacrons('cano_')).toBe('canō');
    expect(decodeMacrons('vi_rum')).toBe('vīrum');
    expect(decodeMacrons('viru_m')).toBe('virūm');
    expect(decodeMacrons('di_i_')).toBe('dīī');
    expect(decodeMacrons('Roma_e_')).toBe('Romāē');
  });

  it('converts uppercase vowels too', () => {
    expect(decodeMacrons('A_ene_a_s')).toBe('Āenēās');
  });

  it('leaves underscores after non-vowels alone (stem identifiers)', () => {
    expect(decodeMacrons('us_i')).toBe('us_i');
    expect(decodeMacrons('0_adj3')).toBe('0_adj3');
    expect(decodeMacrons('conj3_io')).toBe('conj3_io');
  });
});
