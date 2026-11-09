/**
 * Clause segmentation and chunk roles (Task B — deterministic heuristics,
 * overridable later, same philosophy as order.ts / groups.ts).
 *
 * Each sentence gets `Sentence.clauses`: a main clause (id 0, kind
 * 'main') plus subordinate clauses in order of appearance (ids 1..n).
 * Every token belongs to EXACTLY ONE clause; clauses may interleave (a
 * relative clause interrupting its main clause) — membership is what
 * matters, spans are not contiguous.
 *
 * ## Subordinate clause triggers (scanned left to right)
 *
 * - **relative** (kind 'relative'): a token with a `relative`-stem
 *   pronoun analysis (qui/quae/quod/cui/cuius/quo — morpheus stem
 *   `relative`). Precedence over the conjunction reading of `quod`.
 *   Absorbs up to the next verb anchor (inclusive) or sentence end.
 * - **subordinating conjunction** (kind 'adverbial' or 'completive'):
 *   a token whose form is in {@link SUBORDINATING_CONJUNCTIONS} (ut, cum,
 *   dum, si, quando, quod, quamquam, quamvis, quoniam, ubi, postquam,
 *   antequam, priusquam, donec, quotiens, quasi, nisi, ne). The clause
 *   absorbs up to the next verb anchor; its kind is decided there:
 *   `ut` + a purely subjunctive anchor → 'completive', `ut` + an
 *   indicative anchor → 'adverbial', `ut` with no anchor → no clause
 *   (morpheus reads ut also as a plain adverb). `ne` opens a clause
 *   ONLY with a subjunctive anchor (purposive ne is always subjunctive;
 *   "ne … quidem" rides on an indicative main verb and must not open
 *   one). The other conjunctions absorb to sentence end when no anchor
 *   follows.
 * - **ablative absolute** (kind 'participial'): frequent in Vergil — a
 *   participle with an ablative parse preceded (within
 *   {@link ABL_ABS_WINDOW} tokens, no verb anchor between) by a
 *   noun/pronoun/name with an ablative parse. The clause spans that
 *   noun through the participle. ("plain participial phrases when
 *   confident" are left for a later pass — ablative absolutes are the
 *   confident shape.)
 * - **accusative + infinitive** (kind 'completive'): an infinitive whose
 *   nearest preceding token within {@link ACI_WINDOW} is an
 *   accusative-capable nominal (or participle), with no verb anchor
 *   between them and a matrix verb anchor earlier in the sentence —
 *   the verba sentiendi/declarandi frame. Best effort; skipped when
 *   unsure.
 *
 * ## Coordination (documented rule)
 *
 * A verb anchor coordinated with the previous verb anchor by `et` /
 * `-que` / `at(que)` / `ac` (its own enclitic, or a coordinating token
 * immediately before it) JOINS the previous anchor's clause, extending
 * that clause's span through itself. A coordinated verb in the main
 * clause therefore stays in the main clause — the heuristic never emits
 * kind 'coordinated' (it is reserved for manual overrides); two
 * coordinated main verbs share the main clause by design.
 *
 * ## Overlap resolution
 *
 * Clauses nest (a relative clause inside a dum-clause). A token belongs
 * to the innermost clause containing it: among all spans covering the
 * token, the one with the latest start wins (ties: the smaller end).
 * Tokens covered by no span belong to the main clause.
 *
 * ## Chunk upgrade
 *
 * The v1 reading-order chunks are SPLIT at clause boundaries so every
 * chunk lies wholly inside one clause, then renumbered 1..n. A piece
 * keeps its label only when it still earns it: conjunction/phrase
 * labels stay with the piece containing the trigger token, and a
 * 'subject' label is re-verified (the piece itself must contain an
 * unambiguous nominative nominal). Roles are assigned to MAIN-clause
 * chunks only — 'verb' for verb-anchor chunks, 'subject' for confident
 * nominative chunks, 'predicate' for the rest; subordinate-clause
 * chunks carry `clauseId` but no role (the frontend colors whole
 * clauses).
 */
import type { Chunk, Clause, ClauseKind, MorpheusAnalysis, Token } from '@lego/shared';
import { hasFiniteVerbRole, isFiniteAnalysis } from './groups.js';
import type { AnalysisMap } from './groups.js';
import { isUnambiguousNominative } from './order.js';

/** Subordinating conjunctions that start an adverbial/completive clause. */
export const SUBORDINATING_CONJUNCTIONS: ReadonlySet<string> = new Set([
  'ut', 'cum', 'dum', 'si', 'quando', 'quod', 'quamquam', 'quamvis', 'quoniam',
  'ubi', 'postquam', 'antequam', 'priusquam', 'donec', 'quotiens', 'quasi', 'nisi', 'ne',
]);

/** Conjunctions whose clause kind depends on the mood of their verb (see doc). */
const MOOD_DEPENDENT: ReadonlySet<string> = new Set(['ut', 'ne']);

/** How far back an ablative absolute's noun may sit from its participle. */
export const ABL_ABS_WINDOW = 3;

/** How far back an AcI's accusative subject may sit from its infinitive. */
export const ACI_WINDOW = 5;

/** Tokens that coordinate a verb with the previous verb. */
const COORDINATORS: ReadonlySet<string> = new Set(['et', 'at', 'atque', 'ac']);

interface ClauseSpan {
  start: number;
  end: number;
  kind: ClauseKind;
}

function analysesOf(analyses: AnalysisMap, token: Token): MorpheusAnalysis[] {
  return analyses[token.form] ?? [];
}

function isNominal(parse: MorpheusAnalysis): boolean {
  return parse.pos === 'noun' || parse.pos === 'pronoun' || parse.pos === 'name';
}

function isParticiple(parse: MorpheusAnalysis): boolean {
  return parse.pos === 'verb' && parse.mood === 'part';
}

function isInfinitive(parse: MorpheusAnalysis): boolean {
  return parse.pos === 'verb' && parse.mood === 'inf';
}

/** A nominal (or participle, the AcI "future participle subject" shape) with a given case. */
function caseCapable(
  analyses: readonly MorpheusAnalysis[],
  filter: (parse: MorpheusAnalysis) => boolean,
  c: 'abl' | 'acc',
): boolean {
  return analyses.some((parse) => filter(parse) && parse.cases?.includes(c));
}

/** Whether every finite parse at a verb anchor is subjunctive. */
function purelySubjunctive(analyses: readonly MorpheusAnalysis[]): boolean {
  const finite = analyses.filter(isFiniteAnalysis);
  return finite.length > 0 && finite.every((parse) => parse.mood === 'subj');
}

/**
 * Detect the subordinate clause spans of one sentence. See the module
 * doc for the trigger rules; spans may overlap (nesting).
 */
export function detectClauseSpans(
  tokens: readonly Token[],
  analyses: AnalysisMap,
): ClauseSpan[] {
  const anchors: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token !== undefined && hasFiniteVerbRole(analysesOf(analyses, token))) anchors.push(i);
  }
  const isAnchor = (index: number): boolean => anchors.includes(index);
  const nextAnchor = (from: number): number | undefined =>
    anchors.find((a) => a > from);

  const spans: ClauseSpan[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const tokenAnalyses = analysesOf(analyses, token);
    const form = token.form.toLowerCase();

    // relative pronoun (stem `relative`) — checked before the conjunction
    // reading of quod
    if (tokenAnalyses.some((parse) => parse.stem === 'relative')) {
      const end = nextAnchor(i) ?? tokens.length - 1;
      spans.push({ start: i, end, kind: 'relative' });
      continue;
    }

    // subordinating conjunction (form list — morpheus reads ut as adverb)
    if (SUBORDINATING_CONJUNCTIONS.has(form) && tokenAnalyses.some((parse) => parse.pos !== 'verb')) {
      const anchor = nextAnchor(i);
      if (anchor === undefined && MOOD_DEPENDENT.has(form)) continue; // no verb to close it
      const end = anchor ?? tokens.length - 1;
      const anchorAnalyses = analysesOf(analyses, tokens[end]!);
      if (form === 'ne') {
        // purposive ne is always subjunctive; "ne … quidem" and friends ride
        // on an indicative main verb and must NOT open a clause
        if (anchor === undefined || !purelySubjunctive(anchorAnalyses)) continue;
        spans.push({ start: i, end, kind: 'completive' });
        continue;
      }
      const kind: ClauseKind =
        MOOD_DEPENDENT.has(form) && purelySubjunctive(anchorAnalyses) ? 'completive' : 'adverbial';
      spans.push({ start: i, end, kind });
      continue;
    }

    // ablative absolute: ablative participle + preceding ablative nominal
    if (tokenAnalyses.some((parse) => isParticiple(parse) && parse.cases?.includes('abl'))) {
      for (let j = i - 1; j >= i - ABL_ABS_WINDOW && j >= 0; j--) {
        if (isAnchor(j)) break; // a verb between noun and participle blocks it
        const other = tokens[j]!;
        if (caseCapable(analysesOf(analyses, other), isNominal, 'abl')) {
          spans.push({ start: j, end: i, kind: 'participial' });
          break;
        }
      }
      continue;
    }

    // accusative + infinitive (verba sentiendi/declarandi frame, best effort)
    if (tokenAnalyses.some(isInfinitive)) {
      for (let j = i - 1; j >= i - ACI_WINDOW && j >= 0; j--) {
        if (isAnchor(j)) break; // the matrix verb ends the search window
        const other = tokens[j]!;
        if (caseCapable(analysesOf(analyses, other), (p) => isNominal(p) || isParticiple(p), 'acc')) {
          const matrixVerbBefore = anchors.some((a) => a < j);
          if (matrixVerbBefore) spans.push({ start: j, end: i, kind: 'completive' });
          break;
        }
      }
    }
  }

  // Coordination: a verb anchor linked by et/-que/at(que)/ac to the
  // previous anchor joins that anchor's clause (extending its span).
  for (let k = 1; k < anchors.length; k++) {
    const v = anchors[k]!;
    const verb = tokens[v]!;
    const previous = tokens[anchors[k - 1]!];
    if (previous === undefined) continue;
    const before = v > 0 ? tokens[v - 1] : undefined;
    const coordinated =
      verb.enclitics?.includes('que') === true ||
      before !== undefined &&
        (COORDINATORS.has(before.form.toLowerCase()) ||
          before.enclitics?.includes('que') === true);
    if (!coordinated) continue;
    const span = spans.find((span) => span.end === anchors[k - 1]);
    if (span !== undefined) span.end = v;
  }

  return spans;
}

/** Assign each token index to its clause id (0 = main, subordinates 1..n by appearance). */
function assignClauses(
  tokenCount: number,
  spans: readonly ClauseSpan[],
): { clauseOf: number[]; clauses: Clause[] } {
  // sort spans by start (then end) for stable appearance-order ids
  const ordered = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const clauseOf: number[] = new Array<number>(tokenCount).fill(0);

  // per token: the innermost covering span (latest start, then smaller end)
  const spanIds = new Map<ClauseSpan, number>();
  for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex++) {
    let best: ClauseSpan | undefined;
    for (const span of ordered) {
      if (tokenIndex < span.start || tokenIndex > span.end) continue;
      if (
        best === undefined ||
        span.start > best.start ||
        (span.start === best.start && span.end < best.end)
      ) {
        best = span;
      }
    }
    if (best === undefined) continue;
    if (!spanIds.has(best)) spanIds.set(best, spanIds.size + 1);
    clauseOf[tokenIndex] = spanIds.get(best)!;
  }

  const clauses: Clause[] = [
    { id: 0, kind: 'main', tokenIndices: [] },
    ...[...spanIds.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([span, id]) => ({ id, kind: span.kind, tokenIndices: [] as number[] })),
  ];
  for (let i = 0; i < tokenCount; i++) {
    clauses[clauseOf[i]!]?.tokenIndices.push(i);
  }
  // drop spans that ended up with no tokens (fully shadowed) and renumber
  const kept = clauses.filter((clause) => clause.id === 0 || clause.tokenIndices.length > 0);
  if (kept.length !== clauses.length) {
    let next = 1;
    for (const clause of kept) {
      if (clause.id === 0) continue;
      clause.id = next++;
    }
    // recompute the per-token map after renumbering
    for (let i = 0; i < tokenCount; i++) {
      clauseOf[i] = 0;
    }
    for (const clause of kept) {
      for (const index of clause.tokenIndices) clauseOf[index] = clause.id;
    }
  }
  return { clauseOf, clauses: kept };
}

/**
 * Build the clause structure and the upgraded chunk list of one
 * sentence: v1 chunks split at clause boundaries, every chunk carrying
 * `clauseId`, main-clause chunks carrying roles. See the module doc.
 */
export function buildClauses(
  tokens: readonly Token[],
  analyses: AnalysisMap,
  order: readonly Chunk[],
): { clauses: Clause[]; order: Chunk[] } {
  const spans = detectClauseSpans(tokens, analyses);
  const { clauseOf, clauses } = assignClauses(tokens.length, spans);

  // split chunks at clause boundaries, re-deriving labels
  const pieces: { label?: string; clauseId: number; tokenIndices: number[] }[] = [];
  for (const chunk of order) {
    const triggerIndex = chunk.tokenIndices[0];
    let currentClause: number | undefined;
    let current: number[] = [];
    for (const index of chunk.tokenIndices) {
      const clauseId = clauseOf[index] ?? 0;
      if (currentClause === undefined || clauseId !== currentClause) {
        if (current.length > 0) {
          pieces.push({ label: deriveLabel(chunk, triggerIndex, current, analyses, tokens), clauseId: currentClause ?? 0, tokenIndices: current });
        }
        currentClause = clauseId;
        current = [];
      }
      current.push(index);
    }
    if (current.length > 0) {
      pieces.push({
        label: deriveLabel(chunk, triggerIndex, current, analyses, tokens),
        clauseId: currentClause ?? 0,
        tokenIndices: current,
      });
    }
  }

  const upgraded: Chunk[] = pieces.map((piece, i) => {
    const chunk: Chunk = { order: i + 1, tokenIndices: piece.tokenIndices, clauseId: piece.clauseId };
    if (piece.label !== undefined) chunk.label = piece.label;
    // roles: main-clause chunks only
    if (piece.clauseId === 0) {
      if (piece.label === 'verb') chunk.role = 'verb';
      else if (piece.label === 'subject') chunk.role = 'subject';
      else chunk.role = 'predicate';
    }
    return chunk;
  });

  return { clauses, order: upgraded };
}

/**
 * The label a split-off piece keeps from its parent chunk: trigger
 * labels (conjunction / phrase) stay with the piece containing the
 * trigger token; a 'subject' label is re-verified against the piece.
 */
function deriveLabel(
  chunk: Chunk,
  triggerIndex: number | undefined,
  piece: readonly number[],
  analyses: AnalysisMap,
  tokens: readonly Token[],
): string | undefined {
  if (chunk.label === 'verb') return 'verb'; // single-token chunks never split
  if (chunk.label === undefined) return undefined;
  const containsTrigger = triggerIndex !== undefined && piece.includes(triggerIndex);
  if (chunk.label === 'subject') {
    return piece.some((index) =>
      isUnambiguousNominative(analysesOf(analyses, tokens[index]!)),
    )
      ? 'subject'
      : undefined;
  }
  return containsTrigger ? chunk.label : undefined;
}
