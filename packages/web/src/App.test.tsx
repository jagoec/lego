import { render, screen } from '@testing-library/react';
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
