# LifePrint — Data Model

Two representations of the same model:

1. **What ships today** — a single `localStorage` object under `lifeprint.v1`, versioned and migrated
   on load (`js/state.js`).
2. **Where it goes next** — the 23 relational tables in [`schema.sql`](./schema.sql), a PostgreSQL
   migration for the future server version. Nothing in the app depends on it; it exists so the
   browser schema does not become an accidental dead end.

---

## 1. localStorage shape

```
lifeprint.v1
├── version, createdAt, updatedAt, currentStep, visited[]
├── profile        { firstName, age, sex, height*, weight*, goalWeight, occupation,
│                    activityLevel, stores[], cookingSkill, householdSize, budget,
│                    equipment[], timePerMeal, batchWindow }
├── goals          { selected[], top3[], customGoal }
├── frameworks     { selected[], customText, clinicianText, conflictChoice,
│                    acknowledgedConflicts[] }
├── food           { favProteins[], favVeg[], favFruit[], dislikes[], allergies[],
│                    intolerances[], religiousRestrictions[], restrictions[{food,category}],
│                    refuseToEliminate[], commonlyEaten[], craved[], preferredMeals[],
│                    cuisines[], mealsPerDay, snacks, coffee, alcohol, dessert, diningOut }
├── documents[]    { id, name, kind, addedAt, chars, source }
├── findings[]     { id, food, foodId, severity, sourceType, sourceReference,
│                    confidence, status, documentId }
├── health         { flags{}, urgent{} }
├── bookPrefs      { chapters[{id,on,order}], length, mealPlanDays, style, pdfVariant,
│                    title, subtitle, logoDataUrl, tone, accent, fontPair }
├── safety         { acknowledged[] }
├── export         { history[{at,variant,pages,name}], acknowledgedFailures }
├── book           { title, subtitle, forName, style, tone, generatedAt, depth,
│                    targetPages, chapters[], customChapters[], locked[], edits{},
│                    variants{}, stats{}, validation{}, data{}, stale, staleReason }
├── versions[]     { at, title, chapters, pages }
└── meta           { demoLoaded, lastExportAt, edits[] }
```

**Document contents are deliberately not stored.** Only the metadata above persists; the raw text
lives in memory for the duration of the extraction and is then discarded, so a shared machine cannot
leak a report through `localStorage`.

### Migration

`migrate(raw)` deep-merges the saved object onto a fresh `defaultState()`, so new fields appear with
defaults instead of throwing. It also repairs the chapter list when chapters are added or removed
between versions, and re-normalizes `order`. `SCHEMA_VERSION` is stamped on every save.

---

## 2. Seed data (shipped, read-only)

| Data set | Count | File | Notes |
| --- | --- | --- | --- |
| Foods | 284 | `js/engine/foods.js` | 13 categories, 14 grocery aisles, aliases, tags, 21 marker flags, per-framework rulings, substitutes, prep notes, serving, calories, protein |
| Frameworks | 21 | `js/engine/protocols.js` | exclude/limit markers, emphasis, protein floor, guidance, meal notes, supervision flag, eliminated groups |
| Recipes | 27 | `js/engine/recipes.js` | ingredients with measurements and `foodId`, steps, timings, equipment, storage, batch notes, cuisine |
| Trackers | 11 | `js/engine/routines.js` | meals, symptoms, digestion, energy, sleep, stress, exercise, hydration, reintro, reactions, weekly |
| Chapters | 34 | `js/engine/book.js` | ordered, individually toggleable, depth-aware |
| Themes | 11 | `css/themes.css` + `js/pdf/export.js` | screen and PDF definitions mirror each other |
| Validation checks | 17 | `js/engine/validate.js` | see PIPELINE.md stage 12 |

### Food record

```js
{
  id: 'almond',
  name: 'Almonds',
  category: 'nuts-seeds',
  aisle: 'Nuts & Butters',
  aliases: ['almond', 'raw almonds'],
  tags: ['tree-nut', 'plant-protein'],
  fodmap: 'high',
  markers: { treeNut: true, gluten: false, dairy: false, /* …21 markers */ },
  frameworks: { vegan: 'yes', aip: 'no', 'low-fodmap': 'no', /* …21 ids */ },
  substitutes: ['pumpkin-seed', 'sunflower-seed'],
  prepNotes: 'Toast lightly to deepen flavour; store cold to slow rancidity.',
  serving: '1 oz (23 nuts)',
  calories: 164,
  protein: 6
}
```

### Resolved ruling (produced, not stored as seed)

```js
{
  foodId: 'almond',
  status: 'Avoid',            // Eat freely | Eat in moderation | Occasional | Avoid
  reason: 'Reported anaphylaxis-level tree-nut allergy.',
  sourceType: 'Medical allergy',
  sourceReference: 'Step 4 — allergies',
  confidence: 'high',         // high | moderate | low
  temporary: false,
  reintroducible: false,
  hardExclusion: true,
  precedence: 1               // 1–8, see PIPELINE.md
}
```

---

## 3. Relational mapping (the 23 tables)

| # | Table | Maps from | Purpose |
| --- | --- | --- | --- |
| 1 | `users` | (none yet — implied by one browser) | Account identity for the server version |
| 2 | `profiles` | `profile` | One row per user: body, kitchen, stores, budget |
| 3 | `goals` | `GOALS` constant | Reference list of goals |
| 4 | `user_goals` | `goals.selected`, `goals.top3` | Selection plus rank |
| 5 | `frameworks` | `PROTOCOLS` | The 21 rulesets |
| 6 | `user_frameworks` | `frameworks.selected` + custom text | Stack, with free-text for custom/clinician entries |
| 7 | `framework_conflicts` | `conflicts.js` output + `conflictChoice` | Detected conflict and the resolution chosen |
| 8 | `foods` | `FOODS` | Food library |
| 9 | `food_aliases` | `food.aliases` | Alternate names used by the parser and search |
| 10 | `food_markers` | `food.markers` | 21 boolean/enum markers per food |
| 11 | `food_framework_rulings` | `food.frameworks` | Seed ruling per (food, framework) |
| 12 | `food_substitutes` | `food.substitutes` | Directed substitution graph |
| 13 | `user_restrictions` | `food.restrictions`, `allergies`, `intolerances`, `religiousRestrictions`, `dislikes`, `refuseToEliminate` | One row per restriction with its category |
| 14 | `documents` | `documents[]` | Metadata only; contents never persisted |
| 15 | `findings` | `findings[]` | Extracted report findings with confirmation status |
| 16 | `rulings` | `buildRules()` output | Resolved per-food ruling with source, confidence, precedence |
| 17 | `recipes` | `RECIPES` | Recipe library |
| 18 | `recipe_ingredients` | `recipe.ingredients` | Measured ingredient rows joined to `foods` |
| 19 | `meal_plans` | `book.data.plan` | Plan header: days, meals per day, averages |
| 20 | `meal_plan_meals` | `plan.days[].meals[]` | Per-slot meal, recipe or plate |
| 21 | `grocery_items` | `book.data.grocery` | Aisle-grouped quantities |
| 22 | `books` | `book` | Generated book header, theme, depth, edits, validation summary |
| 23 | `book_chapters` | `book.chapters` | Ordered chapters, lock state, block payload |

Supporting tables also present in `schema.sql` for completeness: `safety_flags`,
`safety_acknowledgements`, `validation_runs`, `validation_checks`, `exports`, `trackers`,
`tracker_entries`.

## 4. Invariants

1. A finding never affects a ruling until `status = 'Confirmed'`.
2. A ruling always names a `sourceType`; unsourced rulings are a bug, and check 6 of the validator
   fails the export if one appears.
3. `hardExclusion = true` implies allergen-family expansion and cross-contact language.
4. A food in `refuseToEliminate` never disappears silently — it appears in `rules.reconciliations`
   with a printed explanation.
5. `book.stale = true` whenever answers change after generation; export always shows it.
