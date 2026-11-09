# fixtures/

Development fixtures for the web UI, used until the corpus import pipeline
generates `public/corpus/aeneid-1.json`.

## mock-passage.json

Aeneid 1.1–2, hand-modeled to exercise the whole data contract:

- **slash group** — `arma` (`neut nom/voc/acc pl`), `fato` (`neut dat/abl sg`)
- **ambiguous forms** — `cano` (verb + adjective), `troiae` (sg + pl parses)
- **enclitic splits** — `virumque` → `virum` + `-que`, `laviniaque` → `lavinia` + `-que`
- **agreement groups** — `qui ↔ primus`, `lavinia ↔ litora`
- **subject-verb group** — `venit ↔ litora` (neuter-plural subject, singular verb)
- **sentence spanning two verse lines** — sentence 2 runs lines 1–2
- **reading-order chunks** — subject / phrase / object / verb units per sentence

`profugus` deliberately has an **empty analyses list** to exercise the
"no analysis available" UI state; the real corpus may or may not parse it.
