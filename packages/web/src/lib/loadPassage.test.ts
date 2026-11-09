import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPassage, loadPassage, mockPassage } from './loadPassage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPassage (mock-fixture fallback)', () => {
  it('returns the corpus passage when the fetch succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockPassage }),
    );
    const result = await loadPassage();
    expect(result.demo).toBe(false);
    expect(result.passage).toBe(mockPassage);
  });

  it('falls back to the bundled demo passage on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await loadPassage();
    expect(result.demo).toBe(true);
    expect(result.passage).toBe(mockPassage);
  });

  it('falls back when the fetch rejects (offline / relative URL without base)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to parse URL')));
    const result = await loadPassage();
    expect(result.demo).toBe(true);
  });

  it('falls back when the payload is not a passage (e.g. an HTML error page)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => '<!doctype html>…' }),
    );
    const result = await loadPassage();
    expect(result.demo).toBe(true);
  });

  it('falls back without parsing when the dev server serves index.html for the missing file', async () => {
    const json = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        json,
      }),
    );
    const result = await loadPassage();
    expect(result.demo).toBe(true);
    expect(json).not.toHaveBeenCalled();
  });

  it('falls back when the payload is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => Promise.reject(new SyntaxError('Unexpected token <')) }),
    );
    const result = await loadPassage();
    expect(result.demo).toBe(true);
  });
});

describe('isPassage', () => {
  it('accepts a contract-shaped object', () => {
    expect(isPassage(mockPassage)).toBe(true);
  });

  it('rejects junk', () => {
    expect(isPassage(null)).toBe(false);
    expect(isPassage('aeneid')).toBe(false);
    expect(isPassage({ work: 'Aeneis' })).toBe(false);
    expect(isPassage({ work: 'Aeneis', book: 1, sentences: 'many', analyses: {} })).toBe(false);
  });
});
