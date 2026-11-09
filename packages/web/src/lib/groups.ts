import type { Group, Sentence } from '@lego/shared';

/** Groups that include the given token. */
export function groupsForToken(sentence: Sentence, tokenIndex: number): Group[] {
  return sentence.groups.filter((group) => group.tokenIndices.includes(tokenIndex));
}

/**
 * Token indices that highlight together with the given token — the union
 * of all its groups' members, minus the token itself.
 */
export function linkedTokenIndices(sentence: Sentence, tokenIndex: number): Set<number> {
  const linked = new Set<number>();
  for (const group of groupsForToken(sentence, tokenIndex)) {
    for (const index of group.tokenIndices) {
      if (index !== tokenIndex) linked.add(index);
    }
  }
  return linked;
}
