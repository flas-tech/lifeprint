# LifePrint — MVP Plan

The MVP is what shipped in this repository: a complete, static, browser-only product with no
accounts, no server, and no build step. This document records what "done" meant, the order the work
was executed in, and the tradeoffs taken to get there.

## Definition of done for the MVP

1. Thirteen wizard steps, all fields from the spec, validation and autosave.
2. A real personalization engine: 284 foods, 21 frameworks, 27 recipes, 8-level precedence,
   explicit reconciliation.
3. A safety gate that genuinely blocks generation.
4. A 34-chapter book model with depth scaling from 15 to 100+ pages.
5. An editor that can change the book without rebuilding it from scratch.
6. Seventeen validation checks surfaced before export.
7. A PDF that a person would actually print: clickable TOC with true page numbers, running headers,
   page numbers, repeated table headers, no orphans, three variants.
8. Docs, sample data, MIT licence, GitHub Pages-ready.

## Build order (as executed)

| Phase | Work | Why this order |
| --- | --- | --- |
| 1 | Tokens, base CSS, shell, router, state + persistence | Everything else renders through the shell and mutates one state object |
| 2 | `dom.js` component kit | Steps are then assembly, not bespoke markup |
| 3 | Seed data: foods, protocols, recipes | The engine is meaningless without real data; generated with a script and hand-audited |
| 4 | Steps 0–4 (profile, goals, frameworks, food) | The engine's inputs |
| 5 | Engine: rules, conflicts, safety | The core value; built before any output surface |
| 6 | Steps 5–7 (documents, findings, health) + `parse/extract.js` | Optional path, built after the required path worked end to end |
| 7 | Meal plan, routines, book builder | Output generation |
| 8 | Steps 8–9 (book prefs, safety review) | Gate wired into `validateStep` |
| 9 | `pipeline.js` + step 10 | Extracted to break a circular import between state and book |
| 10 | `blocks.js` + step 11 editor | Shared block model means editor and PDF cannot drift |
| 11 | `validate.js` + step 12 | Validation needed the finished book model |
| 12 | `pdf/export.js` | Hardest surface; needed a stable block model first |
| 13 | Playwright QA harness, iteration, docs | Ongoing, then final |

## Tradeoffs taken deliberately

| Decision | Instead of | Why |
| --- | --- | --- |
| Single mutable state object with `patch(mutator)` | A store library or reducers | No build step; the app is a wizard, not a graph of independent subscriptions |
| Full re-render per step | Fine-grained DOM diffing | Screens are small; correctness beats micro-optimisation, and it eliminates a class of stale-DOM bugs |
| Seed data as ES modules | JSON fetched at runtime | Works from `file://` and any subpath, no fetch failures, no CORS surprises |
| Heuristic text extraction with mandatory confirmation | Ambitious parsing | Honest about accuracy and keeps the user in control |
| jsPDF hand-laid-out | HTML-to-PDF | Real control over pagination, orphans, repeated table headers, and TOC page numbers |
| Three fixed PDF variants | A print settings panel | Covers the real cases (screen, ink-saving, phone) without a settings maze |
| Document text discarded after extraction | Persisting it for re-parsing | Shared machines; a report should not survive in `localStorage` |

## What was cut from the MVP and why

- **OCR of scanned reports.** Would require a multi-megabyte WASM dependency and still be unreliable;
  manual entry covers the case honestly.
- **Accounts and sync.** Adds a server, which removes the strongest privacy claim the product has.
- **Store inventory and restaurant data.** No trustworthy free source; guessing would be a safety
  problem, so the book teaches label reading and question-asking instead.
- **Cover image generation.** Themes carry the visual identity; a generated cover would need an image
  pipeline the static build cannot have.

## Testing approach

- `.qa/screens.mjs` — every step at 1280×900 and 375×812 for both seeded scenarios, failing on any
  console error, page error, or horizontal overflow.
- `.qa/e2e.mjs` — two full wizard runs (demo and hard case) including edits, regeneration, validation,
  and all three PDF downloads.
- `.qa/gate.mjs` — asserts the safety gate cannot be bypassed.
- `check_pdf.py` — footers, page numbering, TOC targets, link annotations, and orphan-heading
  candidates in the produced PDFs; page images rendered and inspected visually.
