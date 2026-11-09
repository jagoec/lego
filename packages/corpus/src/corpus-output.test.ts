import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Passage } from '@lego/shared';
import { validatePassage } from './validate.js';

const CORPUS_PATH = fileURLToPath(new URL('../../web/public/corpus/aeneid-1.json', import.meta.url));

/**
 * The generated corpus JSON (written by `pnpm import`, committed to the
 * repo). Skipped when the file has not been generated yet — the read
 * happens in beforeAll so a missing file never breaks collection.
 */
describe.skipIf(!existsSync(CORPUS_PATH))('generated corpus: aeneid-1.json', () => {
  let passage: Passage;

  beforeAll(() => {
    passage = JSON.parse(readFileSync(CORPUS_PATH, 'utf8')) as Passage;
  });

  it('validates against the contract and pipeline invariants', () => {
    expect(validatePassage(passage, { maxLine: 756, allowedExtraAnalyses: ['que', 've', 'ne'] })).toEqual([]);
  });

  it('covers all 756 verse lines of Aeneid book 1', () => {
    const lines = new Set<number>();
    for (const sentence of passage.sentences) {
      for (const token of sentence.tokens) lines.add(token.line);
    }
    expect(lines.size).toBe(756);
    expect(Math.min(...lines)).toBe(1);
    expect(Math.max(...lines)).toBe(756);
  });

  it('begins with the canonical opening and records the source', () => {
    const first = passage.sentences[0]?.tokens[0];
    expect(first).toMatchObject({ text: 'Arma', form: 'Arma', line: 1 });
    expect(passage).toMatchObject({ work: 'Vergil', title: 'Aeneid', book: 1 });
    expect(passage.source.license).toMatch(/CC BY-SA/);
  });

  it('is a sensible size (< 5 MB)', () => {
    const bytes = readFileSync(CORPUS_PATH).length;
    expect(bytes).toBeGreaterThan(100_000);
    expect(bytes).toBeLessThan(5 * 1024 * 1024);
  });
});
