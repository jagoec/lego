import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { mockPassage } from './lib/loadPassage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('falls back to the bundled demo passage when the corpus is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<App />);

    expect(await screen.findByText('Aeneid, Book 1')).toBeInTheDocument();
    expect(screen.getByText('demo passage (corpus not yet imported)')).toBeInTheDocument();
    expect(screen.getByText('Arma')).toBeInTheDocument();
  });

  it('hides the demo note when the corpus loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockPassage }),
    );
    render(<App />);

    expect(await screen.findByText('Arma')).toBeInTheDocument();
    expect(screen.queryByText('demo passage (corpus not yet imported)')).not.toBeInTheDocument();
  });

  it('toggles between the verse view and the reading-order view', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);

    expect(await screen.findByText('Arma')).toBeInTheDocument();
    expect(screen.queryByText('Sentence 1 · line 1')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reading order' }));
    expect(screen.getByText('Sentence 1 · line 1')).toBeInTheDocument();
    expect(screen.getByText('subject')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reading order' }));
    expect(screen.queryByText('Sentence 1 · line 1')).not.toBeInTheDocument();
  });
});

describe('paradigm panel (App wiring)', () => {
  it('stays closed until the first word with a table is hovered, then auto-opens', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    expect(await screen.findByText('Arma')).toBeInTheDocument();

    // no word hovered → no panel yet
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();

    fireEvent.mouseEnter(screen.getByText('Arma'));
    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('2nd declension (neuter) · dōna')).toBeInTheDocument();
    expect(panel.querySelectorAll('.paradigm-table__cell.is-here')).toHaveLength(3);
    // auto-open is persisted
    expect(window.localStorage.getItem('lego:paradigmPanel')).toBe('{"enabled":true,"open":true}');
  });

  it('syncs the panel to whatever word is hovered', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    fireEvent.mouseEnter(await screen.findByText('Arma'));

    fireEvent.mouseEnter(screen.getByText('cano'));
    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText('3rd conjugation · rapere')).toBeInTheDocument();
    expect(panel.querySelector('.paradigm-verb__cell.is-here')!.textContent).toContain('rapiō');

    // unmapped stem → the quiet no-paradigm state
    fireEvent.mouseEnter(screen.getByText('ab'));
    expect(within(panel).getByText(/no paradigm for/i)).toBeInTheDocument();
  });

  it('closing the panel keeps it closed on later hovers (auto-open happens once)', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    fireEvent.mouseEnter(await screen.findByText('Arma'));

    fireEvent.click(screen.getByRole('button', { name: 'Close paradigm panel' }));
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();
    expect(window.localStorage.getItem('lego:paradigmPanel')).toBe('{"enabled":true,"open":false}');

    fireEvent.mouseEnter(screen.getByText('qui'));
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();
  });

  it('Escape closes the panel without disturbing the words', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    fireEvent.mouseEnter(await screen.findByText('Arma'));
    expect(screen.getByRole('complementary', { name: 'Paradigm table' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();
  });

  it('the header Tables toggle disables the feature and is remembered', async () => {
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    const arma = await screen.findByText('Arma');
    fireEvent.mouseEnter(arma);
    expect(screen.getByRole('complementary', { name: 'Paradigm table' })).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Tables' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    // the whole feature is off — no panel even on hover
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();
    fireEvent.mouseEnter(arma);
    expect(screen.queryByRole('complementary', { name: 'Paradigm table' })).toBeNull();
    expect(window.localStorage.getItem('lego:paradigmPanel')).toBe('{"enabled":false,"open":true}');

    // re-enabling restores the remembered open state
    await userEvent.click(toggle);
    expect(screen.getByRole('complementary', { name: 'Paradigm table' })).toBeInTheDocument();
  });

  it('restores a stored open panel on load', async () => {
    window.localStorage.setItem('lego:paradigmPanel', '{"enabled":true,"open":true}');
    render(<App initialPassage={{ passage: mockPassage, demo: false }} />);
    expect(await screen.findByText('Arma')).toBeInTheDocument();

    const panel = screen.getByRole('complementary', { name: 'Paradigm table' });
    expect(within(panel).getByText(/hover a word to see its paradigm/i)).toBeInTheDocument();
  });
});
