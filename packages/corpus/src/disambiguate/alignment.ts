/**
 * Sentence-level alignment between our Latin sentences and the English
 * Williams translation (`texts/vergil-aeneid-eng.tei.xml`).
 *
 * ## Structure of the translation file (verified)
 *
 * `TEI > text > body > div[type=translation] > div[subtype=book][n=1..12] >
 * div[subtype=card][n=latin line] > l[n]`. Two facts drive the alignment:
 *
 * - the translation's own `l n` numbers are its OWN line sequence
 *   (book 1: 1066 English lines for 756 Latin lines), not Latin lines;
 * - the `card` divisions are keyed to LATIN line numbers — each card's
 *   `n` is the Latin line where the passage begins, matching the card
 *   milestones of the Latin TEI (book 1 cards start at Latin lines
 *   1, 8, 12, 34, …, 723).
 *
 * ## Alignment method (deterministic, imperfect by design)
 *
 * 1. Anchor points: card k starts at Latin line `card.n` and at English
 *    line index `card.lineIndex`. A terminal anchor
 *    (latinLineCount + 1, englishLineCount) closes the last card.
 * 2. A Latin verse line L maps to an English line index by piecewise
 *    LINEAR INTERPOLATION between the two surrounding anchors — the
 *    translation tracks the Latin closely card by card, so the error is
 *    a line or two at most.
 * 3. A Latin sentence (lineStart..lineEnd) therefore maps to an English
 *    line range; the ENGLISH sentences (segmented on `. ; ? !`) that
 *    START within that range (±1 line of slack) form its translation
 *    span. Sentences with no English sentence starting in the window
 *    (even after widening by another line) are marked UNALIGNABLE
 *    (null), as are spans whose English sentence count explodes beyond
 *    a sanity cap — a symptom of a misaligned window.
 *
 * The result is committed as reviewable data at
 * `texts/cache/translation-alignment.json` by the import CLI.
 */
import { XMLParser } from 'fast-xml-parser';

/** One book of the translation: its lines and card anchors. */
export interface EnglishBook {
  /** translation line texts, in order (index 0 = line 1) */
  lines: string[];
  /** card anchors: Latin line where the card starts → English line index */
  cards: { latinStart: number; lineIndex: number }[];
}

/** The aligned translation of one Latin sentence. */
export interface TranslationAlignment {
  lineStart: number;
  lineEnd: number;
  /** joined English sentences of the aligned span */
  text: string;
}

interface PreservedNode {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function attrsOf(node: Record<string, unknown>): Record<string, string> {
  const attrs = node[':@'];
  if (!isRecord(attrs)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function childArray(node: Record<string, unknown>): PreservedNode[] {
  for (const [key, value] of Object.entries(node)) {
    if (key === ':@') continue;
    if (Array.isArray(value)) return value as PreservedNode[];
  }
  return [];
}

/** Elements inside `<l>` whose text is dropped. */
const SKIP_ELEMENTS: ReadonlySet<string> = new Set([
  'milestone', 'note', 'pb', 'lb', 'figure', 'ref', 'orig', 'choice',
]);

/** Depth-first search for the first element with the given tag + attributes. */
function findFirst(
  nodes: readonly PreservedNode[],
  tag: string,
  matches: (attrs: Record<string, string>) => boolean,
): Record<string, unknown> | undefined {
  for (const node of nodes) {
    for (const [key, value] of Object.entries(node)) {
      if (key === ':@') continue;
      if (key === tag && matches(attrsOf(node))) return node;
      if (Array.isArray(value)) {
        const found = findFirst(value as PreservedNode[], tag, matches);
        if (found !== undefined) return found;
      }
    }
  }
  return undefined;
}

/** Collect the text of a preserveOrder subtree (all inline elements kept). */
function collectText(children: readonly PreservedNode[], out: string[]): void {
  for (const child of children) {
    for (const [key, value] of Object.entries(child)) {
      if (key === ':@') continue;
      if (key === '#text') {
        if (typeof value === 'string') out.push(value);
      } else if (Array.isArray(value) && !SKIP_ELEMENTS.has(key)) {
        collectText(value as PreservedNode[], out);
      }
    }
  }
}

/**
 * Extract one book of the translation: its verse lines and the card
 * anchors that tie cards to Latin line numbers.
 */
export function extractEnglishBook(xml: string, book: number): EnglishBook {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: false,
  });
  const doc = parser.parse(xml) as PreservedNode[];

  const tei = findFirst(doc, 'TEI', () => true);
  const text = tei === undefined ? undefined : findFirst(childArray(tei), 'text', () => true);
  const body = text === undefined ? undefined : findFirst(childArray(text), 'body', () => true);
  const translation =
    body === undefined ? undefined : findFirst(childArray(body), 'div', (a) => a['type'] === 'translation');
  const bookDiv =
    translation === undefined
      ? undefined
      : findFirst(childArray(translation), 'div', (a) => a['subtype'] === 'book' && a['n'] === String(book));
  if (bookDiv === undefined) {
    throw new Error(`no translation book div with n="${book}" found`);
  }

  const lines: string[] = [];
  const cards: { latinStart: number; lineIndex: number }[] = [];

  for (const child of childArray(bookDiv)) {
    for (const [tag, value] of Object.entries(child)) {
      if (tag === ':@') continue;
      if (tag !== 'div' || !Array.isArray(value)) continue;
      if (attrsOf(child)['subtype'] !== 'card') continue;
      const latinStart = Number(attrsOf(child)['n']);
      if (!Number.isInteger(latinStart) || latinStart < 1) continue;
      const lineIndex = lines.length;
      for (const lineNode of value as PreservedNode[]) {
        for (const [lineTag, lineValue] of Object.entries(lineNode)) {
          if (lineTag === ':@') continue;
          if (lineTag !== 'l' || !Array.isArray(lineValue)) continue;
          const parts: string[] = [];
          collectText(lineValue as PreservedNode[], parts);
          const lineText = parts.join('').replace(/\s+/g, ' ').trim();
          if (lineText !== '') lines.push(lineText);
        }
      }
      if (lines.length > lineIndex) cards.push({ latinStart, lineIndex });
    }
  }

  if (cards.length === 0) throw new Error(`translation book ${book} has no card divisions`);
  return { lines, cards };
}

/**
 * Map a Latin verse line to an English line INDEX (0-based) by piecewise
 * linear interpolation between card anchors. `latinLineCount` is the
 * book's highest Latin line number (the terminal anchor).
 */
export function mapLatinToEnglishLine(
  english: EnglishBook,
  latinLineCount: number,
  latinLine: number,
): number {
  const anchors: { latinStart: number; lineIndex: number }[] = [...english.cards];
  const last = anchors[anchors.length - 1]!;
  const latinEnd = latinLineCount + 1;
  if (latinEnd > last.latinStart) anchors.push({ latinStart: latinEnd, lineIndex: english.lines.length });

  if (latinLine <= anchors[0]!.latinStart) return anchors[0]!.lineIndex;
  for (let k = 0; k < anchors.length - 1; k++) {
    const a = anchors[k]!;
    const b = anchors[k + 1]!;
    if (latinLine >= a.latinStart && latinLine <= b.latinStart) {
      const span = b.latinStart - a.latinStart;
      const fraction = (latinLine - a.latinStart) / Math.max(span, 1);
      return Math.min(
        english.lines.length - 1,
        Math.round(a.lineIndex + fraction * (b.lineIndex - a.lineIndex)),
      );
    }
  }
  return english.lines.length - 1;
}

// ---------------------------------------------------------------------------
// English sentence segmentation
// ---------------------------------------------------------------------------

/** One sentence of the translation: its text and the line it starts on. */
export interface EnglishSentence {
  /** 0-based line index the sentence starts on */
  startLine: number;
  text: string;
}

const TERMINATORS = new Set(['.', ';', '?', '!']);
const CLOSING_QUOTES = new Set(['"', '”', "'", '’', ')']);

/** Segment the book lines into sentences, tracking each sentence's start line. */
export function segmentEnglish(lines: readonly string[]): EnglishSentence[] {
  const sentences: EnglishSentence[] = [];
  let buffer = '';
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (buffer === '') startLine = i;
    buffer = buffer === '' ? line : `${buffer} ${line}`;
    // flush complete sentences that end within this line
    for (;;) {
      let end = -1;
      for (let c = 0; c < buffer.length; c++) {
        const ch = buffer[c] ?? '';
        if (!TERMINATORS.has(ch)) continue;
        // a terminator followed only by a closing quote ends the sentence
        let after = c + 1;
        while (after < buffer.length && CLOSING_QUOTES.has(buffer[after] ?? '')) after += 1;
        if (after >= buffer.length || (buffer[after] ?? '') === ' ') {
          end = after;
          break;
        }
      }
      if (end < 0) break;
      const text = buffer.slice(0, end).trim();
      if (text !== '') sentences.push({ startLine, text });
      buffer = buffer.slice(end).trimStart();
      startLine = i;
    }
  }
  const text = buffer.trim();
  if (text !== '') sentences.push({ startLine, text });
  return sentences;
}

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

/** Slack (in English lines) around the interpolated window. */
const WINDOW_SLACK = 1;
/** Widened slack when the first attempt finds nothing. */
const WIDENED_SLACK = 2;
/** Sanity cap: English sentences per Latin line before calling it misaligned. */
const MAX_SENTENCES_PER_LINE = 2;
/** …plus this absolute allowance. */
const MAX_SENTENCE_ALLOWANCE = 4;

/**
 * Align each Latin sentence of a book to its English translation span.
 * Unalignable sentences get null. See the module doc for the method.
 */
export function alignBookSentences(
  english: EnglishBook,
  latinLineCount: number,
  latinSentences: readonly { lineStart: number; lineEnd: number }[],
): (TranslationAlignment | null)[] {
  const sentences = segmentEnglish(english.lines);

  const pick = (lineStart: number, lineEnd: number, slack: number): string | null => {
    const e1 = mapLatinToEnglishLine(english, latinLineCount, lineStart);
    const e2 = mapLatinToEnglishLine(english, latinLineCount, lineEnd);
    const from = e1 - slack;
    const to = e2 + slack;
    const inWindow = sentences.filter((sentence) => sentence.startLine >= from && sentence.startLine <= to);
    if (inWindow.length === 0) return null;
    const cap = (lineEnd - lineStart + 1) * MAX_SENTENCES_PER_LINE + MAX_SENTENCE_ALLOWANCE;
    if (inWindow.length > cap) return null; // window exploded — misaligned
    return inWindow.map((sentence) => sentence.text).join(' ');
  };

  return latinSentences.map((sentence) => {
    const text =
      pick(sentence.lineStart, sentence.lineEnd, WINDOW_SLACK) ??
      pick(sentence.lineStart, sentence.lineEnd, WIDENED_SLACK);
    return text === null ? null : { ...sentence, text };
  });
}
