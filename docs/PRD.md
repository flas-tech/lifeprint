# LifePrint — Product Requirements

**Status:** MVP built (static, browser-only)
**Owner:** product + engineering (single team)
**Last updated:** 2026-07-29

---

## 1. Problem

People who need a personalized way of eating are handed fragments: a lab report they cannot read, a
framework name ("low-FODMAP"), a printout of foods to avoid, and a website full of recipes that
ignore all three. Nobody assembles those fragments into one coherent document that says *what to eat
this week, why, and what to do when the plan collides with itself*.

The fragments also conflict. A vegan protocol and an AIP protocol together remove nearly everything.
An IgG panel says "avoid almonds" while an allergy history says almonds are life-threatening — the
same food, two completely different levels of authority. Existing tools either ignore the conflict or
silently pick a side without telling the user.

## 2. Product

LifePrint is a browser-only wizard that turns a person's answers — plus, optionally, text pasted or
uploaded from their own reports — into a single, printable, source-cited lifestyle book.

Three properties define it:

1. **Traceable.** Every food ruling in the book names the rule that produced it, its source type, its
   confidence, and whether it is temporary and reintroducible.
2. **Honest.** It refuses to give clinical instructions (doses, prescriptions, condition-specific
   limits), labels every nutrition number as an estimate, and prints a safety review the user must
   read before generation.
3. **Private by construction.** There is no server. Files are read with `FileReader` in the tab,
   findings are confirmed by the user, and everything persists in `localStorage`.

## 3. Users

| User | Need | What LifePrint gives them |
| --- | --- | --- |
| Newly diagnosed (intolerance, IBS, autoimmune) | "What do I actually eat now?" | A 15–100 page book with a food guide, meal plan, and grocery list built from their own restrictions |
| Framework follower (keto, AIP, Mediterranean) | Consistency across shopping, cooking, travel | One stacked ruleset applied to 284 foods, with reconciliation when frameworks conflict |
| Person with a lab report | "What does this mean day to day?" | Heuristic extraction, user confirmation, then temporary reintroducible rulings with page citations |
| Caregiver / partner | Shared shopping and cooking | Grocery list by aisle, batch plan, household-scaled recipes |
| Clinician (secondary) | See what the patient is doing | A clinician-review appendix listing every flag, exclusion, source, and acknowledgement |

## 4. Scope of the MVP

**In scope**
- 13-step wizard with validation, autosave, resume, reset, JSON export/import
- 21 framework rulesets, 284-food library, 27 recipes, 11 trackers
- 8-level precedence engine with explicit reconciliation of user "non-negotiables"
- Safety screen with mandatory acknowledgement gate
- Document reading (paste, `.txt`/`.md`, PDF text layer via pdf.js) with per-finding confirmation
- Deterministic 12-stage generation pipeline producing a 34-chapter book model
- Book editor: per-paragraph edit, per-paragraph/chapter regeneration, chapter lock, chapter removal
- 17-check validator surfaced before export
- jsPDF export in three variants (standard, printer-friendly greyscale, mobile) with clickable TOC,
  running headers, page numbers, repeated table headers, orphan control
- 11 book themes mirrored between screen CSS and the PDF renderer

**Explicitly out of scope for the MVP**
- Accounts, sync, sharing links, collaboration
- OCR of scanned/image-only PDFs
- Barcode scanning, store inventory APIs, restaurant menu APIs
- Supplement dosing, calorie prescriptions, macro targets framed as clinical goals
- Payment, tiers, or any feature gating

## 5. Requirements

### 5.1 Functional

| ID | Requirement |
| --- | --- |
| F1 | Every wizard step validates before advancing; steps 5–7 are skippable |
| F2 | State autosaves to `localStorage` after every mutation and restores on reload |
| F3 | Framework conflicts are detected and must be resolved (adjust / keep / supervision) |
| F4 | Safety flags requiring acknowledgement block generation — enforced in `validateStep`, not just in the UI |
| F5 | Uploaded/pasted report findings are never used until the user confirms each one |
| F6 | Each food ruling carries `{status, reason, sourceType, sourceReference, confidence, temporary, reintroducible}` |
| F7 | Meal plan, grocery list, batch plan, and restaurant guide derive from the surviving food set only |
| F8 | Book length (15/30/60/100) materially changes food-guide depth, recipe count, tracker count, and journal pages |
| F9 | Validation runs before every export and is displayed in full, pass or fail |
| F10 | PDF export produces a clickable TOC with true page numbers, running headers, and `Page N of T` footers |
| F11 | Book edits survive rebuilds; a "fresh draft" path explicitly discards them |
| F12 | Nothing leaves the browser — no fetch to any origin except CDN scripts and fonts |

### 5.2 Non-functional

- Zero build step. Plain HTML, CSS, and ES modules; CDN libraries only.
- Works from a GitHub Pages subpath: relative asset paths, `.nojekyll`, no service worker.
- Generation completes in well under a second on a mid-range laptop (measured and displayed).
- WCAG AA contrast, visible focus rings, keyboard-navigable, `prefers-reduced-motion` respected.
- Degrades gracefully: if pdf.js fails, manual entry remains; if jsPDF fails, the user is told and
  pointed at browser print.

## 6. Success criteria

1. A user completes the wizard and downloads a book whose every "Avoid" they can trace to a reason.
2. The hard case (vegan + AIP + low-FODMAP, tree-nut anaphylaxis, pregnancy, 30-day plan, 100+ pages)
   produces a coherent 100+ page book with all safety flags surfaced and acknowledged.
3. Validation reports 17/17 passing on both the demo and hard profiles.
4. No allergen appears anywhere in the meal plan or recipe text.

## 7. Key product decisions

- **Precedence over averaging.** When sources disagree, the higher-authority source wins outright and
  the loser is recorded, rather than blending into a vague "limit".
- **Reconciliation, not silent override.** If a user refuses to remove a food that a framework
  excludes, the food stays at a reduced portion and the book prints exactly what happened and why.
- **IgG panels are demoted by design.** They produce temporary, reintroducible, cited signals — never
  permanent exclusions, never called allergies.
- **The safety screen is a gate, not a banner.** Generation is blocked until acknowledgement, and the
  acknowledgements are printed in the book with their date.
