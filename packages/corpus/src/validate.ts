/**
 * Structural validation of a generated `Passage` against the data
 * contract (`packages/shared/src/types.ts`) plus this pipeline's
 * invariants. Returns a list of human-readable problems — empty means
 * valid. Used by the CLI (import fails loudly on any error) and by a
 * vitest test that asserts the committed corpus JSON conforms.
 */
import type { Passage } from '@lego/shared';

export interface ValidationOptions {
  /** highest legal verse line number (Aeneid 1: 756) */
  maxLine: number;
  /** analysis-map keys that may exist without being any token's form */
  allowedExtraAnalyses?: readonly string[];
}

export function validatePassage(passage: Passage, options: ValidationOptions): string[] {
  const errors: string[] = [];
  const { maxLine } = options;
  const allowedExtra = new Set(options.allowedExtraAnalyses ?? []);

  if (passage.work === '') errors.push('passage.work is empty');
  if (passage.title === '') errors.push('passage.title is empty');
  if (!Number.isInteger(passage.book) || passage.book < 1) errors.push(`passage.book is ${passage.book}`);
  if (passage.source.name === '') errors.push('passage.source.name is empty');
  if (passage.source.url === '') errors.push('passage.source.url is empty');
  if (passage.source.license === '') errors.push('passage.source.license is empty');
  if (passage.sentences.length === 0) errors.push('passage has no sentences');

  const usedForms = new Set<string>();

  passage.sentences.forEach((sentence, position) => {
    const where = `sentence[${position}]`;
    if (sentence.index !== position) errors.push(`${where}: index is ${sentence.index}, expected ${position}`);
    if (sentence.tokens.length === 0) errors.push(`${where}: no tokens`);

    sentence.tokens.forEach((token, tokenPosition) => {
      const at = `${where}.tokens[${tokenPosition}]`;
      if (token.index !== tokenPosition) errors.push(`${at}: index is ${token.index}, expected ${tokenPosition}`);
      if (!/^[A-Za-z]+$/.test(token.text)) errors.push(`${at}: text "${token.text}" is not a bare word`);
      if (!/^[A-Za-z]+$/.test(token.form)) errors.push(`${at}: form "${token.form}" is not a bare word`);
      if (token.line < 1 || token.line > maxLine) errors.push(`${at}: line ${token.line} out of range 1..${maxLine}`);
      usedForms.add(token.form);
    });

    if (sentence.tokens.length > 0) {
      const lines = sentence.tokens.map((token) => token.line);
      const lineStart = Math.min(...lines);
      const lineEnd = Math.max(...lines);
      if (sentence.lineStart !== lineStart) {
        errors.push(`${where}: lineStart is ${sentence.lineStart}, expected ${lineStart}`);
      }
      if (sentence.lineEnd !== lineEnd) {
        errors.push(`${where}: lineEnd is ${sentence.lineEnd}, expected ${lineEnd}`);
      }
    }

    const tokenCount = sentence.tokens.length;
    sentence.groups.forEach((group, groupPosition) => {
      const at = `${where}.groups[${groupPosition}]`;
      if (group.kind !== 'agreement' && group.kind !== 'subject-verb' && group.kind !== 'manual') {
        errors.push(`${at}: unknown kind "${group.kind}"`);
      }
      if (group.tokenIndices.length < 2) errors.push(`${at}: fewer than 2 tokenIndices`);
      const seen = new Set<number>();
      for (const index of group.tokenIndices) {
        if (index < 0 || index >= tokenCount) errors.push(`${at}: tokenIndex ${index} out of range`);
        if (seen.has(index)) errors.push(`${at}: duplicate tokenIndex ${index}`);
        seen.add(index);
      }
    });

    // order: chunks cover every token exactly once, in sentence order,
    // numbered 1..n, each chunk's indices ascending.
    const covered = new Set<number>();
    sentence.order.forEach((chunk, chunkPosition) => {
      const at = `${where}.order[${chunkPosition}]`;
      if (chunk.order !== chunkPosition + 1) errors.push(`${at}: order is ${chunk.order}, expected ${chunkPosition + 1}`);
      if (chunk.tokenIndices.length === 0) errors.push(`${at}: empty chunk`);
      let previous = -1;
      for (const index of chunk.tokenIndices) {
        if (index < 0 || index >= tokenCount) {
          errors.push(`${at}: tokenIndex ${index} out of range`);
          continue;
        }
        if (index <= previous) errors.push(`${at}: tokenIndices not ascending`);
        previous = index;
        if (covered.has(index)) errors.push(`${at}: token ${index} already covered by an earlier chunk`);
        covered.add(index);
      }
    });
    for (let index = 0; index < tokenCount; index++) {
      if (!covered.has(index)) errors.push(`${where}: token ${index} is in no reading-order chunk`);
    }
  });

  // Every token's form must be analyzable via the shared map — the
  // frontend looks up analyses by token.form (empty array = flagged).
  for (const sentence of passage.sentences) {
    for (const token of sentence.tokens) {
      if (!(token.form in passage.analyses)) {
        errors.push(`analyses map is missing form "${token.form}" (token "${token.text}")`);
      }
    }
  }
  // And no orphan entries beyond the bare enclitics.
  for (const form of Object.keys(passage.analyses)) {
    if (!usedForms.has(form) && !allowedExtra.has(form)) {
      errors.push(`analyses map has an entry for "${form}" but no token uses that form`);
    }
  }

  return errors;
}
