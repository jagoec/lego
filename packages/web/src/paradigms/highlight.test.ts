import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis, Passage, Token } from '@lego/shared';
import { TABLES } from './data';
import { nominalHighlights, verbHighlights, highlightsFor } from './highlight';
import { paradigmForToken } from './index';
import type { NominalTable, VerbTable } from './types';

function a(partial: Partial<MorpheusAnalysis>): MorpheusAnalysis {
  return { pos: 'noun', lemma: 'x', features: [], ...partial };
}

describe('nominalHighlights (case × number × gender)', () => {
  it('highlights the case/number cell, including slash groups like nom/voc/acc', () => {
    const table = TABLES['noun2n'] as NominalTable;
    const arma = a({ cases: ['nom', 'voc', 'acc'], numbers: ['pl'], genders: ['neut'] });

    const highlights = nominalHighlights(arma, table);
    // nom, voc and acc rows × the pl column — three cells
    expect(highlights).toHaveLength(3);
    const rows = highlights.map((h) => table.rows[h.row]!.case);
    expect(rows).toEqual(['nom', 'acc', 'voc']); // table row order
    expect(highlights.every((h) => h.cell === 1)).toBe(true); // pl column
  });

  it('highlights only the cells whose gender column the parse lists', () => {
    const table = TABLES['adj12-us'] as NominalTable;
    const memorem = a({ cases: ['acc'], numbers: ['sg'], genders: ['masc', 'fem'] });

    const highlights = nominalHighlights(memorem, table);
    expect(highlights).toHaveLength(2); // acc sg masc + acc sg fem
    expect(highlights.every((h) => table.rows[h.row]!.case === 'acc')).toBe(true);
    expect(new Set(highlights.map((h) => h.cell))).toEqual(new Set([0, 1]));

    // a neuter-only parse lights up just the neut column
    const neut = a({ cases: ['nom'], numbers: ['sg'], genders: ['neut'] });
    expect(nominalHighlights(neut, table)).toEqual([{ kind: 'nominal', row: 0, cell: 2 }]);
  });

  it('does not highlight empty slots (sē has no nominative)', () => {
    const table = TABLES['pron-se'] as NominalTable;
    const se = a({ cases: ['nom', 'acc'], numbers: ['sg'], genders: ['fem'] });
    const highlights = nominalHighlights(se, table);
    expect(highlights).toHaveLength(1); // acc only — nom is a null slot
    expect(table.rows[highlights[0]!.row]!.case).toBe('acc');
  });

  it('returns nothing when the parse has no case (or no matching number)', () => {
    const table = TABLES['noun1'] as NominalTable;
    expect(nominalHighlights(a({ numbers: ['sg'] }), table)).toEqual([]);
    expect(
      nominalHighlights(a({ cases: ['dat'], numbers: ['dual'] }), table),
    ).toEqual([]);
  });

  it('pronoun gender columns come from the parse even for sg-only tables (quis)', () => {
    const table = TABLES['pron-quis'] as NominalTable;
    const quis = a({ cases: ['nom'], numbers: ['sg'], genders: ['masc'] });
    expect(nominalHighlights(quis, table)).toEqual([{ kind: 'nominal', row: 0, cell: 0 }]);
    const quid = a({ cases: ['nom', 'acc'], numbers: ['sg'], genders: ['neut'] });
    const highlights = nominalHighlights(quid, table);
    expect(highlights).toHaveLength(2); // nom neut + acc neut
  });
});

describe('verbHighlights (tense × mood × voice × person × number)', () => {
  const verb3 = TABLES['verb3'] as VerbTable;

  it('highlights a finite present cell (cano: pres ind act 1st sg)', () => {
    const cano = a({
      pos: 'verb', tense: 'pres', mood: 'ind', voice: 'active',
      persons: ['1st'], numbers: ['sg'],
    });
    const highlights = verbHighlights(cano, verb3);
    expect(highlights).toEqual([{ kind: 'verbal', section: 0, row: 0, cell: 0 }]);
    expect(verb3.sections[0]!.rows[0]!.cells[0]!.form).toBe('rapiō');
  });

  it('highlights a pluperfect passive cell (raptī erāmus: plup ind pass 1st pl)', () => {
    const analysis = a({
      pos: 'verb', tense: 'plup', mood: 'ind', voice: 'passive',
      persons: ['1st'], numbers: ['pl'],
    });
    const highlights = verbHighlights(analysis, verb3);
    expect(highlights).toEqual([{ kind: 'verbal', section: 1, row: 4, cell: 3 }]);
    expect(verb3.sections[1]!.rows[4]!.cells[3]!.form).toBe('raptī erāmus');
  });

  it('highlights subjunctive cells (inferret: imperf subj act 3rd sg)', () => {
    const analysis = a({
      pos: 'verb', tense: 'imperf', mood: 'subj', voice: 'active',
      persons: ['3rd'], numbers: ['sg'],
    });
    expect(verbHighlights(analysis, verb3)).toEqual([
      { kind: 'verbal', section: 2, row: 1, cell: 2 },
    ]);
  });

  it('highlights the imperative rows (futō: fut imperat 3rd sg)', () => {
    const analysis = a({
      pos: 'verb', tense: 'fut', mood: 'imperat', voice: 'active',
      persons: ['3rd'], numbers: ['sg'],
    });
    const highlights = verbHighlights(analysis, verb3);
    expect(highlights).toEqual([{ kind: 'verbal', section: 4, row: 1, cell: 1 }]);
    expect(verb3.sections[4]!.rows[1]!.cells[1]!.form).toBe('rapitō');
  });

  it('highlights the infinitive row (rapere: pres inf act)', () => {
    const analysis = a({ pos: 'verb', tense: 'pres', mood: 'inf', voice: 'active' });
    const highlights = verbHighlights(analysis, verb3);
    expect(highlights).toEqual([{ kind: 'verbal', section: 5, row: 0, cell: 0 }]);
    expect(verb3.sections[5]!.rows[0]!.cells[0]!.form).toBe('rapere');
  });

  it('highlights the participle row by tense and voice (dolēns: pres part act)', () => {
    const analysis = a({ pos: 'verb', tense: 'pres', mood: 'part', voice: 'active' });
    const highlights = verbHighlights(analysis, verb3);
    expect(highlights).toEqual([{ kind: 'verbal', section: 6, row: 0, cell: 0 }]);
    expect(verb3.sections[6]!.rows[0]!.cells[0]!.form).toBe('rapēns');
  });

  it('returns nothing for gerunds, gerundives and tenseless parses', () => {
    expect(
      verbHighlights(a({ pos: 'verb', mood: 'ger', tense: 'pres' }), verb3),
    ).toEqual([]);
    expect(verbHighlights(a({ pos: 'noun', cases: ['nom'] }), verb3)).toEqual([]);
  });
});

describe('paradigmForToken (selected-parse preference + enclitics)', () => {
  /** A two-parse passage: "cano" (verb 1st sg + adjective) with selectable choice. */
  function passageWith(selected: number | undefined): Passage {
    const token: Token = {
      index: 0, text: 'cano', form: 'cano', line: 1,
      ...(selected === undefined ? {} : { selected, selectedBy: 'solver' }),
    };
    return {
      work: 'w', book: 1, title: 't',
      sentences: [{ index: 0, lineStart: 1, lineEnd: 1, tokens: [token], groups: [], order: [] }],
      analyses: {
        cano: [
          a({ pos: 'verb', lemma: 'cano', tense: 'pres', mood: 'ind', voice: 'active', persons: ['1st'], numbers: ['sg'], stem: 'conj3' }),
          a({ pos: 'adjective', lemma: 'canus', cases: ['abl'], numbers: ['sg'], genders: ['masc'], stem: 'us_a_um' }),
        ],
      },
      source: { name: 'n', url: 'u', license: 'l' },
    };
  }

  it('uses the selected parse for both the table and the highlight', () => {
    const passage = passageWith(0);
    const state = paradigmForToken(passage, passage.sentences[0]!.tokens[0]!);
    expect(state.kind).toBe('table');
    if (state.kind === 'table') {
      expect(state.table.id).toBe('verb3');
      expect(state.word).toBe('cano');
      expect(state.highlights).toEqual([{ kind: 'verbal', section: 0, row: 0, cell: 0 }]);
    }
  });

  it('follows a different selection to a different table', () => {
    const passage = passageWith(1);
    const state = paradigmForToken(passage, passage.sentences[0]!.tokens[0]!);
    expect(state.kind).toBe('table');
    if (state.kind === 'table') {
      expect(state.table.id).toBe('adj12-us');
      expect(state.word).toBe('cano');
    }
  });

  it('falls back to the first parse when no selection exists', () => {
    const passage = passageWith(undefined);
    const state = paradigmForToken(passage, passage.sentences[0]!.tokens[0]!);
    expect(state.kind).toBe('table');
    if (state.kind === 'table') expect(state.table.id).toBe('verb3');
  });

  it('enclitics and unanalyzed words show no table', () => {
    const base = passageWith(undefined);
    const enclitic = paradigmForToken(base, { index: 0, text: '-ne', form: 'ne', line: 1 });
    expect(enclitic.kind).toBe('none');
    if (enclitic.kind === 'none') expect(enclitic.reason).toMatch(/enclitic/);

    const unknown = paradigmForToken(base, { index: 0, text: 'profugus', form: 'profugus', line: 1 });
    expect(unknown.kind).toBe('none');
    if (unknown.kind === 'none') expect(unknown.reason).toMatch(/no analysis/);
  });

  it('dispatches highlightsFor by table kind', () => {
    expect(highlightsFor(a({ cases: ['acc'], numbers: ['sg'], genders: ['neut'] }), TABLES['noun2n'] as NominalTable)).toEqual([
      { kind: 'nominal', row: 3, cell: 0 },
    ]);
  });
});
