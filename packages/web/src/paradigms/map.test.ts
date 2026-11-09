import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis } from '@lego/shared';
import { TABLES } from './data';
import { tableForAnalysis, UNMAPPED_STEMS } from './map';

const here = dirname(fileURLToPath(import.meta.url));
const corpusPath = join(here, '../../public/corpus/aeneid-1.json');

/** A minimal analysis carrying only what the mapper needs. */
function a(partial: Partial<MorpheusAnalysis>): MorpheusAnalysis {
  return { pos: 'noun', lemma: 'x', features: [], ...partial };
}

describe('stemtype → table rules', () => {
  it('maps the noun declensions', () => {
    const cases: Array<[stem: string, genders: MorpheusAnalysis['genders'], id: string]> = [
      ['a_ae', ['fem'], 'noun1'],
      ['as_ae', ['masc'], 'noun1'], // Aenēās
      ['es_ae', ['masc'], 'noun1'], // Achātēs
      ['us_i', ['masc'], 'noun2m'],
      ['us_i', ['neut'], 'noun2n'], // arma in the real corpus
      ['um_i', ['neut'], 'noun2n'],
      ['0_i', ['masc'], 'noun2m'], // vir
      ['er_ri', ['masc'], 'noun2m'], // magister
      ['eus_ei', ['masc'], 'noun2m'], // Ilioneus
      ['s_tis', ['masc'], 'noun3c-mf'], // mōns
      ['x_gis', ['masc'], 'noun3c-mf'], // rēx
      ['men_minis', ['neut'], 'noun3c-n'], // nōmen
      ['is_is', ['masc'], 'noun3i-mf'], // cīvis
      ['is_is', ['neut'], 'noun3i-n'], // moenia
      ['e_is', ['neut'], 'noun3i-n'], // mare
      ['us_us', ['masc'], 'noun4-mf'], // passus
      ['us_us', ['neut'], 'noun4-n'], // genu
      ['o_us', ['fem'], 'noun4-mf'], // Didō
      ['es_ei', ['fem'], 'noun5'], // rēs
      ['es_eLi', ['fem'], 'noun5'], // spēs
    ];
    for (const [stem, genders, id] of cases) {
      const result = tableForAnalysis(a({ stem, genders, pos: 'noun' }));
      expect('table' in result && result.table.id, stem).toBe(id);
    }
  });

  it('maps the adjectives to their termination patterns', () => {
    const cases: Array<[stem: string, id: string]> = [
      ['us_a_um', 'adj12-us'],
      ['er_ra_rum', 'adj12-er'], // pulcher
      ['er_era_erum', 'adj12-er'], // miser
      ['ius_ia_ium', 'adj12-us'], // Troius
      ['er_ris_re', 'adj3-three'], // ācer
      ['is_e', 'adj3-two'], // ingēns
      ['ix_adj', 'adj3-one'], // fēlīx
      ['ox_adj', 'adj3-one'], // ferōx
      ['ens_adj', 'adj3-one'], // potēns
      ['irreg_adj3', 'adj3-one'], // vetus
    ];
    for (const [stem, id] of cases) {
      const result = tableForAnalysis(a({ stem, pos: 'adjective' }));
      expect('table' in result && result.table.id, stem).toBe(id);
    }
  });

  it('defaults 0_adj3 to the two-ending table and says so', () => {
    const result = tableForAnalysis(a({ stem: '0_adj3', pos: 'adjective', lemma: 'memor' }));
    expect('table' in result && result.table.id).toBe('adj3-two');
    expect('table' in result ? result.note : '').toMatch(/two-ending/);
  });

  it('maps the conjugations, including the comma-suffixed stems', () => {
    const cases: Array<[stem: string, id: string]> = [
      ['conj1', 'verb1'],
      ['conj1,are_vb', 'verb1'],
      ['conj2', 'verb2'],
      ['conj3', 'verb3'],
      ['conj3_io', 'verb3io'],
      ['conj4', 'verb4'],
      ['conj4,ire_vb', 'verb4'],
      ['avperf,are_vb', 'verb1'], // onerō-type with v-perfect
      ['pp4,are_vb', 'verb1'], // jactō-type
    ];
    for (const [stem, id] of cases) {
      const result = tableForAnalysis(a({ stem, pos: 'verb' }));
      expect('table' in result && result.table.id, stem).toBe(id);
    }
  });

  it('routes pronoun stems to tables by lemma', () => {
    const cases: Array<[stem: string, lemma: string, id: string]> = [
      ['pron1', 'ego', 'pron-ego'],
      ['pron1', 'nos', 'pron-ego'],
      ['pron2', 'tu', 'pron-tu'],
      ['pron3', 'is', 'pron-is'],
      ['pron3', 'idem', 'pron-is'],
      ['pron3', 'sui', 'pron-se'],
      ['demonstr', 'ille', 'pron-ille'],
      ['demonstr', 'hic', 'pron-hic'],
      ['demonstr', 'ipse', 'pron-ipse'],
      ['demonstr', 'illic', 'pron-ille'],
      ['relative', 'qui#2', 'pron-qui'],
      ['relative', 'quisquis', 'pron-qui'],
      ['interrog', 'qui#1', 'pron-qui'],
      ['interrog', 'quis#1', 'pron-quis'],
      ['indef', 'quisquam', 'pron-quis'],
      ['indef', 'quicumque', 'pron-qui'],
      ['indef', 'aliqui', 'pron-qui'],
      ['reflex', 'se', 'pron-se'],
    ];
    for (const [stem, lemma, id] of cases) {
      const result = tableForAnalysis(a({ stem, lemma, pos: 'pronoun' }));
      expect('table' in result && result.table.id, `${stem} ${lemma}`).toBe(id);
    }
    // an unknown pronoun lemma is unmapped with a reason, not silently
    const result = tableForAnalysis(a({ stem: 'demonstr', lemma: 'whoKnows', pos: 'pronoun' }));
    expect('reason' in result).toBe(true);
  });

  it('routes perfect-system stems to the irregular families by lemma', () => {
    const cases: Array<[stem: string, lemma: string, id: string]> = [
      ['perfstem', 'sum#1', 'esse'],
      ['perfstem', 'absum', 'esse'],
      ['perfstem', 'possum', 'posse'],
      ['perfstem', 'eo#1', 'ire'],
      ['perfstem', 'transeo', 'ire'],
      ['irreg_pp1', 'infero', 'ferre'],
      ['irreg_pp1', 'refero', 'ferre'],
      ['perfstem', 'fero', 'ferre'],
      ['irreg_pp1', 'volo#1', 'volo'],
      ['perfstem', 'do', 'verb1'],
      ['pp4', 'for', 'verb1'],
      ['irreg_pp1', 'edo#1', 'verb3'],
    ];
    for (const [stem, lemma, id] of cases) {
      const result = tableForAnalysis(a({ stem, lemma, pos: 'verb' }));
      expect('table' in result && result.table.id, `${stem} ${lemma}`).toBe(id);
    }
    // regular verbs on perfect stems stay unmapped, with the honest reason
    const result = tableForAnalysis(a({ stem: 'perfstem', lemma: 'mitto', pos: 'verb' }));
    expect('reason' in result && result.reason).toMatch(/does not encode the conjugation/);
  });

  it('never maps the allowlisted stems', () => {
    for (const [stem, reason] of Object.entries(UNMAPPED_STEMS)) {
      expect(reason.length, stem).toBeGreaterThan(5);
      const result = tableForAnalysis(a({ stem, pos: 'adverb' }));
      expect('reason' in result, stem).toBe(true);
    }
  });
});

describe('real corpus coverage (public/corpus/aeneid-1.json)', () => {
  interface CorpusFile {
    analyses: Record<string, MorpheusAnalysis[]>;
  }

  const corpus: CorpusFile = JSON.parse(readFileSync(corpusPath, 'utf8'));
  const byStem = new Map<string, MorpheusAnalysis[]>();
  for (const analyses of Object.values(corpus.analyses)) {
    for (const analysis of analyses) {
      const stem = analysis.stem ?? '(none)';
      const list = byStem.get(stem);
      if (list === undefined) byStem.set(stem, [analysis]);
      else list.push(analysis);
    }
  }

  it('the corpus exists and has a meaningful stem inventory', () => {
    expect(byStem.size).toBeGreaterThan(50);
  });

  it('every distinct stem maps to a table or is explicitly allowlisted — no silent gaps', () => {
    const unmapped: string[] = [];
    for (const [stem, analyses] of byStem) {
      const stemType = stem.split(',')[0] ?? stem;
      if (stemType in UNMAPPED_STEMS) continue; // explicitly listed
      for (const analysis of analyses) {
        const result = tableForAnalysis(analysis);
        if (!('table' in result)) unmapped.push(`${stem} (${analysis.lemma}) → ${result.reason}`);
      }
    }
    expect(unmapped, `unmapped stems:\n${unmapped.join('\n')}`).toEqual([]);
  });

  it('no corpus stem falls into the unknown-stem fallback — the allowlist is exhaustive', () => {
    const unknown: string[] = [];
    for (const [stem, analyses] of byStem) {
      const result = tableForAnalysis(analyses[0]!);
      if ('reason' in result && /^unknown stem/.test(result.reason)) unknown.push(stem);
    }
    expect(unknown, `unknown stems: ${unknown.join(', ')}`).toEqual([]);
  });

  it('spot-checks analyses straight from the corpus', () => {
    // arma is us_i + neut in the real corpus → 2nd declension neuter
    const arma = corpus.analyses['arma']?.[0];
    expect(arma).toBeDefined();
    const result = tableForAnalysis(arma!);
    expect('table' in result && result.table.id).toBe('noun2n');

    // cano (1st sg present) → 3rd conjugation (its real stem is conj3)
    const cano = corpus.analyses['cano']?.[0];
    const canoResult = tableForAnalysis(cano!);
    expect('table' in canoResult && canoResult.table.id).toBe('verb3');

    // moenia (i-stem neuter plural) → 3rd i-stem neuter
    const moenia = corpus.analyses['moenia']?.[0];
    const moeniaResult = tableForAnalysis(moenia!);
    expect('table' in moeniaResult && moeniaResult.table.id).toBe('noun3i-n');

    // mihi → ego table
    const mihi = corpus.analyses['mihi']?.[0];
    const mihiResult = tableForAnalysis(mihi!);
    expect('table' in mihiResult && mihiResult.table.id).toBe('pron-ego');
  });
});
