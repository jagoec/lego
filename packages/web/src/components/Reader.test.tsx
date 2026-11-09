import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { AssistanceLevel } from '@lego/shared';
import { Reader } from './Reader';
import { mockPassage } from '../lib/loadPassage';
import type { TokenKey } from '../lib/model';

/** Reader with the same controlled active-token state App uses. */
function renderReader(level: AssistanceLevel = 1) {
  function Harness() {
    const [active, setActive] = useState<TokenKey | null>(null);
    return (
      <Reader passage={mockPassage} level={level} active={active} onActiveChange={setActive} />
    );
  }
  return render(<Harness />);
}

describe('Reader (verse layout)', () => {
  it('lays the passage out by verse line with gutter numbers', () => {
    renderReader();
    expect(screen.getByText('1', { selector: '.line__num' })).toBeInTheDocument();
    expect(screen.getByText('2', { selector: '.line__num' })).toBeInTheDocument();
  });

  it('renders punctuation attached to the token but outside the hover target', () => {
    const { container } = renderReader();
    const commas = screen.getAllByText(',');
    expect(commas).toHaveLength(2);
    for (const comma of commas) {
      expect(comma).toHaveClass('token-unit__punct');
      expect(comma.closest('.token')).toBeNull();
    }
    // hovering the comma does nothing
    fireEvent.mouseEnter(commas[0]!);
    expect(container.querySelector('.word-popover')).toBeNull();
  });

  it('marks unresolved words with a dotted style and disambiguated ones as normal', () => {
    renderReader();
    // cano is ambiguous in the abstract but has a corpus-chosen parse
    expect(screen.getByText('cano')).not.toHaveClass('token--ambiguous');
    expect(screen.getByText('troiae')).toHaveClass('token--ambiguous');
    expect(screen.getByText('profugus')).toHaveClass('token--unknown');
    expect(screen.getByText('primus')).not.toHaveClass('token--ambiguous');
    expect(screen.getByText('primus')).not.toHaveClass('token--unknown');
  });
});

describe('group highlighting', () => {
  it('highlights agreement partners on hover and lists them in the popover', () => {
    renderReader();
    const primus = screen.getByText('primus');
    fireEvent.mouseEnter(primus);

    expect(primus).toHaveClass('is-active');
    expect(screen.getByText('qui', { selector: '.token' })).toHaveClass('is-linked');
    expect(screen.getByText('agrees with:')).toBeInTheDocument();
    expect(screen.getByText('qui', { selector: '.word-popover__link-words' })).toBeInTheDocument();
    expect(screen.getByText(/\(masc nom sg\)/)).toBeInTheDocument();
  });

  it('highlights subject–verb partners on keyboard focus; Escape dismisses', () => {
    renderReader();
    const venit = screen.getByText('venit');
    act(() => {
      venit.focus();
    });

    expect(venit).toHaveClass('is-active');
    expect(screen.getByText('litora', { selector: '.token' })).toHaveClass('is-linked');
    expect(screen.getByText('laviniaque', { selector: '.token' })).not.toHaveClass('is-linked');
    expect(screen.getByText('goes with:')).toBeInTheDocument();

    fireEvent.keyDown(venit, { key: 'Escape' });
    expect(screen.queryByText('goes with:')).not.toBeInTheDocument();
    expect(screen.getByText('litora', { selector: '.token' })).not.toHaveClass('is-linked');
  });
});

describe('popover content per assistance level', () => {
  it('level 1: part of speech only — unresolved parses all shown, no lemma or morphology', () => {
    renderReader(1);
    fireEvent.mouseEnter(screen.getByText('troiae'));

    // both parses of the unresolved ambiguous form
    expect(screen.getAllByText('name')).toHaveLength(2);
    expect(screen.getByText('2 analyses')).toBeInTheDocument();
    // nothing beyond the POS
    expect(screen.queryByText('Troia')).not.toBeInTheDocument();
    expect(screen.queryByText('fem gen/dat sg')).not.toBeInTheDocument();
    expect(screen.queryByText('lemma')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal English gloss' })).not.toBeInTheDocument();
  });

  it('level 1: a disambiguated word features one parse with the others collapsed', () => {
    renderReader(1);
    fireEvent.mouseEnter(screen.getByText('cano'));

    expect(screen.getByText('verb')).toBeInTheDocument();
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Other possible parses \(1\)/ })).toBeInTheDocument();
  });

  it('level 2: adds full morphology and the lemma, but no stem yet', () => {
    renderReader(2);
    fireEvent.mouseEnter(screen.getByText('troiae'));

    expect(screen.getByText('fem gen/dat sg')).toBeInTheDocument();
    expect(screen.getByText('fem nom/voc pl')).toBeInTheDocument();
    expect(screen.getAllByText('Troia')).toHaveLength(2);
    expect(screen.queryByText(/a_ae/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal English gloss' })).not.toBeInTheDocument();
  });

  it('level 3: adds the dictionary pattern (raw stem + friendly label) to the featured parse', () => {
    renderReader(3);
    fireEvent.mouseEnter(screen.getByText('cano'));

    expect(screen.getByText(/1st conjugation — conj1,are_vb/)).toBeInTheDocument();
    // the adjective parse's stem is behind the expander
    fireEvent.click(screen.getByRole('button', { name: /Other possible parses/ }));
    expect(screen.getByText(/us_a_um/)).toBeInTheDocument();
  });

  it('level 4: reveals the gloss only on explicit click', async () => {
    renderReader(4);
    fireEvent.mouseEnter(screen.getByText('Arma'));

    const button = screen.getByRole('button', { name: 'Reveal English gloss' });
    expect(screen.queryByText(/gloss unavailable/)).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByText(/gloss unavailable/)).toBeInTheDocument();
  });

  it('shows the enclitic split for split tokens', () => {
    renderReader(2);
    fireEvent.mouseEnter(screen.getByText('virumque'));
    expect(screen.getByText('virum + -que')).toBeInTheDocument();
  });

  it('says "no analysis available" for unparseable words', () => {
    renderReader(2);
    fireEvent.mouseEnter(screen.getByText('profugus'));
    expect(screen.getByText('no analysis available')).toBeInTheDocument();
  });
});
