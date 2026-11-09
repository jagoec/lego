import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { AssistanceLevel } from '@lego/shared';
import { Reader } from './Reader';
import { mockPassage } from '../lib/loadPassage';
import type { TokenKey } from '../lib/model';

/**
 * The popover behaviors for corpus-disambiguated words are exercised
 * through the real Reader wiring, so open/close (unmount) semantics are
 * part of every test.
 */
function renderReader(level: AssistanceLevel = 2) {
  function Harness() {
    const [active, setActive] = useState<TokenKey | null>(null);
    return (
      <Reader passage={mockPassage} level={level} active={active} onActiveChange={setActive} />
    );
  }
  return render(<Harness />);
}

/** cano has two parses with `selected: 0` (the verb, chosen by the solver). */
function hoverCano() {
  fireEvent.mouseEnter(screen.getByText('cano'));
}

/** troiae has two parses and no selection — unresolved ambiguity. */
function hoverTroiae() {
  fireEvent.mouseEnter(screen.getByText('troiae'));
}

describe('selected-parse popover (token.selected)', () => {
  it('features the chosen parse at the top and collapses the others behind a toggle', () => {
    renderReader(2);
    hoverCano();

    const featured = screen.getByText('verb', { selector: '.analysis--featured .analysis__pos' });
    expect(featured).toBeInTheDocument();
    expect(screen.getByText('1st sg pres ind active')).toBeInTheDocument();
    expect(screen.getByText('cano', { selector: '.analysis__value' })).toBeInTheDocument();

    // the other parse is present but hidden behind the expander
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Other possible parses \(1\)/ }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands and collapses the other parses with the mouse', async () => {
    renderReader(2);
    hoverCano();

    const toggle = screen.getByRole('button', { name: /Other possible parses/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('adjective')).toBeInTheDocument();
    expect(screen.getByText('2/2', { exact: false })).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();
  });

  it('toggles the expander with Enter and Space', async () => {
    renderReader(2);
    hoverCano();

    const toggle = screen.getByRole('button', { name: /Other possible parses/ });
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('adjective')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();
  });

  it('resets the expander when the popover closes and reopens', () => {
    renderReader(2);
    const word = screen.getByText('cano');
    fireEvent.mouseEnter(word);

    fireEvent.click(screen.getByRole('button', { name: /Other possible parses/ }));
    expect(screen.getByText('adjective')).toBeInTheDocument();

    // leave the word — the popover unmounts, taking the expanded state with it
    fireEvent.mouseLeave(word);
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();

    fireEvent.mouseEnter(word);
    expect(
      screen.getByRole('button', { name: /Other possible parses/ }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('adjective')).not.toBeInTheDocument();
  });

  it('filters the featured parse by the assistance level', () => {
    renderReader(1);
    hoverCano();

    // level 1: part of speech only — but the collapsed count is still visible
    expect(screen.getByText('verb')).toBeInTheDocument();
    expect(screen.queryByText('1st sg pres ind active')).not.toBeInTheDocument();
    expect(screen.queryByText('cano', { selector: '.analysis__value' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Other possible parses \(1\)/ })).toBeInTheDocument();
  });

  it('applies level 3 stem detail to the featured parse', () => {
    renderReader(3);
    hoverCano();

    expect(screen.getByText(/3rd conjugation — conj3/)).toBeInTheDocument();
    // the other parse's stem only appears after expanding
    expect(screen.queryByText(/us_a_um/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Other possible parses/ }));
    expect(screen.getByText(/us_a_um/)).toBeInTheDocument();
  });
});

describe('unresolved ambiguity (no token.selected)', () => {
  it('keeps the show-all behavior with ordinals and no expander', () => {
    renderReader(2);
    hoverTroiae();

    expect(screen.getByText('1/2', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('2/2', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('fem gen/dat sg')).toBeInTheDocument();
    expect(screen.getByText('fem nom/voc pl')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Other possible parses/ })).not.toBeInTheDocument();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('styles a selected word as normal and an unresolved one as ambiguous', () => {
    const { container } = renderReader();
    const cano = screen.getByText('cano');
    const troiae = screen.getByText('troiae');

    expect(cano).not.toHaveClass('token--ambiguous');
    expect(cano).not.toHaveClass('token--unknown');
    expect(troiae).toHaveClass('token--ambiguous');
    // a word with a chosen parse is a normal word in the DOM structure too
    expect(container.querySelectorAll('.token--ambiguous')).toHaveLength(1);
  });
});
