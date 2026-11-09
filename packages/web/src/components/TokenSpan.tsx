import { useRef } from 'react';
import type { AssistanceLevel, MorpheusAnalysis, Sentence, Token } from '@lego/shared';
import { WordPopover } from './WordPopover';
import { selectedAnalysis } from '../lib/model';
import { cls } from '../lib/cls';

export interface TokenSpanProps {
  token: Token;
  tokenIndex: number;
  sentence: Sentence;
  analyses: MorpheusAnalysis[];
  level: AssistanceLevel;
  active: boolean;
  /** true when this token belongs to a group with the active token */
  linked: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

/**
 * One interactive word. Hover, tap, and keyboard focus all open the
 * popover; moving the mouse off the word *or its popover* (which is a
 * child of this span) closes it. Escape dismisses, and focus is never
 * trapped — Tab moves through the text and the popover closes on blur.
 * Trailing punctuation is rendered attached, but outside this span so it
 * is not part of the hover target.
 */
export function TokenSpan({
  token,
  tokenIndex,
  sentence,
  analyses,
  level,
  active,
  linked,
  onActivate,
  onDeactivate,
}: TokenSpanProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  // "Ambiguous" means *unresolved* ambiguity: several parses and no
  // corpus-chosen one. A word whose parse was disambiguated reads as a
  // normal word (the chosen parse still tops its popover).
  const unresolved = analyses.length > 1 && selectedAnalysis(token, analyses) === null;
  const variety = unresolved
    ? 'token--ambiguous'
    : analyses.length === 0
      ? 'token--unknown'
      : '';

  return (
    <span className="token-unit">
      <span
        ref={wrapRef}
        className={cls('token', variety, active && 'is-active', linked && 'is-linked')}
        tabIndex={0}
        onMouseEnter={onActivate}
        onMouseLeave={onDeactivate}
        onFocus={onActivate}
        onBlur={(event) => {
          if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
            onDeactivate();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDeactivate();
        }}
        onClick={onActivate}
      >
        {token.text}
        {active && (
          <WordPopover
            token={token}
            tokenIndex={tokenIndex}
            sentence={sentence}
            analyses={analyses}
            level={level}
            anchor={wrapRef.current}
          />
        )}
      </span>
      {token.punctuation !== undefined && (
        <span className="token-unit__punct">{token.punctuation}</span>
      )}
    </span>
  );
}
