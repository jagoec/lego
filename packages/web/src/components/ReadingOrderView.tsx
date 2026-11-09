import { Fragment, useState } from 'react';
import type { AssistanceLevel, Chunk, Passage, Sentence } from '@lego/shared';
import { TokenSpan } from './TokenSpan';
import { linkedTokenIndices } from '../lib/groups';
import { analysesForToken, lineRangeLabel, tokenText, type TokenKey } from '../lib/model';
import { cls } from '../lib/cls';

export interface ReadingOrderViewProps {
  passage: Passage;
  level: AssistanceLevel;
  active: TokenKey | null;
  onActiveChange: (key: TokenKey | null) => void;
}

/**
 * The reading-order view: each sentence is shown as its own unit — the
 * original text (fully interactive, same tokens and popovers as the
 * verse view) above a numbered sequence of sense-unit chunks.
 */
export function ReadingOrderView({ passage, level, active, onActiveChange }: ReadingOrderViewProps) {
  return (
    <section className="reading-order" aria-label="Reading order">
      {passage.sentences.map((sentence, sentenceIndex) => (
        <SentenceOrder
          key={sentenceIndex}
          sentence={sentence}
          sentenceIndex={sentenceIndex}
          passage={passage}
          level={level}
          active={active}
          onActiveChange={onActiveChange}
        />
      ))}
    </section>
  );
}

interface SentenceOrderProps {
  sentence: Sentence;
  sentenceIndex: number;
  passage: Passage;
  level: AssistanceLevel;
  active: TokenKey | null;
  onActiveChange: (key: TokenKey | null) => void;
}

function SentenceOrder({ sentence, sentenceIndex, passage, level, active, onActiveChange }: SentenceOrderProps) {
  const [order] = useState<Chunk[]>(() => [...sentence.order].sort((a, b) => a.order - b.order));
  const activeHere = active !== null && active.sentenceIndex === sentenceIndex;
  const linked = activeHere ? linkedTokenIndices(sentence, active.tokenIndex) : new Set<number>();

  return (
    <article className="ro-sentence">
      <h3 className="ro-sentence__head">
        Sentence {sentenceIndex + 1} · {lineRangeLabel(sentence)}
      </h3>
      <p className="ro-sentence__original">
        {sentence.tokens.map((token, tokenIndex) => (
          <Fragment key={tokenIndex}>
            <TokenSpan
              token={token}
              tokenIndex={tokenIndex}
              sentence={sentence}
              analyses={analysesForToken(passage, token)}
              level={level}
              active={activeHere && active.tokenIndex === tokenIndex}
              linked={linked.has(tokenIndex)}
              onActivate={() => onActiveChange({ sentenceIndex, tokenIndex })}
              onDeactivate={() => onActiveChange(null)}
            />
            {tokenIndex < sentence.tokens.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </p>
      <ol className="ro-chunks">
        {order.map((chunk) => (
          <li className="ro-chunk" key={chunk.order}>
            <span className="ro-chunk__num">{chunk.order}.</span>
            {chunk.label !== undefined && <span className="ro-chunk__label">{chunk.label}</span>}
            <span className="ro-chunk__words">
              {chunk.tokenIndices.map((tokenIndex, i) => {
                const token = sentence.tokens[tokenIndex];
                if (token === undefined) return null;
                return (
                  <Fragment key={tokenIndex}>
                    {i > 0 ? ' ' : null}
                    <span
                      className={cls(
                        'ro-word',
                        activeHere && active.tokenIndex === tokenIndex && 'is-active',
                        linked.has(tokenIndex) && 'is-linked',
                      )}
                    >
                      {tokenText(token)}
                    </span>
                  </Fragment>
                );
              })}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}
