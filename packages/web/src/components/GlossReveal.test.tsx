import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GlossReveal } from './GlossReveal';

describe('GlossReveal (level 4)', () => {
  it('shows a reveal button, never the gloss itself', () => {
    render(<GlossReveal />);
    expect(screen.getByRole('button', { name: 'Reveal English gloss' })).toBeInTheDocument();
    expect(screen.queryByText(/gloss unavailable/)).not.toBeInTheDocument();
  });

  it('reveals an honest placeholder on click (gloss data is not in the contract yet)', async () => {
    render(<GlossReveal />);
    await userEvent.click(screen.getByRole('button', { name: 'Reveal English gloss' }));
    expect(screen.getByText(/gloss unavailable — not yet in the corpus/)).toBeInTheDocument();
  });
});
