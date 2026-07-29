# LifePrint — Generation Pipeline

Twelve stages, all synchronous, all deterministic. Same answers in, same book out. The stage list
lives in `js/pipeline.js` and is displayed live on step 10 with per-stage timings, so the user can see
exactly what ran.

```mermaid
flowchart LR
  S1[1 collect] --> S2[2 normalize] --> S3[3 expand] --> S4[4 protocols]
  S4 --> S5[5 precedence] --> S6[6 reconcile] --> S7[7 safety] --> S8[8 plan]
  S8 --> S9[9 grocery] --> S10[10 chapters] --> S11[11 assemble] --> S12[12 validate]
```

| # | Stage | Module | What it does |
| --- | --- | --- | --- |
| 1 | Collecting your answers | `state.js` | Reads the persisted state; no network, no defaults invented silently |
| 2 | Normalizing foods | `foods.js` | Matches free text to the 284-food library by name, alias, and fuzzy contains; unmatched text is kept verbatim rather than dropped |
| 3 | Expanding allergen families | `rules.js` | A tree-nut allergy expands to every tree-nut food and marks cross-contact language; the same for gluten, dairy, shellfish, soy, egg, sesame |
| 4 | Applying framework rulesets | `protocols.js` | Combines the stacked frameworks per food (`yes` / `limit` / `no`), most restrictive wins |
| 5 | Resolving precedence | `rules.js` | Applies the 8-level order below; every ruling records which level produced it |
| 6 | Reconciling overrides | `rules.js` | Handles "I will not give this up" foods explicitly, and records the reconciliation text |
| 7 | Running safety screens | `safety.js` | Produces urgent / stop / caution flags; acknowledgement state is read here |
| 8 | Building the meal rotation | `mealplan.js` | Seeded rotation over compliant recipes and component plates; respects meals per day, time per meal, equipment, dislikes |
| 9 | Grocery and batch lists | `mealplan.js` | Aisle-grouped quantities, staples, batch schedule, restaurant guide |
| 10 | Writing chapters | `book.js` | Builds the block model for each enabled chapter at the selected depth |
| 11 | Assembling the book | `book.js` | Applies user edits and regeneration variants, honours locked chapters, orders chapters, computes stats |
| 12 | Validating | `validate.js` | 17 checks; results are attached to the book and shown before export |

## Precedence — the eight levels

Level 1 always wins. A lower level never overrides a higher one; when they disagree, the loser is
recorded in the ruling's reason so the book can explain it.

| Level | Source | Effect |
| --- | --- | --- |
| 1 | Medical allergy | Permanent hard exclusion, whole allergen family, cross-contact guidance |
| 2 | Clinician instruction | Never overridden by any framework, preference, or craving |
| 3 | Diagnosed intolerance | Hard exclusion, family-expanded where relevant (gluten, dairy) |
| 4 | Religious or ethical restriction | Absolute exclusion, never questioned |
| 5 | Confirmed report finding | Temporary reduction, reintroducible, always cited |
| 6 | Framework exclusion | Applies for the phase the user is running |
| 7 | User-observed trigger | Reduced and tracked, never framed as a diagnosis |
| 8 | Preference and dislikes | Excluded as preference; overridable by the user's non-negotiables |

## Determinism

- The meal plan seed is derived from the answers themselves (`seedFrom` in `mealplan.js`), so
  regenerating without changing answers returns the identical plan.
- Paragraph "regenerate" increments a per-block variant counter; the variant text is selected from a
  fixed list by index, so variant 3 is always the same variant 3.
- The PDF renderer runs up to three passes: the first learns each chapter's start page, later passes
  print those numbers into the TOC. Page-number columns are right-aligned with a reserved width so
  adding digits cannot reflow a line and shift the layout.

## What each stage refuses to do

- **Stage 2** will not guess a food it cannot match. Unmatched entries stay as the user's own words.
- **Stage 4** will not average conflicting frameworks into a vague "moderation". Most restrictive wins.
- **Stage 6** will not silently drop a non-negotiable. It is kept at a smaller portion, with the
  conflict printed.
- **Stage 8** will not invent food to hit a calorie or protein number. If the surviving set cannot
  support a sane plan, it prints a shortfall callout naming the gap.
- **Stage 10** will not write a claim it cannot source. Every "why" payload carries a source type and
  a confidence level, and stage 12 fails the export if a confirmed finding lost its citation.

## Timing

On a mid-range laptop the full pipeline runs in roughly 200–600 ms for a 30-page book and under about
1.5 s for the 100-page hard case, including validation. The step 10 screen prints the measured time
per stage rather than a fake progress animation.
