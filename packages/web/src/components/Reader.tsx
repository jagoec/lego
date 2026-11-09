import { Fragment, useMemo } from 'react';
import type { AssistanceLevel, Passage } from '@lego/shared';
import { TokenSpan } from './TokenSpan';
import { linkedTokenIndices } from '../lib/groups';
import {
  analysesForToken,
  buildLineRows,
  sentenceBreaks,
  type TokenKey,
} from '../lib/model';

export interface ReaderProps {
  passage: Passage;
  level: AssistanceLevel;
  active: TokenKey | null;
  onActiveChange: (key: TokenKey | null) => void;
}

/**
 * The reading view: the passage laid out by verse line with line numbers
 * in a gutter. Sentences can start and end mid-line; those boundaries
 * get a subtle hairline mark.
 */
export function Reader({ passage, level, active, onActiveChange }: ReaderProps) {
  const rows = useMemo(() => buildLineRows(passage.sentences), [passage]);

  return (
    <section className="poem" aria-label="Passage text">
      {rows.map((row) => {
        const breaks = sentenceBreaks(row.items);
        return (
          <div className="line" key={row.line}>
            <span className="line__num" aria-hidden="true">
              {row.line}
            </span>
            <p className="line__text">
              {row.items.map((item, i) => {
                const sentence = passage.sentences[item.key.sentenceIndex];
                if (sentence === undefined) return null;
                const activeHere =
                  active !== null && active.sentenceIndex === item.key.sentenceIndex;
                const linked = activeHere
                  ? linkedTokenIndices(sentence, active.tokenIndex)
                  : new Set<number>();
                return (
                  <Fragment key={`${item.key.sentenceIndex}:${item.key.tokenIndex}`}>
                    {breaks[i] === true && <span className="line__break" aria-hidden="true" />}
                    <TokenSpan
                      token={item.token}
                      tokenIndex={item.key.tokenIndex}
                      sentence={sentence}
                      analyses={analysesForToken(passage, item.token)}
                      level={level}
                      active={activeHere && active.tokenIndex === item.key.tokenIndex}
                      linked={linked.has(item.key.tokenIndex)}
                      onActivate={() => onActiveChange(item.key)}
                      onDeactivate={() => onActiveChange(null)}
                    />
                    {i < row.items.length - 1 ? ' ' : null}
                  </Fragment>
                );
              })}
            </p>
          </div>
        );
      })}
    </section>
  );
}
