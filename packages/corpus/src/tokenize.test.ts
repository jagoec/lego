import { describe, expect, it } from 'vitest';
import type { TeiLine } from './tei.js';
import { extractWords, splitEnclitics, toToken } from './tokenize.js';

const lines = (spec: readonly [number, string][]): TeiLine[] =>
  spec.map(([n, text]) => ({ n, text }));

describe('extractWords — punctuation attachment', () => {
  it('splits on whitespace and attaches trailing punctuation', () => {
    const words = extractWords(lines([[1, 'Arma virumque cano, Troiae qui primus ab oris']]));
    expect(words.map((word) => [word.text, word.punctuation, word.line])).toEqual([
      ['Arma', '', 1],
      ['virumque', '', 1],
      ['cano', ',', 1],
      ['Troiae', '', 1],
      ['qui', '', 1],
      ['primus', '', 1],
      ['ab', '', 1],
      ['oris', '', 1],
    ]);
  });

  it('attaches mid-word em-dash punctuation to the preceding word', () => {
    // l. 198: `O socii—neque enim ignari sumus ante malorum—`
    const words = extractWords(lines([[198, 'O socii—neque enim ignari sumus ante malorum—']]));
    expect(words.map((word) => [word.text, word.punctuation])).toEqual([
      ['O', ''],
      ['socii', '—'],
      ['neque', ''],
      ['enim', ''],
      ['ignari', ''],
      ['sumus', ''],
      ['ante', ''],
      ['malorum', '—'],
    ]);
  });

  it('attaches combined punctuation runs like ",—" in one piece', () => {
    // l. 268: `additur,—Ilus erat,`
    const words = extractWords(lines([[268, 'additur,—Ilus erat,']]));
    expect(words.map((word) => [word.text, word.punctuation])).toEqual([
      ['additur', ',—'],
      ['Ilus', ''],
      ['erat', ','],
    ]);
  });

  it('attaches an opening parenthesis to the previous word, not the next', () => {
    // l. 251: `navibus (infandum!) amissis,`
    const words = extractWords(lines([[251, 'navibus (infandum!) amissis,']]));
    expect(words.map((word) => [word.text, word.punctuation])).toEqual([
      ['navibus', '('],
      ['infandum', '!)'],
      ['amissis', ','],
    ]);
  });

  it('drops leading punctuation when the previous word already ended a sentence', () => {
    const words = extractWords(lines([[1, 'Iamque. (age)']]));
    expect(words.map((word) => [word.text, word.punctuation])).toEqual([
      ['Iamque', '.'],
      ['age', ')'], // "(" dropped: it opens a new sentence
    ]);
  });

  it('carries line numbers through, including across lines', () => {
    const words = extractWords(lines([[1, 'litora, multum'], [2, 'ille et terris']]));
    expect(words.map((word) => word.line)).toEqual([1, 1, 2, 2, 2]);
  });
});

describe('splitEnclitics — the layered rule', () => {
  const known = (...forms: string[]) => {
    const set = new Set(forms);
    return (form: string) => set.has(form);
  };

  it('splits -que when the stem is a known form (the virumque doctrine)', () => {
    expect(splitEnclitics('virumque', known('virum'))).toEqual({ form: 'virum', enclitics: ['que'] });
  });

  it('splits -que even when morpheus also knows the whole form (namque → nam)', () => {
    expect(splitEnclitics('namque', known('nam', 'namque'))).toEqual({ form: 'nam', enclitics: ['que'] });
  });

  it('keeps the whole word when only the whole form is known (quodcumque)', () => {
    expect(splitEnclitics('quodcumque', known('quodcumque'))).toBeNull();
  });

  it('splits when neither side is known (enclitic is the better guess)', () => {
    expect(splitEnclitics('murmureque', known())).toEqual({ form: 'murmure', enclitics: ['que'] });
  });

  it('preserves surface capitalization on the stem', () => {
    expect(splitEnclitics('Troiaque', known('Troia'))).toEqual({ form: 'Troia', enclitics: ['que'] });
    expect(splitEnclitics('Albanique', known('Albani'))).toEqual({ form: 'Albani', enclitics: ['que'] });
  });

  it('never splits the stoplisted lexical words, even when stems analyze', () => {
    // sine → si, Iove → Io, Solve → Sol, quoque → quo: all traps
    expect(splitEnclitics('sine', known('si', 'sine'))).toBeNull();
    expect(splitEnclitics('Iove', known('Io', 'Iove'))).toBeNull();
    expect(splitEnclitics('Solve', known('Sol', 'Solve'))).toBeNull();
    expect(splitEnclitics('quoque', known('quo', 'quoque'))).toBeNull();
  });

  it('splits -ve normally (sive → si, molirive → moliri)', () => {
    expect(splitEnclitics('sive', known('si'))).toEqual({ form: 'si', enclitics: ['ve'] });
    expect(splitEnclitics('molirive', known('moliri'))).toEqual({ form: 'moliri', enclitics: ['ve'] });
  });

  it('splits -ne only for the attested interrogative forms', () => {
    expect(splitEnclitics('mene', known('me', 'mene'))).toEqual({ form: 'me', enclitics: ['ne'] });
    expect(splitEnclitics('Mene', known('Me', 'Mene'))).toEqual({ form: 'Me', enclitics: ['ne'] });
    expect(splitEnclitics('tune', known('tu', 'tune'))).toEqual({ form: 'tu', enclitics: ['ne'] });
    expect(splitEnclitics('tantaene', known('tantae', 'tantaene'))).toEqual({ form: 'tantae', enclitics: ['ne'] });
    // ordinary -ne words are kept whole
    expect(splitEnclitics('numine', known('numine'))).toBeNull();
    expect(splitEnclitics('sanguine', known('sanguine'))).toBeNull();
    expect(splitEnclitics('immane', known('immane'))).toBeNull();
  });

  it('never splits bare enclitics or vowelless crumbs', () => {
    expect(splitEnclitics('que', known('que'))).toBeNull();
    expect(splitEnclitics('ne', known('ne'))).toBeNull();
    expect(splitEnclitics('ve', known('ve'))).toBeNull();
  });
});

describe('toToken', () => {
  const known = (...forms: string[]) => {
    const set = new Set(forms);
    return (form: string) => set.has(form);
  };

  it('produces a full-surface token with the stem as form', () => {
    const token = toToken({ text: 'virumque', punctuation: ',', line: 1 }, 3, known('virum'));
    expect(token).toEqual({
      index: 3,
      text: 'virumque',
      form: 'virum',
      line: 1,
      punctuation: ',',
      enclitics: ['que'],
    });
  });

  it('omits optional fields when empty', () => {
    const token = toToken({ text: 'Troiae', punctuation: '', line: 2 }, 0, known());
    expect(token).toEqual({ index: 0, text: 'Troiae', form: 'Troiae', line: 2 });
    expect('punctuation' in token).toBe(false);
    expect('enclitics' in token).toBe(false);
  });
});
