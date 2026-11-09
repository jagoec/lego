/**
 * Model for the static paradigm tables (reference material shown in the
 * side panel). Tables are plain data — declension/conjugation endings
 * with macrons, keyed by table id — plus pure helpers that map a
 * morpheus analysis onto a table and highlight the word's own cell.
 *
 * The reading text itself stays macron-free; macrons appear ONLY in
 * these reference tables.
 */
import type { Gender, LatinCase, Mood, Person, Tense, Voice } from '@lego/shared';

/** Every table in `data/index.ts` — the stem/lemma mapping targets these. */
export type TableId =
  // nouns
  | 'noun1'
  | 'noun2m'
  | 'noun2n'
  | 'noun3c-mf'
  | 'noun3c-n'
  | 'noun3i-mf'
  | 'noun3i-n'
  | 'noun4-mf'
  | 'noun4-n'
  | 'noun5'
  // adjectives
  | 'adj12-us'
  | 'adj12-er'
  | 'adj3-three'
  | 'adj3-two'
  | 'adj3-one'
  // verbs
  | 'verb1'
  | 'verb2'
  | 'verb3'
  | 'verb3io'
  | 'verb4'
  | 'esse'
  | 'posse'
  | 'ire'
  | 'ferre'
  | 'volo'
  // pronouns
  | 'pron-ego'
  | 'pron-tu'
  | 'pron-is'
  | 'pron-hic'
  | 'pron-ille'
  | 'pron-iste'
  | 'pron-ipse'
  | 'pron-qui'
  | 'pron-se'
  | 'pron-quis';

/** A column of a nominal table: one number, optionally one gender. */
export interface NominalColumn {
  number: 'sg' | 'pl';
  /** gender distinguished by this column; null when the table has no gender split */
  gender: Gender | null;
}

/** One case row of a nominal table. `forms` aligns with the columns. */
export interface NominalRow {
  case: LatinCase;
  /** null = the slot does not exist (e.g. no vocative for sē) */
  forms: ReadonlyArray<string | null>;
}

export interface NominalTable {
  kind: 'nominal';
  id: TableId;
  /** pedagogical title, e.g. "3rd declension (consonant stems) · rēgēs" */
  title: string;
  /** caveat shown under the title when the table is only approximate */
  note?: string;
  columns: ReadonlyArray<NominalColumn>;
  rows: ReadonlyArray<NominalRow>;
}

/** One cell of a verbal table row. */
export interface VerbCell {
  /** null = the slot does not exist (e.g. no 2nd-pl future passive imperative) */
  form: string | null;
  person: Person | null;
  number: 'sg' | 'pl' | null;
}

/**
 * One paradigm row: a tense/mood/voice combination. Finite rows carry
 * six person/number cells; infinitive and participle rows carry a single
 * form with no person/number.
 */
export interface VerbRow {
  tense: Tense;
  mood: Mood;
  voice: Voice;
  /** row caption, e.g. "present", "pluperfect" */
  label: string;
  cells: ReadonlyArray<VerbCell>;
}

export interface VerbSection {
  /** section caption, e.g. "Indicative · active" */
  label: string;
  rows: ReadonlyArray<VerbRow>;
}

export interface VerbTable {
  kind: 'verbal';
  id: TableId;
  title: string;
  note?: string;
  sections: ReadonlyArray<VerbSection>;
}

export type ParadigmTable = NominalTable | VerbTable;

/** A highlighted cell location within a table. */
export type Highlight =
  | { kind: 'nominal'; row: number; cell: number }
  | { kind: 'verbal'; section: number; row: number; cell: number };
