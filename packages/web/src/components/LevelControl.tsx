import type { AssistanceLevel } from '@lego/shared';

export const LEVELS: ReadonlyArray<{ value: AssistanceLevel; label: string }> = [
  { value: 1, label: 'Parts of speech' },
  { value: 2, label: 'Morphology' },
  { value: 3, label: 'Dictionary form' },
  { value: 4, label: 'Reveal gloss' },
];

export interface LevelControlProps {
  level: AssistanceLevel;
  onChange: (level: AssistanceLevel) => void;
}

/** Segmented control for the assistance level (1–4). */
export function LevelControl({ level, onChange }: LevelControlProps) {
  return (
    <div className="level-control" role="group" aria-label="Assistance level">
      {LEVELS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={value === level ? 'level-control__btn is-active' : 'level-control__btn'}
          aria-pressed={value === level}
          onClick={() => onChange(value)}
        >
          <span className="level-control__num">{value}</span>
          {' '}
          {label}
        </button>
      ))}
    </div>
  );
}
