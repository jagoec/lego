# lego

*lego* (Latin: "I read") — a friendly interface for reading classical Latin text.

Read a passage (currently Vergil, **Aeneid Book 1**), hover any word to see its
morphology — case, declension, tense, mood, and more — at a selectable
assistance level that never gives away the English translation unless you ask.
Words that belong together (adjective↔noun agreement, subject↔verb) highlight
together, and sentences can be displayed in reading order.

Powered by [perseids-tools/morpheus](https://github.com/perseids-tools/morpheus)
via [morpheus-api](https://github.com/perseids-tools/morpheus-api).

## Layout

| Path | Purpose |
|---|---|
| `docker-compose.yml` | Morpheus morphological analysis service (port 1315) |
| `packages/shared` | Data contract + Perseus-format output parser |
| `packages/api` | Fastify wrapper: clean JSON morphology endpoint (port 8787) |
| `packages/corpus` | Import pipeline: TEI XML → tokens → precomputed analyses |
| `packages/web` | React + Vite reader UI |
| `texts/` | Raw TEI text sources |

## Getting started

```sh
pnpm install
pnpm morpheus:up          # start the morpheus container
pnpm import               # build the corpus JSON (Aeneid 1) from TEI
pnpm dev                  # api (:8787) + web (:5173)
```

## Assistance levels

| Level | Reveals |
|---|---|
| 1 | Part of speech only ("noun", "verb", …) |
| 2 | Full morphology + lemma (case/number/gender, tense/mood/voice/person) |
| 3 | Principal parts / declension pattern — still no English |
| 4 | Click-to-reveal English gloss (never shown unrequested) |
