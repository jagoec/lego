import type { AnalysisView } from '../lib/morphology';

export interface AnalysisCardProps {
  view: AnalysisView;
  /** e.g. "1/2" when a form has several parses */
  ordinal?: string;
}

/**
 * One parse of a word, already filtered to the current assistance level
 * by `toAnalysisView` — this component only renders what it is given.
 */
export function AnalysisCard({ view, ordinal }: AnalysisCardProps) {
  return (
    <span className="analysis">
      <span className="analysis__pos">
        {view.pos}
        {ordinal !== undefined && <span className="analysis__ordinal"> {ordinal}</span>}
      </span>
      {view.morphology !== undefined && (
        <span className="analysis__morphology">{view.morphology}</span>
      )}
      {view.lemma !== undefined && (
        <span className="analysis__row">
          <span className="analysis__key">lemma</span>
          <span className="analysis__value">{view.lemma}</span>
        </span>
      )}
      {view.stem !== undefined && (
        <span className="analysis__row">
          <span className="analysis__key">stem</span>
          <span className="analysis__value">
            {view.stemLabel !== undefined ? `${view.stemLabel} — ` : ''}
            {view.stem}
          </span>
        </span>
      )}
      {view.features !== undefined && (
        <span className="analysis__row">
          <span className="analysis__key">features</span>
          <span className="analysis__value">{view.features.join(', ')}</span>
        </span>
      )}
    </span>
  );
}
