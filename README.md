<p align="center">
  <img src="assets/logo.svg" width="72" height="72" alt="LifePrint logo">
</p>

<h1 align="center">LifePrint</h1>

<p align="center"><em>Answer questions. Get a printable, source-cited lifestyle book that is actually yours.</em></p>

<p align="center">
  <strong>Live demo:</strong> <a href="https://&lt;user&gt;.github.io/lifeprint/">https://&lt;user&gt;.github.io/lifeprint/</a><br>
  <sub>No build step · no backend · no API keys · nothing leaves your browser</sub>
</p>

---

> **Medical disclaimer.** LifePrint is an educational tool. It does not diagnose, treat, cure, or
> manage any medical condition, and it is not a substitute for advice from a physician, registered
> dietitian, or pharmacist. It gives no supplement doses, no medication guidance, and no
> condition-specific clinical limits. All nutrition figures are estimates. If you are pregnant, have a
> diagnosed condition, take medication, have a history of disordered eating, or have an allergy with a
> reaction history, talk to a clinician before changing how you eat. If you have urgent symptoms —
> unexplained weight loss, blood in your stool, difficulty swallowing, chest pain — seek care now, not
> a book.

## What it is

LifePrint is a 13-step wizard that turns your answers — and, optionally, text from your own lab or
sensitivity reports — into a single coherent book: a food guide, a meal plan, recipes scaled to your
household, a grocery list by aisle, batch cooking, eating out, travel, reintroduction, printable
trackers, and a clinician-review appendix. Then it exports that book as a genuinely well-typeset PDF.

Three things make it different from a diet-plan generator:

- **Every ruling is traceable.** Each food carries its status, the reason, the source type, a
  confidence level, and whether it is temporary and reintroducible. The book prints the reason.
- **Conflicts are resolved out loud.** Allergy beats clinician beats intolerance beats religious
  restriction beats report finding beats framework beats observation beats preference — eight levels,
  applied strictly. If you refuse to give up a food a framework excludes, the book says so and prints
  the tradeoff instead of quietly dropping it.
- **It refuses to overstep.** A safety screen blocks generation until you have read the flags your
  answers raised, a claim scanner rejects "cure/treat/heal/reverse" language, and 17 validation checks
  run before every export.

## Features

- **13-step wizard** with per-step validation, autosave, resume, JSON export/import, reset, and
  restorable book drafts (the three most recent)
- **21 lifestyle frameworks**, stackable, with conflict detection and explicit resolution
- **284-food library** across 13 categories and 14 grocery aisles, with aliases, allergen markers,
  substitutes, prep notes, serving sizes, and estimated calories and protein
- **27 recipes** with measured ingredients linked to the food library, steps, timings, equipment,
  storage, and batch notes
- **Document reading in-browser** — paste text, or upload `.txt`/`.md`/text-layer PDF (pdf.js). Every
  extracted finding must be confirmed, downgraded, or deleted by you before it affects anything
- **Safety framework** with urgent/stop/caution flags and a real acknowledgement gate
- **34 chapters**, individually toggleable and reorderable, at four depths (15/30/60/100+ pages)
- **Book editor** — edit any paragraph, regenerate a paragraph or a whole chapter, lock a chapter so
  rebuilds leave it alone, remove chapters, then rebuild without losing your edits
- **17 pre-export validation checks**, shown in full, pass or fail
- **PDF export in three variants** — standard, printer-friendly greyscale, and mobile — with a
  clickable table of contents, real page numbers, running headers, repeated table headers across page
  breaks, and no orphan headings
- **11 book themes** mirrored between screen and PDF
- **11 printable trackers** — meals, symptoms, digestion, energy, sleep, stress, exercise, hydration,
  reintroduction, reactions, weekly review
- Keyboard navigation, AA contrast, visible focus, reduced-motion support, print stylesheet

## Run it locally

No install, no build, no dependencies to fetch.

```bash
git clone https://github.com/<user>/lifeprint.git
cd lifeprint
python3 -m http.server 8000
# open http://localhost:8000/
```

Any static server works. Opening `index.html` directly from disk mostly works too, but ES modules are
happier over HTTP.

Two shortcuts for exploring: append `?scenario=demo` for a filled-in profile (Taylor — Mediterranean +
low-FODMAP + high-protein, 7-day plan), or `?scenario=hard` for the deliberately difficult case
(Rowan — vegan + AIP + low-FODMAP, tree-nut anaphylaxis, pregnancy, 30-day plan, 100+ pages). Add
`&step=8` to jump to a step.

## How it works

A twelve-stage deterministic pipeline, all in the tab, displayed live while it runs
(see [`docs/PIPELINE.md`](docs/PIPELINE.md)):

```
1 collect → 2 normalize foods → 3 expand allergen families → 4 apply frameworks
→ 5 resolve precedence → 6 reconcile your non-negotiables → 7 run safety screens
→ 8 build the meal rotation → 9 grocery + batch lists → 10 write chapters
→ 11 assemble the book → 12 validate
```

Same answers in, same book out — the meal-plan seed is derived from your answers, and paragraph
variants are selected by index rather than randomly.

## Privacy

There is no server. There is no account. There is no analytics.

- Your answers live in `localStorage` in your browser, and nowhere else.
- Uploaded files are read with `FileReader` and parsed locally by pdf.js. **File contents are never
  persisted** — only the file name, type, and character count are saved, so a report cannot linger in
  storage on a shared machine.
- The only network requests the app makes are for the two CDN libraries (jsPDF, pdf.js) and Google
  Fonts. No health information is included in them.
- Clearing your site data deletes everything permanently. Use **Book & data → Export answers (JSON)**
  if you want a backup, and **Reset** when you are done on a shared computer.
- `localStorage` is not encrypted. Anyone with your unlocked browser profile can read it.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder
   `/ (root)`.
3. Open `https://<user>.github.io/lifeprint/`.

The repository is already Pages-ready: `.nojekyll` is committed, every asset path is relative, and
there is no build step or server dependency, so it works from a project subpath unchanged.

## The sample book, page by page

`lifeprint-sample-book.pdf` is generated from the demo profile: **75 pages**, 32 chapters, standard
variant, `modern-wellness` theme, 7-day plan.

| Pages | Content |
| --- | --- |
| 1 | Cover — title, subtitle, prepared-for name, theme treatment, generation date |
| 2 | "Read this first" — plain-language disclaimer and where the book stops |
| 3 | How to use this book — the four statuses, and which chapters you will actually live in |
| 4 | Clickable contents with leader dots and real page numbers (32 entries) |
| 5–9 | Welcome, your profile at a glance, your goals ranked, your lifestyle framework |
| 10–17 | Master food guide — every relevant food with status, reason, source, and portion note |
| 18–24 | "Can I eat this?" index — alphabetical, with status, reason, and whether it can return |
| 25–28 | Why these recommendations — the rules that produced each ruling, and reconciliations |
| 28–31 | Your sensitivities and findings, then the reintroduction protocol with 72-hour windows |
| 32–34 | Meal plan — every day, every slot, with estimated calories and protein |
| 35–42 | Recipes — measured ingredients, steps, equipment, storage, batch notes |
| 43–51 | Grocery guide by aisle, store notes, pantry/fridge/freezer checklists, batch schedule |
| 52–56 | Restaurant and takeout guide, travel and fallback meals, hydration, beverages |
| 56–62 | Supplement overview (categories only), fitness, recovery, sleep, stress, routines, schedules |
| 63–73 | Printable trackers (11 forms), progress journal, goal review, symptom association map |
| 74–75 | Review with your clinician, then the source and citation index |

The hard-case profile (`?scenario=hard`) produces a **103-page** book from the same engine.

Every page after the cover carries a running header (chapter, book title) and a footer reading
"Educational guidance — not medical advice" with `Page N of T`.

## Docs

| Doc | Contents |
| --- | --- |
| [`docs/PRD.md`](docs/PRD.md) | Problem, users, scope, requirements, product decisions |
| [`docs/USER-FLOW.md`](docs/USER-FLOW.md) | Flow diagram, step table, failure paths |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | `localStorage` shape, seed data, 23-table mapping, invariants |
| [`docs/schema.sql`](docs/schema.sql) | PostgreSQL migration for a future server version |
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | The 12 stages, the 8 precedence levels, determinism |
| [`docs/SAFETY.md`](docs/SAFETY.md) | Flags, content limits, banned claims, the 17 checks |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Tokens, type scale, components, the 11 themes, PDF rules |
| [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md) | Definition of done, build order, tradeoffs, what was cut |
| [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) | Honest limitations — read this one |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Planned work, roles, and tiers (nothing is gated today) |

## Project structure

```
index.html            single page; the app mounts here
assets/               logo.svg, favicon.svg
css/                  base.css (tokens) · app.css (components) · themes.css (11 book themes)
js/
  main.js             shell, rail, router, menu
  state.js            state, persistence, migration, per-step validation
  pipeline.js         the 12-stage definition
  steps/              step0-welcome.js … step12-export.js
  engine/             foods · protocols · recipes · rules · conflicts · safety
                      mealplan · routines · book · validate
  parse/extract.js    heuristic report extraction
  pdf/export.js       jsPDF renderer, themes, three variants
  ui/                 dom.js (component kit) · blocks.js (block → DOM)
docs/                 product documentation + schema.sql
samples/              sample food-sensitivity report for testing extraction
```

## Known limitations

Curated seed data rather than an exhaustive database; heuristic extraction with no OCR (text-layer
PDFs only); estimates rather than computed nutrition; no accounts, server, or sync; browser-local
unencrypted storage; deterministic templated prose rather than generative writing. The full list is in
[`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — it is worth reading before you rely on the output.

## Roadmap

Phase-aware frameworks, a much larger food and recipe library, in-app trackers with reintroduction
follow-through, better lab-report parsing, and optional end-to-end-encrypted sync. See
[`docs/ROADMAP.md`](docs/ROADMAP.md). Nothing in the shipped app is gated or limited.

## License

MIT — see [`LICENSE`](LICENSE).
