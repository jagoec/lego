# texts/ — raw text sources

## vergil-aeneid.tei.xml

Vergil, *Aeneid* (all 12 books), TEI XML (EpiDoc/CTS).

- **Name:** Vergil, Aeneid (TEI XML, phi0690.phi003.perseus-lat2)
- **URL:** https://github.com/PerseusDL/canonical-latinlit/blob/master/data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml
  (raw download: https://raw.githubusercontent.com/PerseusDL/canonical-latinlit/master/data/phi0690/phi003/phi0690.phi003.perseus-lat2.xml)
- **License:** CC BY-SA 4.0 — the PerseusDL/canonical-latinlit repository
  states: "Unless otherwise indicated, all contents of this repository
  are licensed under a Creative Commons Attribution-ShareAlike 4.0
  International License." The file itself carries no separate license
  notice; the repository LICENSE (CC BY-SA 4.0) applies.
- **Edition:** J. B. Greenough, *The Bucolics, Aeneid, and Georgics of
  Virgil*, Boston: Ginn and Company, 1881 (per the TEI header); CTS urn
  `urn:cts:latinLit:phi0690.phi003.perseus-lat2`.

Only book 1 (756 lines) is used by the import pipeline. Two encoding
notes discovered while parsing:

- Lines 426 and 711 of book 1 are wrapped in `<del>` (transposition
  marks). Their content appears nowhere else in the file and is
  canonical Aeneid text ("iura magistratusque legunt…", "pallamque et
  pictum…"), so the parser **keeps** `<del>` text. In other books the
  same marking guards true duplicates (e.g. book 2 l. 76 is the same
  verse as l. 612).
- Speech is marked with inline `<q>` / `<q rend="merge">` elements whose
  text belongs to the verse line; punctuation may sit between quotes
  (l. 754: `<q>insidias</q>, inquit, <q>Danaum, casusque tuorum,</q>`).

## vergil-aeneid-eng.tei.xml

Vergil, *Aeneid* (all 12 books), English translation by Theodore
Chickering Williams, TEI XML (EpiDoc/CTS, `phi0690.phi003.perseus-eng2`).

- **Name:** Vergil, *The Aeneid of Virgil*, trans. T. C. Williams
  (TEI XML, phi0690.phi003.perseus-eng2)
- **URL:** https://github.com/PerseusDL/canonical-latinlit/blob/master/data/phi0690/phi003/phi0690.phi003.perseus-eng2.xml
  (raw download: https://raw.githubusercontent.com/PerseusDL/canonical-latinlit/master/data/phi0690/phi003/phi0690.phi003.perseus-eng2.xml)
- **License:** CC BY-SA 4.0 — same repository license as the Latin TEI
  (PerseusDL/canonical-latinLit, "Unless otherwise indicated, all
  contents of this repository are licensed under a Creative Commons
  Attribution-ShareAlike 4.0 International License."). The translation
  itself was published in 1910 (Boston: Houghton Mifflin) and is in the
  public domain.
- **Why Williams (not Fairclough):** the task's first candidate, the
  Fairclough 1916 Loeb translation, is not present in the PerseusDL
  GitHub text endpoints (Loeb translations were excluded from the
  canonical repositories over copyright status). Williams 1910 is the
  public-domain translation PerseusDL publishes *in the same repository
  and the same TEI shape* as our Latin text, and it is a deliberately
  line-tracking blank-verse translation — the most literal
  machine-readable option available. Dryden (loose) was avoided.

Encoding notes (verified against the committed file):

- Structure: `TEI > text > body > div[type=translation] > div[subtype=book,
  n=1..12] > div[subtype=card, resp=p] > l[n]`. The `<l n>` numbers are the
  TRANSLATION'S own line sequence (book 1 runs to 1066 English lines for 756
  Latin lines), NOT Latin line numbers.
- The `card` divisions, however, ARE keyed to Latin line numbers: each card
  div's `n` is the Latin line where the card begins (book 1 cards start at
  Latin lines 1, 8, 12, 34, …, 723 — the same card boundaries as the
  milestone markers in the Latin TEI). The import pipeline uses these card
  anchors plus within-card interpolation to map Latin verse lines to
  English line ranges for sentence-level alignment
  (see `packages/corpus/src/disambiguate/alignment.ts`).
- Inline elements (`placeName`, `rs`, …) occur inside `<l>`; their text is
  part of the line.

## treebank-aeneid6.xml

AGLDT v2.1 (Ancient Greek and Latin Dependency Treebank) gold annotation
of **Aeneid book 6, lines 1–295**: word-level morphology (`postag`) and
dependency relations, 177 sentences / 2839 words.

- **Name:** Vergil, Aeneid 6.1–295 (AGLDT v2.1 treebank,
  phi0690.phi003.perseus-lat1.tb.xml)
- **URL:** https://github.com/PerseusDL/treebank_data/blob/master/v2.1/Latin/texts/phi0690.phi003.perseus-lat1.tb.xml
  (raw download: https://raw.githubusercontent.com/PerseusDL/treebank_data/master/v2.1/Latin/texts/phi0690.phi003.perseus-lat1.tb.xml)
- **License:** CC BY-SA 3.0 — the PerseusDL/treebank_data repository
  states: "Contents of this repository are licensed under a Creative
  Commons Attribution-ShareAlike 3.0 United States License. All materials
  in the AGLDT to which third-parties do not hold copyright are copyright
  of The Perseus Digital Library, Tufts University."
- **Note on coverage:** the task called for Aeneid 6.1–336; the actual
  AGLDT v2.1 coverage of the Aeneid is **6.1–295** (the `biblScope` of
  the file is "Aeneis 6, 1-295"). The eval harness therefore evaluates
  over lines 6.1–295.
- Encoding notes: enclitics are separate words with `form="-que"` etc.
  (mirroring our tokenizer's enclitic splits); punctuation is annotated
  with `postag="u--------"`; the `postag` string is 9 slots
  (pos person number tense mood voice gender case degree — see
  `v2.1/Latin/TAGSET.txt` in the treebank repo, mapped in
  `packages/corpus/src/eval/treebank.ts`).

## cache/analyses.json

On-disk morpheus cache written by `pnpm import`: form → raw
Perseus-format response body (empty string = morpheus does not know the
form). It is **committed** so re-runs are offline, deterministic and
reviewable, and so the generated corpus JSON can be reproduced exactly.
Delete it to force a full re-query against the morpheus container.
