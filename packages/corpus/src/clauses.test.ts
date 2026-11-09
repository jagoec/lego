import { describe, expect, it } from 'vitest';
import type { Chunk, MorpheusAnalysis, Token } from '@lego/shared';
import { buildClauses, detectClauseSpans } from './clauses.js';
import type { AnalysisMap } from './groups.js';
import { buildOrder } from './order.js';

const token = (form: string, index: number, extra: Partial<Token> = {}): Token => ({
  index,
  text: form,
  form,
  line: 1,
  ...extra,
});

function analysis(pos: MorpheusAnalysis['pos'], extra: Partial<MorpheusAnalysis> = {}): MorpheusAnalysis {
  return { pos, lemma: pos, features: [], ...extra };
}

function mapOf(entries: readonly (readonly [string, MorpheusAnalysis[]])[]): AnalysisMap {
  return Object.fromEntries(entries);
}

/** v1-style input: tokens + analyses → buildOrder chunks, then buildClauses. */
function clauseUp(tokens: Token[], analyses: AnalysisMap) {
  const order = buildOrder(tokens, analyses);
  return { ...buildClauses(tokens, analyses, order), v1Order: order };
}

describe('detectClauseSpans — relative clauses', () => {
  it('absorbs from the relative pronoun up to the next verb anchor', () => {
    // "femina quam vidi" — quam (relative stem) → clause quam..vidi
    const tokens = [token('femina', 0), token('quam', 1), token('vidi', 2)];
    const analyses = mapOf([
      ['femina', [analysis('noun', { cases: ['nom'], numbers: ['sg'], genders: ['fem'] })]],
      ['quam', [analysis('pronoun', { cases: ['acc'], numbers: ['sg'], genders: ['fem'], stem: 'relative' })]],
      ['vidi', [analysis('verb', { mood: 'ind', tense: 'perf', voice: 'active', persons: ['1st'], numbers: ['sg'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'relative' }]);
  });

  it('prefers the relative reading of quod over the conjunction reading', () => {
    const tokens = [token('templum', 0), token('quod', 1), token('vidi', 2)];
    const analyses = mapOf([
      ['templum', [analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['neut'] })]],
      ['quod', [
        analysis('pronoun', { cases: ['acc'], numbers: ['sg'], genders: ['neut'], stem: 'relative' }),
        analysis('conjunction'),
      ]],
      ['vidi', [analysis('verb', { mood: 'ind', tense: 'perf', voice: 'active', persons: ['1st'], numbers: ['sg'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'relative' }]);
  });

  it('runs to sentence end when no verb anchor follows', () => {
    const tokens = [token('venit', 0), token('quae', 1), token('oras', 2)];
    const analyses = mapOf([
      ['venit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
      ['quae', [analysis('pronoun', { cases: ['nom'], numbers: ['pl'], genders: ['fem'], stem: 'relative' })]],
      ['oras', [analysis('noun', { cases: ['acc'], numbers: ['pl'], genders: ['fem'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'relative' }]);
  });
});

describe('detectClauseSpans — subordinating conjunctions', () => {
  const verb = (mood: 'ind' | 'subj'): MorpheusAnalysis[] => [
    analysis('verb', { mood, tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
  ];

  it('cum absorbs up to its verb anchor (adverbial)', () => {
    const tokens = [token('revenit', 0), token('cum', 1), token('maneret', 2), token('tum', 3)];
    const analyses = mapOf([
      ['revenit', verb('ind')],
      ['cum', [analysis('conjunction'), analysis('preposition')]],
      ['maneret', verb('subj')],
      ['tum', [analysis('adverb')]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'adverbial' }]);
  });

  it('ut + subjunctive is completive; ut + indicative is adverbial', () => {
    const subjTokens = [token('misit', 0), token('ut', 1), token('veniret', 2)];
    const subjAnalyses = mapOf([
      ['misit', verb('ind')],
      ['ut', [analysis('adverb')]], // morpheus reads ut as an adverb stem
      ['veniret', verb('subj')],
    ]);
    expect(detectClauseSpans(subjTokens, subjAnalyses)).toEqual([
      { start: 1, end: 2, kind: 'completive' },
    ]);

    const indAnalyses = mapOf([
      ['misit', verb('ind')],
      ['ut', [analysis('adverb')]],
      ['veniebat', verb('ind')],
    ]);
    expect(detectClauseSpans([token('misit', 0), token('ut', 1), token('veniebat', 2)], indAnalyses)).toEqual([
      { start: 1, end: 2, kind: 'adverbial' },
    ]);
  });

  it('ne opens a clause only with a subjunctive anchor (ne … quidem stays main)', () => {
    // "ne ... quidem" around an indicative verb — no clause
    const tokens = [token('non', 0), token('ne', 1), token('quidem', 2), token('timet', 3)];
    const analyses = mapOf([
      ['non', [analysis('adverb')]],
      ['ne', [analysis('adverb'), analysis('conjunction')]],
      ['quidem', [analysis('adverb')]],
      ['timet', verb('ind')],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);

    // purposive ne + subjunctive → completive
    const purposive = [token('misit', 0), token('ne', 1), token('iret', 2)];
    const purposiveAnalyses = mapOf([
      ['misit', verb('ind')],
      ['ne', [analysis('adverb'), analysis('conjunction')]],
      ['iret', verb('subj')],
    ]);
    expect(detectClauseSpans(purposive, purposiveAnalyses)).toEqual([
      { start: 1, end: 2, kind: 'completive' },
    ]);
  });

  it('ut without a following verb anchor forms no clause', () => {
    const tokens = [token('veniebat', 0), token('ita', 1), token('ut', 2)];
    const analyses = mapOf([
      ['veniebat', verb('ind')],
      ['ita', [analysis('adverb')]],
      ['ut', [analysis('adverb')]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });

  it('other conjunctions absorb to sentence end without an anchor', () => {
    const tokens = [token('trepidant', 0), token('dum', 1), token('omnes', 2)];
    const analyses = mapOf([
      ['trepidant', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['pl'] })]],
      ['dum', [analysis('conjunction')]],
      ['omnes', [analysis('adjective', { cases: ['nom'], numbers: ['pl'], genders: ['common'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'adverbial' }]);
  });
});

describe('detectClauseSpans — participial (ablative absolute)', () => {
  it('spans the ablative noun through the ablative participle', () => {
    // "urbe capta, Aeneas abit"
    const tokens = [token('urbe', 0), token('capta', 1), token('Aeneas', 2), token('abit', 3)];
    const analyses = mapOf([
      ['urbe', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['capta', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['Aeneas', [analysis('name', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['abit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 0, end: 1, kind: 'participial' }]);
  });

  it('tolerates a short gap between noun and participle, but no verb anchor', () => {
    // "caede recenti... lavit"? — noun abl, adjective abl between, participle abl
    const tokens = [token('caede', 0), token('recenti', 1), token('facta', 2), token('lavit', 3)];
    const analyses = mapOf([
      ['caede', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['recenti', [analysis('adjective', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['facta', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['lavit', [analysis('verb', { mood: 'ind', tense: 'perf', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 0, end: 2, kind: 'participial' }]);
  });

  it('does not fire when a verb anchor separates noun and participle', () => {
    const tokens = [token('urbe', 0), token('redit', 1), token('capta', 2)];
    const analyses = mapOf([
      ['urbe', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['redit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
      ['capta', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });

  it('does not fire when an accusative nominal lies between (oris Italiam fato)', () => {
    const tokens = [token('oris', 0), token('Italiam', 1), token('fato', 2)];
    const analyses = mapOf([
      ['oris', [analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] })]],
      ['Italiam', [analysis('name', { cases: ['acc'], numbers: ['sg'], genders: ['fem'] })]],
      ['fato', [
        analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['neut'] }),
        analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['masc'] }),
      ]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });

  it('does not fire when an accusative ADJECTIVE lies between (omnibus unam posthabita)', () => {
    const tokens = [token('omnibus', 0), token('unam', 1), token('posthabita', 2)];
    const analyses = mapOf([
      ['omnibus', [
        analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] }),
        analysis('adjective', { cases: ['abl'], numbers: ['pl'], genders: ['common'] }),
      ]],
      ['unam', [analysis('adjective', { cases: ['acc'], numbers: ['sg'], genders: ['fem'] })]],
      ['posthabita', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl', 'nom'], numbers: ['sg'], genders: ['fem'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });

  it('fires through a nom/acc-ambiguous interjection (navibus infandum amissis)', () => {
    const tokens = [token('navibus', 0), token('infandum', 1), token('amissis', 2)];
    const analyses = mapOf([
      ['navibus', [
        analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] }),
        analysis('noun', { cases: ['dat'], numbers: ['pl'], genders: ['fem'] }),
      ]],
      ['infandum', [
        analysis('adjective', { cases: ['acc'], numbers: ['sg'], genders: ['masc'] }),
        analysis('adjective', { cases: ['nom', 'voc', 'acc'], numbers: ['sg'], genders: ['neut'] }),
      ]],
      ['amissis', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['pl'], genders: ['fem'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 0, end: 2, kind: 'participial' }]);
  });

  it('does not fire when a conjunction lies between (terris iactatus et alto)', () => {
    const tokens = [token('terris', 0), token('iactatus', 1), token('et', 2), token('alto', 3)];
    const analyses = mapOf([
      ['terris', [analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] })]],
      ['iactatus', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['et', [analysis('conjunction')]],
      ['alto', [
        analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['neut'] }),
        analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['neut'] }),
      ]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });
});

describe('detectClauseSpans — accusative + infinitive', () => {
  it('spans the accusative subject through the infinitive (matrix verb earlier)', () => {
    // "credo venturos esse"
    const tokens = [token('credo', 0), token('venturos', 1), token('esse', 2)];
    const analyses = mapOf([
      ['credo', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] })]],
      ['venturos', [analysis('verb', { mood: 'part', tense: 'fut', voice: 'active', cases: ['acc'], numbers: ['pl'], genders: ['masc'] })]],
      ['esse', [analysis('verb', { mood: 'inf', tense: 'pres', voice: 'active' })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 2, kind: 'completive' }]);
  });

  it('skips when no matrix verb precedes the accusative', () => {
    const tokens = [token('venturos', 0), token('esse', 1)];
    const analyses = mapOf([
      ['venturos', [analysis('verb', { mood: 'part', tense: 'fut', voice: 'active', cases: ['acc'], numbers: ['pl'], genders: ['masc'] })]],
      ['esse', [analysis('verb', { mood: 'inf', tense: 'pres', voice: 'active' })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([]);
  });
});

describe('detectClauseSpans — coordination', () => {
  it('a -que coordinated verb joins the previous anchor\'s clause and extends it', () => {
    // "dum conderet urbem inferretque deos" + main verb after
    const tokens = [
      token('passus', 0),
      token('dum', 1),
      token('conderet', 2),
      token('urbem', 3),
      token('inferret', 4, { text: 'inferretque', enclitics: ['que'] }),
      token('deos', 5),
      token('abit', 6),
    ];
    const subj = (): MorpheusAnalysis[] => [
      analysis('verb', { mood: 'subj', tense: 'imperf', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
    ];
    const analyses = mapOf([
      ['passus', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['dum', [analysis('conjunction')]],
      ['conderet', subj()],
      ['urbem', [analysis('noun', { cases: ['acc'], numbers: ['sg'], genders: ['fem'] })]],
      ['inferret', subj()],
      ['deos', [analysis('noun', { cases: ['acc'], numbers: ['pl'], genders: ['masc'] })]],
      ['abit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 1, end: 4, kind: 'adverbial' }]);
  });

  it('a preceding et does NOT coordinate (nominal et…et would extend clauses wrongly)', () => {
    // "cum maneret et taceret" — et before a real verb: the et rule is
    // deliberately not used; only the verb's own -que coordinates
    const tokens = [token('cum', 0), token('maneret', 1), token('et', 2), token('taceret', 3), token('abiit', 4)];
    const subj = (): MorpheusAnalysis[] => [
      analysis('verb', { mood: 'subj', tense: 'imperf', voice: 'active', persons: ['3rd'], numbers: ['sg'] }),
    ];
    const analyses = mapOf([
      ['cum', [analysis('conjunction')]],
      ['maneret', subj()],
      ['et', [analysis('conjunction')]],
      ['taceret', subj()],
      ['abiit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    // cum-clause ends at maneret; taceret opens no clause of its own
    // (it is an anchor, not a trigger) and stays main
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 0, end: 1, kind: 'adverbial' }]);
  });

  it('coordinated indicatives (tenditque fovetque) stay main; only subjunctives join', () => {
    // "si qua fata sinant, iam tum tenditque fovetque"
    const tokens = [
      token('si', 0),
      token('sinant', 1),
      token('iam', 2),
      token('tum', 3),
      token('tendit', 4, { text: 'tenditque', enclitics: ['que'] }),
      token('fovet', 5, { text: 'fovetque', enclitics: ['que'] }),
    ];
    const analyses = mapOf([
      ['si', [analysis('conjunction')]],
      ['sinant', [analysis('verb', { mood: 'subj', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['pl'] })]],
      ['iam', [analysis('adverb')]],
      ['tum', [analysis('adverb')]],
      ['tendit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
      ['fovet', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    // the si-clause ends at sinant; the indicative -que verbs do not extend it
    expect(detectClauseSpans(tokens, analyses)).toEqual([{ start: 0, end: 1, kind: 'adverbial' }]);
  });
});

describe('buildClauses — structure, chunks, roles', () => {
  it('splits chunks at clause boundaries, assigns clauseIds and renumbers', () => {
    // "Troiae qui primus ab oris" style: run chunk split by the relative clause
    const tokens = [
      token('cano', 0),
      token('Troiae', 1),
      token('qui', 2),
      token('primus', 3),
      token('ab', 4),
      token('oris', 5),
      token('venit', 6),
    ];
    const analyses = mapOf([
      ['cano', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['1st'], numbers: ['sg'] })]],
      ['Troiae', [analysis('name', { cases: ['gen', 'dat'], numbers: ['sg'], genders: ['neut'] })]],
      ['qui', [analysis('pronoun', { cases: ['nom'], numbers: ['sg'], genders: ['masc'], stem: 'relative' })]],
      ['primus', [analysis('adjective', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['ab', [analysis('preposition')]],
      ['oris', [analysis('noun', { cases: ['abl', 'gen'], numbers: ['pl'], genders: ['fem'] })]],
      ['venit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    const { clauses, order } = clauseUp(tokens, analyses);

    // clauses: main (0) + relative [2..6]
    expect(clauses).toEqual([
      { id: 0, kind: 'main', tokenIndices: [0, 1] },
      { id: 1, kind: 'relative', tokenIndices: [2, 3, 4, 5, 6] },
    ]);

    // every token in exactly one clause is asserted via the chunks:
    const covered = order.flatMap((chunk) => chunk.tokenIndices).sort((a, b) => a - b);
    expect(covered).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // chunks renumbered and every chunk carries a clauseId
    expect(order.map((chunk) => chunk.order)).toEqual(order.map((_, i) => i + 1));
    for (const chunk of order) expect(chunk.clauseId).toBeDefined();
    // the v1 run chunk [Troiae, qui, primus] split at the relative pronoun:
    // [Troiae] stays main, [qui, primus] joins the relative clause
    const troiae = order.find((chunk) => chunk.tokenIndices.includes(1));
    const quiPrimus = order.find((chunk) => chunk.tokenIndices.includes(3));
    expect(troiae?.clauseId).toBe(0);
    expect(quiPrimus?.clauseId).toBe(1);
    // the split 'subject' label is re-derived: [Troiae] alone is not a
    // confident nominative → label (and role) dropped
    expect(troiae?.label).toBeUndefined();
    expect(troiae?.role).toBe('predicate'); // main-clause default
    // [qui, primus] keeps the subject label (qui is an unambiguous nom)
    // but subordinate chunks carry no role
    expect(quiPrimus?.label).toBe('subject');
    expect(quiPrimus?.role).toBeUndefined();
  });

  it('assigns roles to main-clause chunks only', () => {
    // "urbe capta, Aeneas abit" — participial clause + main clause
    const tokens = [token('urbe', 0), token('capta', 1), token('Aeneas', 2), token('abit', 3)];
    const analyses = mapOf([
      ['urbe', [analysis('noun', { cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['capta', [analysis('verb', { mood: 'part', tense: 'perf', voice: 'passive', cases: ['abl'], numbers: ['sg'], genders: ['fem'] })]],
      ['Aeneas', [analysis('name', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['abit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    const { clauses, order } = clauseUp(tokens, analyses);
    expect(clauses).toEqual([
      { id: 0, kind: 'main', tokenIndices: [2, 3] },
      { id: 1, kind: 'participial', tokenIndices: [0, 1] },
    ]);
    const subject = order.find((chunk) => chunk.tokenIndices.includes(2));
    const verb = order.find((chunk) => chunk.tokenIndices.includes(3));
    const ablAbs = order.find((chunk) => chunk.tokenIndices.includes(0));
    expect(subject?.role).toBe('subject');
    expect(verb?.role).toBe('verb');
    expect(ablAbs?.role).toBeUndefined(); // subordinate — no role
    expect(ablAbs?.clauseId).toBe(1);
  });

  it('a sentence without triggers is one main clause with roles everywhere', () => {
    const tokens = [token('Aeneas', 0), token('navibus', 1), token('praestat', 2)];
    const analyses = mapOf([
      ['Aeneas', [analysis('name', { cases: ['nom'], numbers: ['sg'], genders: ['masc'] })]],
      ['navibus', [analysis('noun', { cases: ['dat', 'abl'], numbers: ['pl'], genders: ['fem'] })]],
      ['praestat', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    const { clauses, order } = clauseUp(tokens, analyses);
    expect(clauses).toEqual([{ id: 0, kind: 'main', tokenIndices: [0, 1, 2] }]);
    for (const chunk of order) {
      expect(chunk.clauseId).toBe(0);
      expect(chunk.role).toBeDefined();
    }
  });

  it('keeps phrase labels with the piece containing the preposition', () => {
    // "ab oris quae..." — a phrase chunk split by a relative clause
    const tokens = [token('venit', 0), token('ab', 1), token('oris', 2), token('quae', 3), token('videt', 4)];
    const analyses = mapOf([
      ['venit', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
      ['ab', [analysis('preposition')]],
      ['oris', [analysis('noun', { cases: ['abl'], numbers: ['pl'], genders: ['fem'] })]],
      ['quae', [analysis('pronoun', { cases: ['nom'], numbers: ['pl'], genders: ['fem'], stem: 'relative' })]],
      ['videt', [analysis('verb', { mood: 'ind', tense: 'pres', voice: 'active', persons: ['3rd'], numbers: ['sg'] })]],
    ]);
    const { clauses, order } = clauseUp(tokens, analyses);
    expect(clauses).toEqual([
      { id: 0, kind: 'main', tokenIndices: [0, 1, 2] },
      { id: 1, kind: 'relative', tokenIndices: [3, 4] },
    ]);
    const phrase = order.find((chunk) => chunk.tokenIndices.includes(1));
    expect(phrase?.label).toBe('phrase');
    expect(phrase?.role).toBe('predicate');
    const relativePiece = order.find((chunk) => chunk.tokenIndices.includes(3));
    expect(relativePiece?.label).toBeUndefined(); // no trigger token → label dropped
    expect(relativePiece?.clauseId).toBe(1);
  });
});
