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

## cache/analyses.json

On-disk morpheus cache written by `pnpm import`: form → raw
Perseus-format response body (empty string = morpheus does not know the
form). It is **committed** so re-runs are offline, deterministic and
reviewable, and so the generated corpus JSON can be reproduced exactly.
Delete it to force a full re-query against the morpheus container.
