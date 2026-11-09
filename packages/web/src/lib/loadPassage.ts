import type { Passage } from '@lego/shared';
import mockPassageJson from '../fixtures/mock-passage.json';

/**
 * The bundled demo passage. The JSON literal's inferred type widens the
 * enum unions (e.g. `pos: string`), so it is asserted here; component
 * tests render it through the real UI to keep it honest.
 */
export const mockPassage = mockPassageJson as unknown as Passage;

export interface PassageLoadResult {
  passage: Passage;
  /** true when the corpus JSON was unavailable and the demo fixture is shown */
  demo: boolean;
}

const CORPUS_URL = '/corpus/aeneid-1.json';

/**
 * Load the passage: try the generated corpus JSON, and fall back to the
 * bundled mock fixture when it is missing (404), malformed, or the fetch
 * itself fails. Never throws — the reader always has something to show.
 */
export async function loadPassage(): Promise<PassageLoadResult> {
  try {
    const response = await fetch(CORPUS_URL);
    if (response.ok) {
      // Dev servers fall back to index.html for missing files — a
      // text/html body here means "no corpus yet", not a passage.
      const contentType = response.headers?.get?.('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        const data: unknown = await response.json();
        if (isPassage(data)) return { passage: data, demo: false };
      }
    }
  } catch {
    // Missing corpus (404), malformed payload, or fetch failure — use the demo.
  }
  return { passage: mockPassage, demo: true };
}

/** Minimal runtime sanity check on fetched JSON. */
export function isPassage(data: unknown): data is Passage {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<Passage>;
  return (
    typeof candidate.work === 'string' &&
    typeof candidate.book === 'number' &&
    Array.isArray(candidate.sentences) &&
    typeof candidate.analyses === 'object' &&
    candidate.analyses !== null
  );
}
