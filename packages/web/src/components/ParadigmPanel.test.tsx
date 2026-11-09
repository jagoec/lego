import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { MorpheusAnalysis } from '@lego/shared';
import { ParadigmPanel } from './ParadigmPanel';
import { Reader } from './Reader';
import { useParadigmPanel } from '../hooks/useParadigmPanel';
import { mockPassage } from '../lib/loadPassage';
import { paradigmForActive, highlightsFor, TABLES } from '../paradigms';
import type { ParadigmState } from '../paradigms';
import type { TokenKey } from '../lib/model';

const here = dirname(fileURLToPath(import.meta.url));

describe('ParadigmPanel rendering', () => {
  it('shows nothing when closed', () => {
    const { container } = render(
      <ParadigmPanel state={{ kind: 'idle' }} open={false} onClose={() => {}} />,
    );
    expect(container.querySelector('.paradigm-panel')).toBeNull();
  });

  it('idle state invites hovering; none state explains why there is no table', () => {
    const idle = render(<ParadigmPanel state={{ kind: 'idle' }} open onClose={() => {}} />);
    expect(idle.getByText(/hover a word to see its paradigm/i)).toBeInTheDocument();
    idle.unmount();

    const none = render(
      <ParadigmPanel
        state={{ kind: 'none', word: 'ab', reason: 'prepositions are invariable' }}
        open
        onClose={() => {}}
      />,
    );
    expect(none.getByText(/no paradigm for/i)).toBeInTheDocument();
    expect(none.getByText('ab', { selector: '.paradigm-panel__empty-word' })).toBeInTheDocument();
    expect(none.getByText(/prepositions are invariable/)).toBeInTheDocument();
  });

  it('renders a nominal table with the word’s cells highlighted', () => {
    const analysis: MorpheusAnalysis = {
      pos: 'noun', lemma: 'arma', features: [],
      cases: ['nom', 'voc', 'acc'], numbers: ['pl'], genders: ['neut'], stem: 'um_i',
    };
    const table = TABLES['noun2n'];
    const state: ParadigmState = {
      kind: 'table', word: 'Arma', table, highlights: highlightsFor(analysis, table),
    };
    render(<ParadigmPanel state={state} open onClose={() => {}} />);

    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('2nd declension (neuter) · dōna')).toBeInTheDocument();
    expect(within(panel).getByText('Arma')).toBeInTheDocument();

    // nom/voc/acc plural — the slash group lights all three cells
    const highlighted = panel.querySelectorAll('.paradigm-table__cell.is-here');
    expect(highlighted).toHaveLength(3);
    expect([...highlighted].map((el) => el.textContent)).toEqual(['dōna', 'dōna', 'dōna']);
    for (const cell of highlighted) expect(cell).toHaveAttribute('aria-current', 'true');
  });

  it('renders a verbal table with the finite cell highlighted', () => {
    const analysis: MorpheusAnalysis = {
      pos: 'verb', lemma: 'cano', features: [],
      tense: 'pres', mood: 'ind', voice: 'active', persons: ['1st'], numbers: ['sg'], stem: 'conj3',
    };
    const table = TABLES['verb3'];
    const state: ParadigmState = {
      kind: 'table', word: 'cano', table, highlights: highlightsFor(analysis, table),
    };
    render(<ParadigmPanel state={state} open onClose={() => {}} />);

    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('3rd conjugation · rapere')).toBeInTheDocument();
    expect(within(panel).getAllByText('Indicative · active')).toHaveLength(1);

    const highlighted = panel.querySelectorAll('.paradigm-verb__cell.is-here');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]!.textContent).toContain('rapiō');
    expect(highlighted[0]!.textContent).toContain('1sg');
  });

  it('closes via the close button and via Escape', () => {
    const onClose = vi.fn();
    const first = render(<ParadigmPanel state={{ kind: 'idle' }} open onClose={onClose} />);
    fireEvent.click(first.getByRole('button', { name: 'Close paradigm panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = render(<ParadigmPanel state={{ kind: 'idle' }} open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(2); // only Escape closes
    second.unmount();
  });
});

describe('panel wiring (hover sync, focus)', () => {
  /** Reader + panel wired to the same active-token state App uses. */
  function renderSynced() {
    function Harness() {
      const [active, setActive] = useState<TokenKey | null>(null);
      const state = paradigmForActive(mockPassage, active);
      return (
        <div>
          <Reader
            passage={mockPassage}
            level={2}
            active={active}
            onActiveChange={setActive}
          />
          <ParadigmPanel state={state} open onClose={() => setActive(null)} />
        </div>
      );
    }
    return render(<Harness />);
  }

  it('syncs to the hovered word without moving DOM focus', () => {
    renderSynced();

    fireEvent.mouseEnter(screen.getByText('Arma'));
    let panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('2nd declension (neuter) · dōna')).toBeInTheDocument();
    expect(panel.querySelectorAll('.paradigm-table__cell.is-here')).toHaveLength(3);
    // hover-sync must not move DOM focus onto the panel
    expect(document.activeElement).toBe(document.body);

    fireEvent.mouseEnter(screen.getByText('qui'));
    panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('relative pronoun · quī, quae, quod')).toBeInTheDocument();
    expect(panel.querySelectorAll('.paradigm-table__cell.is-here')).toHaveLength(1);
    expect(panel.querySelector('.paradigm-table__cell.is-here')!.textContent).toBe('quī');
    expect(document.activeElement).toBe(document.body);
  });

  it('shows the quiet no-paradigm message for unmapped words (preposition, unknown)', () => {
    renderSynced();

    fireEvent.mouseEnter(screen.getByText('ab'));
    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText(/no paradigm for/i)).toBeInTheDocument();
    expect(within(panel).getByText('ab', { selector: '.paradigm-panel__empty-word' })).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByText('profugus'));
    expect(within(panel).getByText(/no analysis available/)).toBeInTheDocument();
  });
});

describe('useParadigmPanel (localStorage persistence)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to enabled + closed and persists changes', () => {
    const { result } = renderHook(() => useParadigmPanel());
    expect(result.current.enabled).toBe(true);
    expect(result.current.open).toBe(false);

    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    expect(window.localStorage.getItem('lego:paradigmPanel')).toBe('{"enabled":true,"open":true}');

    act(() => result.current.setEnabled(false));
    expect(result.current.enabled).toBe(false);
    expect(window.localStorage.getItem('lego:paradigmPanel')).toBe('{"enabled":false,"open":true}');
  });

  it('restores stored preferences and ignores junk', () => {
    window.localStorage.setItem('lego:paradigmPanel', '{"enabled":false,"open":true}');
    const stored = renderHook(() => useParadigmPanel());
    expect(stored.result.current.enabled).toBe(false);
    expect(stored.result.current.open).toBe(true);

    window.localStorage.setItem('lego:paradigmPanel', 'nonsense');
    const junk = renderHook(() => useParadigmPanel());
    expect(junk.result.current.enabled).toBe(true);
    expect(junk.result.current.open).toBe(false);
  });
});

describe('panel layout (styles.css contract)', () => {
  const css = readFileSync(join(here, '../styles.css'), 'utf8');

  it('the panel is fixed-position on the right, below the popover in z-order', () => {
    const panelBlock = css.match(/\.paradigm-panel\s*\{[^}]*\}/)?.[0] ?? '';
    expect(panelBlock).toMatch(/position:\s*fixed/);
    expect(panelBlock).toMatch(/right:\s*0/);

    const panelZ = Number(panelBlock.match(/z-index:\s*(\d+)/)?.[1]);
    const popoverZ = Number(css.match(/\.word-popover\s*\{[^}]*z-index:\s*(\d+)/)?.[1]);
    expect(panelZ).toBeGreaterThan(0);
    expect(popoverZ).toBeGreaterThan(panelZ); // the popover overlays the panel, not vice versa
  });

  it('wide screens push the text column; narrow screens keep the panel an overlay', () => {
    expect(css).toMatch(/\.app--panel\s*\{[^}]*margin-right/);
    expect(css).toMatch(/@media \(min-width:\s*1000px\)/);
    expect(css.match(/\.paradigm-panel\s*\{[^}]*width:\s*min\(24rem,\s*92vw\)/)).not.toBeNull();
  });
});
