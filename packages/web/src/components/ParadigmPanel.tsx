import { useEffect } from 'react';
import type { ParadigmState } from '../paradigms';
import type { Highlight, NominalTable, VerbTable } from '../paradigms/types';
import { cls } from '../lib/cls';

export interface ParadigmPanelProps {
  state: ParadigmState;
  open: boolean;
  onClose: () => void;
}

/**
 * The fixed right-hand paradigm panel, synced to the hovered/focused
 * word (the same active token that drives the popover). It never takes
 * DOM focus — the words keep it; Escape closes via a document-level
 * listener. The popover (z-index 40) floats above the panel (30), so a
 * popover near the right edge simply overlays it.
 */
export function ParadigmPanel({ state, open, onClose }: ParadigmPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside className="paradigm-panel" role="complementary" aria-label="Paradigm table">
      <div className="paradigm-panel__head">
        <h2 className="paradigm-panel__title">
          {state.kind === 'table' ? state.table.title : 'Paradigm table'}
        </h2>
        <button
          type="button"
          className="paradigm-panel__close"
          aria-label="Close paradigm panel"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {state.kind === 'table' ? (
        <>
          <p className="paradigm-panel__word">{state.word}</p>
          {state.note !== undefined && <p className="paradigm-panel__note">{state.note}</p>}
          {state.table.kind === 'nominal' ? (
            <NominalView
              table={state.table}
              highlights={state.highlights.filter(
                (h): h is Extract<Highlight, { kind: 'nominal' }> => h.kind === 'nominal',
              )}
            />
          ) : (
            <VerbalView
              table={state.table}
              highlights={state.highlights.filter(
                (h): h is Extract<Highlight, { kind: 'verbal' }> => h.kind === 'verbal',
              )}
            />
          )}
          {state.table.note !== undefined && (
            <p className="paradigm-panel__note">{state.table.note}</p>
          )}
        </>
      ) : state.kind === 'none' ? (
        <p className="paradigm-panel__empty">
          no paradigm for <span className="paradigm-panel__empty-word">{state.word}</span>
          {state.reason !== undefined && (
            <span className="paradigm-panel__reason"> — {state.reason}</span>
          )}
        </p>
      ) : (
        <p className="paradigm-panel__empty">hover a word to see its paradigm</p>
      )}
    </aside>
  );
}

type NominalHighlight = Extract<Highlight, { kind: 'nominal' }>;
type VerbalHighlight = Extract<Highlight, { kind: 'verbal' }>;

const GENDER_SHORT: Readonly<Record<string, string>> = { masc: 'm', fem: 'f', neut: 'n' };
const PERSON_SHORT: Readonly<Record<string, string>> = { '1st': '1', '2nd': '2', '3rd': '3' };

function NominalView({ table, highlights }: { table: NominalTable; highlights: NominalHighlight[] }) {
  const here = new Set(highlights.map((h) => `${h.row}:${h.cell}`));
  return (
    <table className="paradigm-table">
      <thead>
        <tr>
          <th scope="col" className="paradigm-table__corner" aria-hidden="true" />
          {table.columns.map((column, i) => (
            <th scope="col" className="paradigm-table__colhead" key={i}>
              {column.gender === null ? column.number : `${column.number} ${GENDER_SHORT[column.gender]}`}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, r) => (
          <tr key={row.case}>
            <th scope="row" className="paradigm-table__rowhead">
              {row.case}
            </th>
            {row.forms.map((form, c) =>
              form === null ? (
                <td key={c} className="paradigm-table__cell paradigm-table__cell--blank" />
              ) : (
                <td
                  key={c}
                  className={cls('paradigm-table__cell', here.has(`${r}:${c}`) && 'is-here')}
                  aria-current={here.has(`${r}:${c}`) ? 'true' : undefined}
                >
                  {form}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VerbalView({ table, highlights }: { table: VerbTable; highlights: VerbalHighlight[] }) {
  const here = new Set(highlights.map((h) => `${h.section}:${h.row}:${h.cell}`));
  return (
    <div className="paradigm-verb">
      {table.sections.map((section, s) => (
        <section className="paradigm-verb__section" key={section.label}>
          <h4 className="paradigm-verb__section-label">{section.label}</h4>
          {section.rows.map((row, r) => (
            <div className="paradigm-verb__row" key={`${row.tense}:${row.mood}:${row.voice}`}>
              <span className="paradigm-verb__row-label">{row.label}</span>
              <span className="paradigm-verb__cells">
                {row.cells.map((cell, c) =>
                  cell.form === null ? null : (
                    <span
                      key={c}
                      className={cls('paradigm-verb__cell', here.has(`${s}:${r}:${c}`) && 'is-here')}
                      aria-current={here.has(`${s}:${r}:${c}`) ? 'true' : undefined}
                    >
                      <span className="paradigm-verb__form">{cell.form}</span>
                      {cell.person !== null && cell.number !== null && (
                        <span className="paradigm-verb__tag">
                          {PERSON_SHORT[cell.person]}
                          {cell.number}
                        </span>
                      )}
                    </span>
                  ),
                )}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
