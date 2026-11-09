import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Passage } from '@lego/shared';
import { buildPassage } from './pipeline.js';
import type { BuildResult } from './pipeline.js';
import { extractBook } from './tei.js';
import { validatePassage } from './validate.js';

/**
 * Real morpheus responses (captured once from the running container) for
 * every form the pipeline needs when importing the test lines — tests
 * run fully offline.
 */
const RESPONSES: Record<string, string> = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixtures/morpheus-responses.json', import.meta.url)), 'utf8'),
) as Record<string, string>;

const fixtureFetch = async (form: string): Promise<string> => {
  const body = RESPONSES[form];
  if (body === undefined) throw new Error(`test fixture has no response for "${form}"`);
  return body;
};

const excerpt = extractBook(
  readFileSync(fileURLToPath(new URL('./fixtures/aeneid-1-excerpt.tei.xml', import.meta.url)), 'utf8'),
  1,
);

const wantedLines = new Set([1, 2, 3, 4, 5, 6, 7, 251, 252]);
const lines = excerpt.filter((line) => wantedLines.has(line.n));

describe('buildPassage — offline end-to-end over real fixture lines', () => {
  // Lines 1–7 are one complete sentence ("Arma … Romae."); lines 251–252
  // are one complete sentence with the parenthetical interjection
  // "(infandum!)" that must not break it open.
  let result: BuildResult;
  let passage: Passage;

  beforeAll(async () => {
    result = await buildPassage({
      lines,
      source: { name: 'test', url: 'test', license: 'test' },
      fetchRaw: fixtureFetch,
      cache: {},
    });
    passage = result.passage;
  });

  it('produces a passage that validates against the contract', () => {
    expect(validatePassage(passage, { maxLine: 756, allowedExtraAnalyses: ['que', 've', 'ne'] })).toEqual([]);
  });

  it('segments three sentences with correct line ranges', () => {
    // l.1–4 end at the semicolon of "ob iram;", l.5–7 at "Romae.",
    // l.251–252 at "oris." — the "(infandum!)" terminator is ignored.
    expect(passage.sentences).toHaveLength(3);
    expect(passage.sentences[0]).toMatchObject({ index: 0, lineStart: 1, lineEnd: 4 });
    expect(passage.sentences[1]).toMatchObject({ index: 1, lineStart: 5, lineEnd: 7 });
    expect(passage.sentences[2]).toMatchObject({ index: 2, lineStart: 251, lineEnd: 252 });
  });

  it('tokenizes with surface capitalization and enclitic splits', () => {
    const tokens = passage.sentences[0]?.tokens ?? [];
    expect(tokens[0]).toEqual({ index: 0, text: 'Arma', form: 'Arma', line: 1 });
    expect(tokens[1]).toEqual({ index: 1, text: 'virumque', form: 'virum', line: 1, enclitics: ['que'] });
    expect(tokens[2]).toEqual({ index: 2, text: 'cano', form: 'cano', line: 1, punctuation: ',' });
    expect(tokens[11]).toEqual({ index: 11, text: 'Laviniaque', form: 'Lavinia', line: 2, enclitics: ['que'] });
    const s1 = passage.sentences[1]?.tokens ?? [];
    expect(s1[8]).toEqual({ index: 8, text: 'inferretque', form: 'inferret', line: 6, enclitics: ['que'] });
    // atque splits to at + que (its stem "at" is a known conjunction)
    expect(s1[16]).toEqual({ index: 16, text: 'atque', form: 'at', line: 7, enclitics: ['que'] });
    // quoque is stoplisted (lexicalized adverb): analyzed whole
    expect(s1[1]).toEqual({ index: 1, text: 'quoque', form: 'quoque', line: 5 });
    // the solver may stamp selected/selectedBy on ambiguous tokens
    // (navibus ↔ amissis abl pl fem): parse 0 is the abl pl reading
    const l251 = passage.sentences[2]?.tokens ?? [];
    expect(l251[0]).toMatchObject({ text: 'navibus', selected: 0, selectedBy: 'solver' });
  });

  it('attaches the parenthetical punctuation without breaking the sentence', () => {
    const l251 = passage.sentences[2]?.tokens ?? [];
    expect(l251[0]).toMatchObject({ index: 0, text: 'navibus', form: 'navibus', line: 251, punctuation: '(' });
    expect(l251[1]).toMatchObject({ index: 1, text: 'infandum', form: 'infandum', line: 251, punctuation: '!)' });
    expect(l251).toHaveLength(12); // six words per line, one token each
  });

  it('keys the analyses map by the exact queried form, plus bare enclitics', () => {
    for (const key of ['Arma', 'Lavinia', 'inferret', 'at', 'quoque']) {
      expect(key in passage.analyses).toBe(true);
    }
    expect(passage.analyses['que']).toEqual([]); // morpheus has no entry for bare que
    expect(passage.analyses['ne']?.length).toBeGreaterThan(0);
    for (const key of ['que', 've', 'ne']) expect(key in passage.analyses).toBe(true);
  });

  it('detects the expected agreement and subject-verb groups', () => {
    const pairs = (passage.sentences[0]?.groups ?? []).map((group) =>
      [group.kind, group.tokenIndices.join('-'), group.matched],
    );
    // sentence 1 (l.1–4): primus ↔ qui, profugus ↔ qui (distance 6,
    // within the cap), iactatus ↔ ille, memorem ↔ iram (forward match),
    // Lavinia → venit
    expect(pairs).toContainEqual(['agreement', '4-5', 'nom sg masc']);
    expect(pairs).toContainEqual(['agreement', '4-10', 'nom sg masc']);
    expect(pairs).toContainEqual(['agreement', '15-18', 'nom sg masc']);
    expect(pairs).toContainEqual(['agreement', '24-27', 'acc sg fem']);
    expect(pairs).toContainEqual(['subject-verb', '11-12', '3rd sg']);
    // cross-clause noise is suppressed by the distance cap: no
    // cano↔fato (7), fato↔alto (11), virum↔multum (13), Italiam↔memorem
    for (const bad of ['2-9', '9-20', '1-14', '8-24']) {
      expect(pairs.some((pair) => pair[1] === bad)).toBe(false);
    }
    // vi ↔ saevae (dat sg fem, distance 2) survives — genuine parse
    // ambiguity, documented as overridable heuristic noise
    expect(pairs).toContainEqual(['agreement', '21-23', 'dat sg fem']);

    // sentence 2 (l.5–7): altae ↔ Romae; participial passus anchors the
    // subjunctives conderet / inferret as subject (nearest preceding
    // nominative); no subject group crosses from sentence 1
    const pairs1 = (passage.sentences[1]?.groups ?? []).map((group) =>
      [group.kind, group.tokenIndices.join('-'), group.matched],
    );
    expect(pairs1).toContainEqual(['agreement', '17-19', 'nom/voc pl fem']);
    expect(pairs1).toContainEqual(['subject-verb', '4-6', '3rd sg']);
    expect(pairs1).toContainEqual(['subject-verb', '4-8', '3rd sg']);
    expect(pairs1.some((pair) => pair[1] === '0-10')).toBe(false); // multa ↔ Latio too far

    // sentence 3 (l.251–252): navibus ↔ amissis (abl pl fem)
    const pairs2 = (passage.sentences[2]?.groups ?? []).map((group) =>
      [group.kind, group.tokenIndices.join('-'), group.matched],
    );
    expect(pairs2).toContainEqual(['agreement', '0-2', 'abl pl fem']);
    expect(pairs2.some((pair) => pair[1] === '3-11')).toBe(false); // unius ↔ oris too far
  });

  it('splits the reading order at clause boundaries and stamps clauseId/role', () => {
    // sentence 1 (l.1–4): the relative clause "qui primus ab oris
    // Italiam fato profugus Laviniaque venit" (tokens 4–12) interrupts
    // the main clause; chunks are split there and renumbered
    const order = passage.sentences[0]?.order ?? [];
    expect(order.slice(0, 6).map((chunk) => [chunk.label, chunk.role, chunk.tokenIndices[0], chunk.clauseId])).toEqual([
      [undefined, 'predicate', 0, 0], // Arma virum
      ['verb', 'verb', 2, 0], // cano
      [undefined, 'predicate', 3, 0], // Troiae — split off the relative clause, 'subject' label not re-earned
      ['subject', undefined, 4, 1], // qui primus — subordinate: label kept, role unset
      ['phrase', undefined, 6, 1], // ab oris … (inside the relative clause)
      ['verb', undefined, 12, 1], // venit — the relative clause's verb
    ]);
    expect(passage.sentences[0]?.clauses).toEqual([
      { id: 0, kind: 'main', tokenIndices: [0, 1, 2, 3, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27] },
      { id: 1, kind: 'relative', tokenIndices: [4, 5, 6, 7, 8, 9, 10, 11, 12] },
    ]);
    // every token covered exactly once is already asserted by validation
  });

  it('detects the dum-clause with the -que coordinated verb and the ablative absolute', () => {
    // sentence 2 (l.5–7): "dum conderet urbem inferretque deos" is one
    // adverbial clause — inferret-que extends it past conderet
    expect(passage.sentences[1]?.clauses).toEqual([
      {
        id: 0,
        kind: 'main',
        tokenIndices: [0, 1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      },
      { id: 1, kind: 'adverbial', tokenIndices: [5, 6, 7, 8] },
    ]);

    // sentence 3 (l.251–252): "navibus infandum amissis" is an ablative
    // absolute (participial clause), the rest is main
    expect(passage.sentences[2]?.clauses).toEqual([
      { id: 0, kind: 'main', tokenIndices: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
      { id: 1, kind: 'participial', tokenIndices: [0, 1, 2] },
    ]);
  });

  it('disambiguates what the evidence supports and leaves the rest open', () => {
    const s0 = passage.sentences[0]?.tokens ?? [];
    // cano (verb 1st sg + noun parses) is a noun-like collision: no
    // solver elimination, no selection without translation evidence
    expect(s0[2]).toMatchObject({ text: 'cano' });
    expect(s0[2]?.selected).toBeUndefined();
    // memorem ↔ iram (acc sg fem): the acc reading is selected
    expect(s0[24]).toMatchObject({ text: 'memorem', selected: 0, selectedBy: 'solver' });
    // navibus ↔ amissis (abl pl fem): abl pl selected on both sides
    const l251 = passage.sentences[2]?.tokens ?? [];
    expect(l251[0]).toMatchObject({ text: 'navibus', selected: 0, selectedBy: 'solver' });
    expect(l251[2]).toMatchObject({ text: 'amissis', selected: 1, selectedBy: 'solver' });
    // stats agree
    expect(result.stats).toMatchObject({
      ambiguousTokens: 34,
      selectedBySolver: 5,
      selectedByTranslation: 0,
      subordinateClauses: 3,
      sentencesWithSubordinateClauses: 3,
    });
  });

  it('uses the aligned translation as a tiebreaker (cano → 1st sg via "I sing")', async () => {
    const { passage: withTranslation } = await buildPassage({
      lines,
      source: { name: 'test', url: 'test', license: 'test' },
      fetchRaw: fixtureFetch,
      cache: { ...RESPONSES },
      translations: [
        'Arms and the man I sing, who first made way, predestined exile, from the Trojan shore to Italy, the blest Lavinian strand.',
        null,
        null,
      ],
    });
    const cano = withTranslation.sentences[0]?.tokens[2];
    expect(cano).toMatchObject({ text: 'cano', selected: 0, selectedBy: 'translation' });
    // solver selections are not overturned: memorem stays the solver's
    expect(withTranslation.sentences[0]?.tokens[24]).toMatchObject({ selectedBy: 'solver' });
  });

  it('reports stats and fills the raw cache for every queried form', () => {
    expect(result.stats).toMatchObject({
      sentences: 3,
      tokens: 60, // 28 (l.1–4) + 20 (l.5–7) + 12 (l.251–252)
      encliticSplits: 6, // virumque, Laviniaque, inferretque, Albanique, atque ×2
    });
    expect(result.stats.distinctForms).toBe(Object.keys(passage.analyses).length);
    // every queried form (whole words, candidate stems, bare enclitics) is cached
    for (const form of [...Object.keys(passage.analyses), 'virumque', 'Laviniaque', 'inferretque', 'atque']) {
      expect(form in result.cache).toBe(true);
    }
  });
});

describe('buildPassage — morpheus case fallback', () => {
  it('falls back to lowercase when a capitalized common word fails (Vix → vix)', async () => {
    const { passage } = await buildPassage({
      lines: [{ n: 431, text: 'Vix' }],
      source: { name: 't', url: 't', license: 't' },
      fetchRaw: fixtureFetch,
      cache: {},
    });
    const token = passage.sentences[0]?.tokens[0];
    expect(token).toMatchObject({ text: 'Vix', form: 'vix' });
    expect(passage.analyses['vix']?.[0]?.pos).toBe('adverb');
  });

  it('falls back to capitalized when a lowercase proper name fails (syrtis → Syrtis)', async () => {
    const { passage } = await buildPassage({
      lines: [{ n: 551, text: 'Vix et syrtis,' }],
      source: { name: 't', url: 't', license: 't' },
      fetchRaw: fixtureFetch,
      cache: {},
    });
    const token = passage.sentences[0]?.tokens[2];
    expect(token).toMatchObject({ text: 'syrtis', form: 'Syrtis' });
    expect(passage.analyses['Syrtis']?.[0]?.pos).toBe('name');
  });

  it('keeps the surface form with empty analyses when no variant works', async () => {
    const { passage } = await buildPassage({
      lines: [{ n: 745, text: 'Quocirca' }],
      source: { name: 't', url: 't', license: 't' },
      fetchRaw: async () => '', // nothing is known, under any capitalization
      cache: {},
    });
    expect(passage.sentences[0]?.tokens[0]?.form).toBe('Quocirca');
    expect(passage.analyses['Quocirca']).toEqual([]);
  });
});
