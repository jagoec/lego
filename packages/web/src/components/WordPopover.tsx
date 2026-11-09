import { useEffect, useLayoutEffect, useState } from 'react';
import type {
  AssistanceLevel,
  Group,
  MorpheusAnalysis,
  Sentence,
  Token,
} from '@lego/shared';
import { AnalysisCard } from './AnalysisCard';
import { GlossReveal } from './GlossReveal';
import { groupsForToken } from '../lib/groups';
import { getToken, selectedAnalysis } from '../lib/model';
import { GROUP_KIND_LABELS, toAnalysisView } from '../lib/morphology';
import { choosePlacement, type Placement } from '../lib/placement';
import { cls } from '../lib/cls';

export interface WordPopoverProps {
  token: Token;
  tokenIndex: number;
  sentence: Sentence;
  analyses: MorpheusAnalysis[];
  level: AssistanceLevel;
  /** the interactive token element the popover is anchored to */
  anchor: HTMLElement | null;
}

/**
 * The hover/tap popover for one word. Rendered *inside* the token span,
 * absolutely positioned relative to it, so hovering the popover keeps it
 * open and it scrolls with the text. Flips above the token (and aligns
 * right) near the viewport edges; Escape and blur are handled by the
 * token span itself.
 *
 * When the corpus disambiguator has chosen a parse (`token.selected`),
 * that parse is featured at the top with a check marker and the other
 * parses collapse behind a toggle — still shown, just out of the way.
 * Unresolved ambiguous forms keep the v1 show-all behavior.
 *
 * All markup is phrasing content (spans styled as blocks) because the
 * popover lives inside the running text.
 */
export function WordPopover({ token, tokenIndex, sentence, analyses, level, anchor }: WordPopoverProps) {
  const [placement, setPlacement] = useState<Placement>({ vertical: 'below', horizontal: 'start' });
  const [showOthers, setShowOthers] = useState(false);

  // The expander always starts collapsed for a fresh popover (the popover
  // unmounts on close, but reset on token change too so directly-rendered
  // popovers behave the same when the word switches underneath them).
  useEffect(() => {
    setShowOthers(false);
  }, [token]);

  useLayoutEffect(() => {
    if (anchor === null) return;
    const recompute = () => {
      const rect = anchor.getBoundingClientRect();
      setPlacement((prev) => {
        const next = choosePlacement(rect, { width: window.innerWidth, height: window.innerHeight });
        return prev.vertical === next.vertical && prev.horizontal === next.horizontal ? prev : next;
      });
    };
    recompute();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [anchor]);

  const groups = groupsForToken(sentence, tokenIndex);
  const total = analyses.length;
  const enclitics = (token.enclitics ?? []).map((enclitic) => `-${enclitic}`).join(' ');
  const featured = selectedAnalysis(token, analyses);
  const others =
    featured === null
      ? []
      : analyses.filter((analysis) => analysis !== featured);

  return (
    <span
      className={cls(
        'word-popover',
        `word-popover--${placement.vertical}`,
        `word-popover--${placement.horizontal}`,
      )}
    >
      <span className="word-popover__head">
        <span className="word-popover__word">{token.text}</span>
        {enclitics !== '' && (
          <span className="word-popover__split">
            {token.form} + {enclitics}
          </span>
        )}
        {total > 1 && <span className="word-popover__count">{total} analyses</span>}
      </span>

      {total === 0 ? (
        <span className="word-popover__none">no analysis available</span>
      ) : featured !== null ? (
        <>
          <AnalysisCard
            key="featured"
            view={toAnalysisView(featured, level)}
            featured
          />
          {others.length > 0 && (
            <>
              <button
                type="button"
                className="word-popover__expander"
                aria-expanded={showOthers}
                aria-controls="word-popover-others"
                onClick={() => {
                  setShowOthers((value) => !value);
                }}
              >
                Other possible parses ({others.length}) {showOthers ? '▾' : '▸'}
              </button>
              {showOthers && (
                <span className="word-popover__others" id="word-popover-others">
                  {others.map((analysis) => {
                    const i = analyses.indexOf(analysis);
                    return (
                      <AnalysisCard
                        key={`${analysis.pos}:${analysis.lemma}:${i}`}
                        view={toAnalysisView(analysis, level)}
                        ordinal={`${i + 1}/${total}`}
                      />
                    );
                  })}
                </span>
              )}
            </>
          )}
        </>
      ) : (
        analyses.map((analysis, i) => (
          <AnalysisCard
            key={`${analysis.pos}:${analysis.lemma}:${i}`}
            view={toAnalysisView(analysis, level)}
            ordinal={total > 1 ? `${i + 1}/${total}` : undefined}
          />
        ))
      )}

      {level === 4 && <GlossReveal />}

      {groups.length > 0 && (
        <span className="word-popover__links">
          {groups.map((group, i) => (
            <GroupLink key={i} group={group} sentence={sentence} tokenIndex={tokenIndex} />
          ))}
        </span>
      )}
    </span>
  );
}

/** "agrees with: qui (masc nom sg)" — the partners of one group. */
function GroupLink({ group, sentence, tokenIndex }: { group: Group; sentence: Sentence; tokenIndex: number }) {
  const partners = group.tokenIndices
    .filter((index) => index !== tokenIndex)
    .map((index) => getToken(sentence, index)?.text)
    .filter((text): text is string => text !== undefined);
  const kind = GROUP_KIND_LABELS[group.kind] ?? group.kind;

  return (
    <span className="word-popover__link">
      <span className="word-popover__link-kind">{kind}:</span>{' '}
      <span className="word-popover__link-words">{partners.join(' · ')}</span>
      {group.matched !== undefined && (
        <span className="word-popover__link-matched"> ({group.matched})</span>
      )}
    </span>
  );
}
