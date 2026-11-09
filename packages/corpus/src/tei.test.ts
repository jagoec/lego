import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractBook } from './tei.js';

const FIXTURE = readFileSync(
  fileURLToPath(new URL('./fixtures/aeneid-1-excerpt.tei.xml', import.meta.url)),
  'utf8',
);
const FULL_TEI = readFileSync(
  fileURLToPath(new URL('../../../texts/vergil-aeneid.tei.xml', import.meta.url)),
  'utf8',
);

describe('extractBook — committed excerpt fixture', () => {
  const lines = extractBook(FIXTURE, 1);

  it('returns the excerpt lines in order with exact line numbers', () => {
    expect(lines.map((line) => line.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 24, 36, 37, 38, 48, 65, 66, 198, 250, 251, 252, 426, 753, 754, 755, 756]);
  });

  it('extracts plain lines', () => {
    expect(lines[0]).toEqual({ n: 1, text: 'Arma virumque cano, Troiae qui primus ab oris' });
    expect(lines[1]).toEqual({ n: 2, text: 'Italiam, fato profugus, Laviniaque venit' });
  });

  it('keeps the space between text and inline <q> (trimValues trap)', () => {
    // l. 37: `haec secum: <q>Mene incepto desistere victam,</q>`
    expect(lines.find((line) => line.n === 37)?.text).toBe('haec secum: Mene incepto desistere victam,');
  });

  it('flattens mixed quote/text content in document order', () => {
    // l. 754: `<q rend="merge">insidias</q>, inquit, <q>Danaum, casusque tuorum,</q>`
    expect(lines.find((line) => line.n === 754)?.text).toBe('insidias, inquit, Danaum, casusque tuorum,');
  });

  it('keeps punctuation placed after a closing quote', () => {
    // l. 66: `<q rend="merge">…vento</q>,`
    expect(lines.find((line) => line.n === 66)?.text).toBe('et mulcere dedit fluctus et tollere vento,');
  });

  it('keeps parenthesized interjections', () => {
    expect(lines.find((line) => line.n === 251)?.text).toBe('navibus (infandum!) amissis, unius ob iram');
  });

  it('keeps <del> (transposition-marked) line text', () => {
    expect(lines.find((line) => line.n === 426)?.text).toBe('Iura magistratusque legunt sanctumque senatum;');
  });

  it('collapses the double space of l. 48', () => {
    expect(lines.find((line) => line.n === 48)?.text).toBe('bella gero! Et quisquam numen Iunonis adoret');
  });

  it('ignores milestone markers', () => {
    expect(lines.some((line) => line.text.includes('card'))).toBe(false);
  });
});

describe('extractBook — full committed file', () => {
  const lines = extractBook(FULL_TEI, 1);

  it('has all 756 lines of book 1, contiguous from 1 to 756', () => {
    expect(lines).toHaveLength(756);
    expect(lines[0]?.n).toBe(1);
    expect(lines[755]?.n).toBe(756);
    expect(lines.every((line, i) => line.n === i + 1)).toBe(true);
  });

  it('starts and ends with the canonical verses', () => {
    expect(lines[0]?.text).toBe('Arma virumque cano, Troiae qui primus ab oris');
    expect(lines[755]?.text).toBe('omnibus errantem terris et fluctibus aestas.');
  });

  it('does not leak other books (book 2 starts with Conticuere)', () => {
    expect(lines.some((line) => line.text.startsWith('Conticuere'))).toBe(false);
  });

  it('throws for a book that is not in the file', () => {
    expect(() => extractBook(FULL_TEI, 13)).toThrow(/no book div/);
  });
});
