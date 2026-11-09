import { describe, expect, it } from 'vitest';
import type { MorpheusAnalysis, Token } from '@lego/shared';
import {
  alignBookSentences,
  extractEnglishBook,
  mapLatinToEnglishLine,
  segmentEnglish,
} from './alignment.js';
import type { SentenceSolution } from './solver.js';
import { applyTranslationEvidence, extractSignals } from './translation.js';
import type { AnalysisMap } from '../groups.js';

// ---------------------------------------------------------------------------
// A miniature translation TEI shaped like the Williams file:
// book → card (n = LATIN line) → l (n = the translation's own lines).
// ---------------------------------------------------------------------------

const miniTei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader><fileDesc><titleStmt><title>t</title></titleStmt></fileDesc></teiHeader>
  <text xml:lang="eng">
    <body>
      <div type="translation" xml:lang="eng">
        <div type="textpart" subtype="book" n="1">
          <div type="textpart" subtype="card" resp="p" n="1">
            <l n="1">Arms and the man I sing, who first made way,</l>
            <l n="2">predestined exile, from the Trojan shore</l>
            <l n="3">to <placeName key="tgn,1000080">Italy</placeName>, the blest Lavinian strand.</l>
            <l n="4">Smitten of storms he was on land and sea</l>
          </div>
          <div type="textpart" subtype="card" resp="p" n="5">
            <l n="5">by violence of heaven, and cruel Juno's rage;</l>
            <l n="6">on land and sea he suffered much.</l>
            <milestone ed="p" n="9" unit="card"/>
          </div>
        </div>
        <div type="textpart" subtype="book" n="2">
          <div type="textpart" subtype="card" resp="p" n="1">
            <l n="1">Book two, line one.</l>
          </div>
        </div>
      </div>
    </body>
  </text>
</TEI>`;

describe('extractEnglishBook', () => {
  it('extracts lines and card anchors keyed to Latin lines', () => {
    const book = extractEnglishBook(miniTei, 1);
    expect(book.lines).toEqual([
      'Arms and the man I sing, who first made way,',
      'predestined exile, from the Trojan shore',
      'to Italy, the blest Lavinian strand.',
      'Smitten of storms he was on land and sea',
      'by violence of heaven, and cruel Juno\'s rage;',
      'on land and sea he suffered much.',
    ]);
    expect(book.cards).toEqual([
      { latinStart: 1, lineIndex: 0 },
      { latinStart: 5, lineIndex: 4 },
    ]);
  });

  it('keeps inline element text and drops milestones', () => {
    const book = extractEnglishBook(miniTei, 1);
    expect(book.lines[2]).toBe('to Italy, the blest Lavinian strand.');
  });

  it('throws for a missing book', () => {
    expect(() => extractEnglishBook(miniTei, 3)).toThrow(/no translation book div/);
  });
});

describe('mapLatinToEnglishLine', () => {
  const book = extractEnglishBook(miniTei, 1);

  it('maps anchor lines exactly and interpolates between anchors', () => {
    expect(mapLatinToEnglishLine(book, 7, 1)).toBe(0); // anchor
    expect(mapLatinToEnglishLine(book, 7, 5)).toBe(4); // anchor
    // between anchors 1→0 and 5→4: Latin 3 lands mid-card
    expect(mapLatinToEnglishLine(book, 7, 3)).toBe(2);
  });

  it('extrapolates past the last card to the terminal anchor', () => {
    // Latin 7 (of 7) maps near the last English line
    expect(mapLatinToEnglishLine(book, 7, 7)).toBeGreaterThanOrEqual(5);
    expect(mapLatinToEnglishLine(book, 7, 7)).toBeLessThanOrEqual(5);
  });
});

describe('segmentEnglish', () => {
  it('splits on . ; ? ! and tracks the starting line of each sentence', () => {
    const sentences = segmentEnglish([
      'Arms and the man I sing,',
      'who first made way.',
      'Smitten he was',
      'on land and sea!',
      'What next?',
    ]);
    expect(sentences).toEqual([
      { startLine: 0, text: 'Arms and the man I sing, who first made way.' },
      { startLine: 2, text: 'Smitten he was on land and sea!' },
      { startLine: 4, text: 'What next?' },
    ]);
  });

  it('keeps a terminator followed by a closing quote as the sentence end', () => {
    const sentences = segmentEnglish(['he said “farewell,” and went.']);
    expect(sentences).toEqual([{ startLine: 0, text: 'he said “farewell,” and went.' }]);
  });

  it('does not split on colons or commas', () => {
    const sentences = segmentEnglish(['thus he spoke: and stayed, waiting,']);
    expect(sentences).toEqual([
      { startLine: 0, text: 'thus he spoke: and stayed, waiting,' },
    ]);
  });
});

describe('alignBookSentences', () => {
  const book = extractEnglishBook(miniTei, 1);

  it('aligns a Latin sentence to the English sentences starting in its window', () => {
    const aligned = alignBookSentences(book, 7, [{ lineStart: 1, lineEnd: 4 }]);
    // window: Latin 1→eng 0, Latin 4→eng 3 → sentences starting at eng lines 0 and 3
    expect(aligned[0]?.text).toBe(
      'Arms and the man I sing, who first made way, predestined exile, from the Trojan shore ' +
        'to Italy, the blest Lavinian strand. Smitten of storms he was on land and sea ' +
        'by violence of heaven, and cruel Juno\'s rage;',
    );
  });

  it('marks sentences mapping into the middle of a long English sentence as null', () => {
    // one short sentence, then one SIX-line English sentence, then a closer
    const sparseBook = {
      lines: [
        'First sentence here.',
        'the long sentence begins here and keeps',
        'going on and on across many lines',
        'without reaching any terminator yet',
        'still going with more words here',
        'and still more words in this line',
        'until at last it ends.',
        'The end.',
      ],
      cards: [{ latinStart: 1, lineIndex: 0 }],
    };
    // Latin 5 of 9 → eng line 4: window [3,5] holds no sentence start
    // (starts are at lines 0 and 7); widened [2,6] still none → null
    const aligned = alignBookSentences(sparseBook, 9, [{ lineStart: 5, lineEnd: 5 }]);
    expect(aligned[0]).toBeNull();
  });

  it('caps exploding windows as unalignable', () => {
    const burstyBook = {
      lines: ['Go. Come. Stay. Away. Back. Home. Now. Then.', 'more text follows here'],
      cards: [{ latinStart: 1, lineIndex: 0 }],
    };
    // Latin 1 → eng 0: window catches 8 tiny sentences, cap for a
    // one-line Latin sentence is 2*1+4 = 6 → misaligned, null
    const aligned = alignBookSentences(burstyBook, 2, [{ lineStart: 1, lineEnd: 1 }]);
    expect(aligned[0]).toBeNull();
  });

  it('aligns every Latin sentence to some English when windows are sane', () => {
    const aligned = alignBookSentences(book, 7, [
      { lineStart: 1, lineEnd: 1 },
      { lineStart: 2, lineEnd: 2 },
      { lineStart: 5, lineEnd: 7 },
    ]);
    expect(aligned[0]?.text).toContain('Arms and the man I sing');
    expect(aligned[1]?.text).toContain('Arms and the man I sing'); // same English sentence covers both
    expect(aligned[2]?.text).toContain('he suffered much');
  });
});

// ---------------------------------------------------------------------------
// Translation signals
// ---------------------------------------------------------------------------

describe('extractSignals', () => {
  it('maps "I sing" to 1st person with decisive weight', () => {
    const signals = extractSignals('Arms and the man I sing, who first made way');
    expect(signals.person['1st']).toBe(2);
  });

  it('accumulates and caps person cues', () => {
    const signals = extractSignals('You and me: I told you of my woes, we and ours');
    expect(signals.person['1st']).toBe(4); // capped (me + I + my + we + ours + us-like)
    expect(signals.person['2nd']).toBe(2); // you ×2
  });

  it('detects passive constructions', () => {
    expect(extractSignals('he was driven by the storm').passive).toBe(2);
    expect(extractSignals('the walls were deeply buried in smoke').passive).toBe(2);
    expect(extractSignals('he drove them himself').passive).toBe(0);
  });

  it('detects participles (having Xed, -ing) with caps', () => {
    const signals = extractSignals('Having suffered much, he went seeking a home, weeping');
    expect(signals.participle).toBe(3); // capped: having(2) + seeking(1) + weeping(1)
  });

  it('detects infinitives and genitive "of" with caps', () => {
    const signals = extractSignals('he began to speak of the fall of Troy to tell of it');
    expect(signals.infinitive).toBe(2); // to speak, to tell
    expect(signals.genitive).toBe(3); // of ×3, under the cap
  });
});

describe('applyTranslationEvidence', () => {
  const token = (form: string, index: number): Token => ({ index, text: form, form, line: 1 });

  function analysis(pos: MorpheusAnalysis['pos'], extra: Partial<MorpheusAnalysis> = {}): MorpheusAnalysis {
    return { pos, lemma: pos, features: [], ...extra };
  }

  const analyses: AnalysisMap = {
    cano: [
      analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] }),
      analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
    ],
    moenia: [
      analysis('noun', { cases: ['gen'], numbers: ['sg'], genders: ['neut'] }),
      analysis('noun', { cases: ['nom', 'acc'], numbers: ['pl'], genders: ['neut'] }),
    ],
  };

  /** solver-style solution: two candidates, nothing eliminated, nothing selected */
  const undecided: SentenceSolution = [
    { eliminated: [], scores: [0, 0] },
    { eliminated: [], scores: [0, 0] },
  ];

  it('selects the 1st-person parse when the English says "I sing"', () => {
    const tokens = [token('cano', 0), token('moenia', 1)];
    const picks = applyTranslationEvidence(tokens, analyses, undecided, {
      person: { '1st': 2 },
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 0,
    });
    expect(picks.get(0)).toBe(0);
  });

  it('selects the genitive parse when the English uses "of" repeatedly', () => {
    const tokens = [token('cano', 0), token('moenia', 1)];
    const picks = applyTranslationEvidence(tokens, analyses, undecided, {
      person: {},
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 3,
    });
    expect(picks.get(1)).toBe(0);
  });

  it('does not decide when the margin is below the threshold', () => {
    const tokens = [token('cano', 0)];
    const picks = applyTranslationEvidence(tokens, analyses, undecided, {
      person: { '1st': 1 },
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 0,
    });
    expect(picks.size).toBe(0);
  });

  it('never overturns a solver selection and respects eliminations', () => {
    const tokens = [token('cano', 0)];
    const solution: SentenceSolution = [
      { eliminated: [0], scores: [0, 0], selected: 1 }, // solver chose the 3rd person parse
    ];
    const picks = applyTranslationEvidence(tokens, analyses, solution, {
      person: { '1st': 4 },
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 0,
    });
    expect(picks.size).toBe(0);

    const solutionNoPick: SentenceSolution = [
      { eliminated: [0], scores: [0, 0] }, // solver eliminated the 1st-person parse
    ];
    const picks2 = applyTranslationEvidence(tokens, analyses, solutionNoPick, {
      person: { '1st': 4 },
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 0,
    });
    // only one candidate remains — not a disambiguation, so nothing is picked
    expect(picks2.size).toBe(0);
  });

  it('ignores unambiguous tokens', () => {
    const tokens = [token('cano', 0)];
    const sparse: SentenceSolution = [undefined];
    const picks = applyTranslationEvidence(tokens, analyses, sparse, {
      person: { '1st': 4 },
      passive: 0,
      participle: 0,
      infinitive: 0,
      genitive: 4,
    });
    expect(picks.size).toBe(0);
  });
});
