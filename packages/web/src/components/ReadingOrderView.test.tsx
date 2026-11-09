import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ReadingOrderView } from './ReadingOrderView';
import { mockPassage } from '../lib/loadPassage';
import type { TokenKey } from '../lib/model';

function renderReadingOrder() {
  function Harness() {
    const [active, setActive] = useState<TokenKey | null>(null);
    return (
      <ReadingOrderView
        passage={mockPassage}
        level={1}
        active={active}
        onActiveChange={setActive}
      />
    );
  }
  return render(<Harness />);
}

describe('ReadingOrderView', () => {
  it('renders each sentence with its line range and original text', () => {
    renderReadingOrder();
    expect(screen.getByText('Sentence 1 · line 1')).toBeInTheDocument();
    expect(screen.getByText('Sentence 2 · lines 1–2')).toBeInTheDocument();
    // the original sentences stay interactive
    expect(screen.getByText('Arma', { selector: '.token' })).toBeInTheDocument();
    expect(screen.getByText('venit', { selector: '.token' })).toBeInTheDocument();
  });

  it('renders a numbered chunk sequence with labels and chunk words', () => {
    renderReadingOrder();
    expect(screen.getAllByText('1.', { selector: '.ro-chunk__num' })).toHaveLength(2);
    expect(screen.getAllByText('6.', { selector: '.ro-chunk__num' })).toHaveLength(1);

    const subjectChunk = screen.getAllByText('subject')[0]!.closest('.ro-chunk');
    expect(subjectChunk?.textContent).toContain('qui primus');

    const phraseChunks = screen.getAllByText('phrase');
    expect(phraseChunks[0]!.closest('.ro-chunk')?.textContent).toContain('ab oris troiae');
    expect(phraseChunks[1]!.closest('.ro-chunk')?.textContent).toContain('fato profugus');
  });

  it('mirrors group highlighting in the chunk words', () => {
    renderReadingOrder();
    fireEvent.mouseEnter(screen.getByText('primus', { selector: '.token' }));
    expect(screen.getByText('qui', { selector: '.ro-word' })).toHaveClass('is-linked');
    expect(screen.getByText('primus', { selector: '.ro-word' })).toHaveClass('is-active');
  });
});
