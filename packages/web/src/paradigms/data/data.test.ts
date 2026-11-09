import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LATIN_CASES } from '@lego/shared';
import { TABLES } from './index';
import type { NominalTable, TableId, VerbTable } from '../types';

const here = dirname(fileURLToPath(import.meta.url));

/** The TableId union spelled out — the registry must cover it exactly. */
const EXPECTED_IDS: readonly TableId[] = [
  'noun1', 'noun2m', 'noun2n', 'noun3c-mf', 'noun3c-n', 'noun3i-mf', 'noun3i-n',
  'noun4-mf', 'noun4-n', 'noun5',
  'adj12-us', 'adj12-er', 'adj3-three', 'adj3-two', 'adj3-one',
  'verb1', 'verb2', 'verb3', 'verb3io', 'verb4', 'esse', 'posse', 'ire', 'ferre', 'volo',
  'pron-ego', 'pron-tu', 'pron-is', 'pron-hic', 'pron-ille', 'pron-iste', 'pron-ipse',
  'pron-qui', 'pron-se', 'pron-quis',
];

describe('paradigm table registry', () => {
  it('has exactly one table per TableId', () => {
    expect([...Object.keys(TABLES)].sort()).toEqual([...EXPECTED_IDS].sort());
    for (const id of EXPECTED_IDS) {
      expect(TABLES[id], `table ${id}`).toBeDefined();
      expect(TABLES[id]!.id).toBe(id);
    }
  });

  it('titles every table pedagogically (pattern · exemplar)', () => {
    for (const table of Object.values(TABLES)) {
      expect(table.title).toMatch(/[·]/);
      expect(table.title.length).toBeGreaterThan(3);
    }
    expect(TABLES['noun1']!.title).toBe('1st declension · fēminae');
    expect(TABLES['noun3c-mf']!.title).toBe('3rd declension (consonant stems) · rēgēs');
    expect(TABLES['verb1']!.title).toBe('1st conjugation · amāre');
  });
});

describe('nominal table shapes', () => {
  const nominals = Object.values(TABLES).filter(
    (table): table is NominalTable => table.kind === 'nominal',
  );

  it('every row has exactly one form per column, and forms are never empty strings', () => {
    for (const table of nominals) {
      for (const row of table.rows) {
        expect(row.forms, `${table.id} ${row.case}`).toHaveLength(table.columns.length);
        for (const form of row.forms) {
          expect(form === null || form.length > 0, `${table.id} ${row.case}`).toBe(true);
        }
      }
    }
  });

  it('each case appears at most once per table', () => {
    for (const table of nominals) {
      const cases = table.rows.map((row) => row.case);
      expect(new Set(cases).size, table.id).toBe(cases.length);
      for (const rowCase of cases) {
        expect(LATIN_CASES).toContain(rowCase);
      }
    }
  });

  it('noun tables split sg/pl without gender columns; adjective and pronoun tables split by gender', () => {
    const nominal = (id: TableId): NominalTable => TABLES[id] as NominalTable;
    for (const id of ['noun1', 'noun2m', 'noun2n', 'noun3c-mf', 'noun3c-n', 'noun3i-mf', 'noun3i-n', 'noun4-mf', 'noun4-n', 'noun5'] as const) {
      expect(nominal(id).columns.map((c) => c.gender)).toEqual([null, null]);
      expect(nominal(id).columns.map((c) => c.number)).toEqual(['sg', 'pl']);
    }
    for (const id of ['adj12-us', 'adj12-er', 'adj3-three', 'adj3-two', 'adj3-one'] as const) {
      expect(nominal(id).columns.map((c) => `${c.number} ${c.gender}`)).toEqual([
        'sg masc', 'sg fem', 'sg neut', 'pl masc', 'pl fem', 'pl neut',
      ]);
    }
  });

  it('uses macronized reference forms in the cells', () => {
    const noun1 = TABLES['noun1'] as NominalTable;
    const noun3i = TABLES['noun3i-mf'] as NominalTable;
    const noun5 = TABLES['noun5'] as NominalTable;
    const adj12 = TABLES['adj12-us'] as NominalTable;
    const qui = TABLES['pron-qui'] as NominalTable;
    const se = TABLES['pron-se'] as NominalTable;
    expect(noun1.rows.find((r) => r.case === 'acc')!.forms[0]).toBe('fēminam');
    expect(noun3i.rows.find((r) => r.case === 'gen')!.forms[1]).toBe('cīvium');
    expect(noun5.rows.find((r) => r.case === 'abl')!.forms[0]).toBe('rē');
    expect(adj12.rows.find((r) => r.case === 'nom')!.forms).toEqual([
      'bonus', 'bona', 'bonum', 'bonī', 'bonae', 'bona',
    ]);
    expect(qui.rows.find((r) => r.case === 'gen')!.forms[0]).toBe('cuius');
    expect(se.rows.find((r) => r.case === 'nom')!.forms).toEqual([null, null]);
  });
});

describe('verbal table shapes', () => {
  const verbals = Object.values(TABLES).filter(
    (table): table is VerbTable => table.kind === 'verbal',
  );

  it('finite indicative/subjunctive rows have six person/number cells in canonical order', () => {
    for (const table of verbals) {
      for (const section of table.sections) {
        for (const row of section.rows) {
          if (row.mood !== 'ind' && row.mood !== 'subj') continue;
          expect(row.cells, `${table.id} ${row.tense} ${row.mood} ${row.voice}`).toHaveLength(6);
          expect(row.cells.map((c) => `${c.person} ${c.number}`)).toEqual([
            '1st sg', '2nd sg', '3rd sg', '1st pl', '2nd pl', '3rd pl',
          ]);
        }
      }
    }
  });

  it('imperative rows carry person/number; infinitive and participle rows are single cells', () => {
    for (const table of verbals) {
      for (const section of table.sections) {
        for (const row of section.rows) {
          if (row.mood === 'imperat') {
            expect(row.cells.length).toBeGreaterThan(0);
            for (const cell of row.cells) {
              expect(cell.person).not.toBeNull();
              expect(cell.number).not.toBeNull();
            }
          }
          if (row.mood === 'inf' || row.mood === 'part') {
            expect(row.cells, `${table.id} ${row.label}`).toHaveLength(1);
            expect(row.cells[0]!.person).toBeNull();
            expect(row.cells[0]!.number).toBeNull();
          }
        }
      }
    }
  });

  it('the four conjugations cover all 6 tenses × 2 voices in the indicative', () => {
    for (const id of ['verb1', 'verb2', 'verb3', 'verb3io', 'verb4'] as const) {
      const table = TABLES[id] as VerbTable;
      const ind = table.sections[0]!.rows; // Indicative · active
      const pass = table.sections[1]!.rows; // Indicative · passive
      expect(ind.map((r) => r.tense)).toEqual(['pres', 'imperf', 'fut', 'perf', 'plup', 'futp']);
      expect(pass.map((r) => r.tense)).toEqual(['pres', 'imperf', 'fut', 'perf', 'plup', 'futp']);
      expect(ind.every((r) => r.voice === 'active')).toBe(true);
      expect(pass.every((r) => r.voice === 'passive')).toBe(true);
    }
  });

  it('infinitive and participle sections exist for the regular conjugations', () => {
    for (const id of ['verb1', 'verb2', 'verb3', 'verb3io', 'verb4'] as const) {
      const table = TABLES[id] as VerbTable;
      const inf = table.sections.find((s) => s.label === 'Infinitive')!;
      const part = table.sections.find((s) => s.label === 'Participle')!;
      expect(inf.rows.map((r) => `${r.tense} ${r.voice}`)).toEqual([
        'pres active', 'pres passive', 'perf active', 'perf passive', 'fut active', 'fut passive',
      ]);
      expect(part.rows.map((r) => `${r.tense} ${r.voice}`)).toEqual([
        'pres active', 'perf passive', 'fut active', 'fut passive',
      ]);
    }
  });

  it('spot-checks the irregular paradigms', () => {
    const esse = TABLES['esse'] as VerbTable;
    expect(esse.sections[0]!.rows[0]!.cells.map((c) => c.form)).toEqual([
      'sum', 'es', 'est', 'sumus', 'estis', 'sunt',
    ]);
    const ire = TABLES['ire'] as VerbTable;
    expect(ire.sections[0]!.rows[0]!.cells.map((c) => c.form)).toEqual([
      'eō', 'īs', 'it', 'īmus', 'ītis', 'eunt',
    ]);
    const volo = TABLES['volo'] as VerbTable;
    expect(volo.sections[0]!.rows[0]!.cells.map((c) => c.form)).toEqual([
      'volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt',
    ]);
    const ferre = TABLES['ferre'] as VerbTable;
    expect(ferre.sections[1]!.rows[3]!.cells.map((c) => c.form)).toEqual([
      'lātus sum', 'lātus es', 'lātus est', 'lātī sumus', 'lātī estis', 'lātī sunt',
    ]);
    const posse = TABLES['posse'] as VerbTable;
    expect(posse.sections[0]!.rows[0]!.cells.map((c) => c.form)).toEqual([
      'possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt',
    ]);
  });

  it('cells render Latin forms with macrons (reference material)', () => {
    const verb1 = TABLES['verb1'] as VerbTable;
    expect(verb1.sections[0]!.rows[0]!.cells[0]!.form).toBe('amō');
    expect(verb1.sections[5]!.rows[0]!.cells[0]!.form).toBe('amāre');
    // the reading text (fixture + components) stays macron-free — the only
    // macronized strings in the app live in the paradigm data
    const css = readFileSync(join(here, '../../styles.css'), 'utf8');
    const mock = readFileSync(join(here, '../../fixtures/mock-passage.json'), 'utf8');
    expect(mock).not.toMatch(/[āēīōū]/);
    expect(css).not.toMatch(/[āēīōū]/);
  });
});
