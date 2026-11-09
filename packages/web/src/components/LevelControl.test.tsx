import { fireEvent, render, screen } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelControl } from './LevelControl';
import { useAssistanceLevel } from '../hooks/useAssistanceLevel';

describe('LevelControl', () => {
  it('renders the four levels with their labels', () => {
    render(<LevelControl level={1} onChange={() => {}} />);
    const labels = ['Parts of speech', 'Morphology', 'Dictionary form', 'Reveal gloss'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: '1 Parts of speech' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '3 Dictionary form' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the chosen level', () => {
    const onChange = vi.fn();
    render(<LevelControl level={2} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3 Dictionary form' }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('useAssistanceLevel (localStorage persistence)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to level 1 and persists changes', () => {
    const { result } = renderHook(() => useAssistanceLevel());
    expect(result.current[0]).toBe(1);

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
    expect(window.localStorage.getItem('lego:assistanceLevel')).toBe('3');
  });

  it('restores a stored level', () => {
    window.localStorage.setItem('lego:assistanceLevel', '2');
    const { result } = renderHook(() => useAssistanceLevel());
    expect(result.current[0]).toBe(2);
  });

  it('ignores junk in storage', () => {
    window.localStorage.setItem('lego:assistanceLevel', 'gibberish');
    const { result } = renderHook(() => useAssistanceLevel());
    expect(result.current[0]).toBe(1);
  });
});
