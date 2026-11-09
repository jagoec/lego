import { useState } from 'react';

/**
 * Level 4 affordance: English is only ever shown through this explicit
 * per-word click. Gloss data does not exist in the contract yet, so the
 * revealed state is an honest placeholder rather than invented content.
 */
export function GlossReveal() {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <span className="gloss gloss--unavailable">gloss unavailable — not yet in the corpus</span>;
  }
  return (
    <span className="gloss">
      <button type="button" className="gloss__reveal" onClick={() => setRevealed(true)}>
        Reveal English gloss
      </button>
    </span>
  );
}
