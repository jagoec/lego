/**
 * TEI extraction for the PerseusDL/canonical-latinlit Vergil Aeneid file
 * (`texts/vergil-aeneid.tei.xml`, phi0690.phi003.perseus-lat2).
 *
 * ## File shape (verified against the committed file)
 *
 * - One `<TEI>` document containing all 12 books:
 *   `TEI > text > body > div[type="edition"] > div[n="1".."12"][type="textpart"]`.
 * - Each book div holds `<l n="…">…</l>` verse lines in document order
 *   (book 1: lines 1–756) plus ignorable `<milestone>` card markers.
 * - Lines may contain inline mixed content:
 *   - `<q>`/`<q rend="merge">` — speech quotation; its text belongs to the
 *     line, and punctuation may sit between `<q>` elements
 *     (e.g. l. 754: `<q>insidias</q>, inquit, <q>Danaum, casusque tuorum,</q>`).
 *   - `<del>` — lines the edition marks as transposed duplicates. Within
 *     book 1 (l. 426, l. 711) the deleted content occurs nowhere else in
 *     the book and is canonical Aeneid text, so its text is KEPT. (In other
 *     books the same marking guards true duplicates, e.g. book 2 l. 76 →
 *     l. 612; callers extracting those books would need to handle that.)
 * - `rend`/`xml:lang` attributes are ignored.
 *
 * Parsing uses fast-xml-parser in `preserveOrder` mode, the only mode that
 * faithfully preserves mixed text/element content inside `<l>`.
 */
import { XMLParser } from 'fast-xml-parser';

/** A verse line: TEI `n` attribute (1-based line number) plus its text. */
export interface TeiLine {
  n: number;
  text: string;
}

/** Element names inside `<l>` whose text content is dropped. */
const SKIP_ELEMENTS: ReadonlySet<string> = new Set([
  'milestone', // card/section markers, no text
  'note', // editorial notes (none in this file's book 1, skipped for safety)
  'pb', // page breaks
  'lb', // line breaks
  'figure', // figures
  'ref', // cross-references
]);

/** Elements whose entire subtree text is kept, flattened into the line. */
const KEEP_ELEMENTS: ReadonlySet<string> = new Set(['q', 'del', 'add', 'supplied', 'reg', 'expan']);

interface PreservedNode {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Attribute object of a preserveOrder node (`{ ':@': { n: '1' } }`). */
function attrsOf(node: Record<string, unknown>): Record<string, string> {
  const attrs = node[':@'];
  if (!isRecord(attrs)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/**
 * Collect the text of a preserveOrder element subtree in document order.
 * Text nodes (`#text`) are kept; `q`/`del`/… subtrees are flattened;
 * everything else (per SKIP_ELEMENTS and unknown elements) contributes
 * nothing but does not break the traversal.
 */
function collectText(children: readonly PreservedNode[], out: string[]): void {
  for (const child of children) {
    for (const [key, value] of Object.entries(child)) {
      if (key === ':@') continue;
      if (key === '#text') {
        if (typeof value === 'string') out.push(value);
      } else if (KEEP_ELEMENTS.has(key)) {
        if (Array.isArray(value)) collectText(value as PreservedNode[], out);
      }
      // SKIP_ELEMENTS and unknown elements: dropped (empty arrays anyway).
    }
  }
}

/** Normalize whitespace: collapse runs, trim (verse text is one line). */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Parse the TEI XML and extract one book's verse lines in document order.
 * Line numbers come from the `n` attribute and are preserved exactly.
 */
export function extractBook(xml: string, book: number): TeiLine[] {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    // Keep whitespace inside text nodes: with the default (trimValues: true)
    // the space before/after an inline <q> is lost ("secum: <q>Mene" would
    // become "secum:Mene"). Whitespace is normalized per line afterwards.
    trimValues: false,
    // TEI entities (&amp; …) are rare here but handled by default.
  });
  const doc = parser.parse(xml) as PreservedNode[];

  const bookDiv = findBookDiv(doc, book);
  if (bookDiv === undefined) {
    throw new Error(`no book div with n="${book}" found in TEI`);
  }

  const lines: TeiLine[] = [];
  const children = childArray(bookDiv);
  for (const child of children) {
    for (const [tag, value] of Object.entries(child)) {
      if (tag !== 'l' || !Array.isArray(value)) continue;
      const n = attrsOf(child)['n'];
      if (n === undefined) continue; // unnumbered line — none in this file
      const parts: string[] = [];
      collectText(value as PreservedNode[], parts);
      const text = normalize(parts.join(''));
      if (text !== '') lines.push({ n: Number(n), text });
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Tree walking helpers
// ---------------------------------------------------------------------------

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

/** `TEI > text > body > div[type=edition] > div[n=book][type=textpart]`. */
function findBookDiv(doc: readonly PreservedNode[], book: number): Record<string, unknown> | undefined {
  const tei = findFirst(doc, 'TEI', () => true);
  if (tei === undefined) return undefined;
  const text = findFirst(childArray(tei), 'text', () => true);
  if (text === undefined) return undefined;
  const body = findFirst(childArray(text), 'body', () => true);
  if (body === undefined) return undefined;
  const edition = findFirst(childArray(body), 'div', (a) => a['type'] === 'edition');
  if (edition === undefined) return undefined;
  return findFirst(
    childArray(edition),
    'div',
    (a) => a['n'] === String(book) && a['type'] === 'textpart',
  );
}

/**
 * The child-node array of a preserveOrder element node. Such a node has
 * exactly one non-`:@` key — its own tag — whose value is the children
 * array (`{ div: [children…], ':@': {attrs…} }`).
 */
function childArray(node: Record<string, unknown>): PreservedNode[] {
  for (const [key, value] of Object.entries(node)) {
    if (key === ':@') continue;
    if (Array.isArray(value)) return value as PreservedNode[];
  }
  return [];
}
