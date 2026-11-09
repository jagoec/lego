import type { MorpheusAnalysis } from '@lego/shared';
import type { Highlight, NominalTable, ParadigmTable, VerbTable } from './types';

/**
 * Pure helpers that locate a word's own cell(s) inside a paradigm table.
 *
 * Nominals match case × number (× gender when the table splits columns
 * by gender); slash groups like nom/voc/acc highlight every matching
 * cell. Verbals match tense × mood × voice × person × number;
 * infinitives match their row's single cell, participles the participle
 * row's cell for their tense and voice.
 */

export function nominalHighlights(
  analysis: MorpheusAnalysis,
  table: NominalTable,
): Array<Extract<Highlight, { kind: 'nominal' }>> {
  const out: Array<Extract<Highlight, { kind: 'nominal' }>> = [];
  if (analysis.cases === undefined) return out;
  table.rows.forEach((row, rowIdx) => {
    if (!analysis.cases!.includes(row.case)) return;
    table.columns.forEach((column, cellIdx) => {
      const form = row.forms[cellIdx];
      if (form === null || form === undefined) return; // empty slot
      if (analysis.numbers !== undefined && !analysis.numbers.includes(column.number)) return;
      if (
        column.gender !== null &&
        analysis.genders !== undefined &&
        !analysis.genders.includes(column.gender)
      ) {
        return;
      }
      out.push({ kind: 'nominal', row: rowIdx, cell: cellIdx });
    });
  });
  return out;
}

export function verbHighlights(
  analysis: MorpheusAnalysis,
  table: VerbTable,
): Array<Extract<Highlight, { kind: 'verbal' }>> {
  const out: Array<Extract<Highlight, { kind: 'verbal' }>> = [];
  if (analysis.tense === undefined || analysis.mood === undefined) return out;
  table.sections.forEach((section, sectionIdx) => {
    section.rows.forEach((row, rowIdx) => {
      if (row.tense !== analysis.tense || row.mood !== analysis.mood) return;
      if (row.voice !== analysis.voice) return;
      row.cells.forEach((cell, cellIdx) => {
        if (cell.form === null) return; // empty slot (e.g. 2pl future passive imperative)
        if (cell.person !== null && (analysis.persons === undefined || !analysis.persons.includes(cell.person))) return;
        if (cell.number !== null && (analysis.numbers === undefined || !analysis.numbers.includes(cell.number))) return;
        out.push({ kind: 'verbal', section: sectionIdx, row: rowIdx, cell: cellIdx });
      });
    });
  });
  return out;
}

/** Highlight coordinates for the word's own cell(s) in its table. */
export function highlightsFor(analysis: MorpheusAnalysis, table: ParadigmTable): Highlight[] {
  return table.kind === 'nominal'
    ? nominalHighlights(analysis, table)
    : verbHighlights(analysis, table);
}
