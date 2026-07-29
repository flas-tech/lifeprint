# LifePrint — Safety Framework

LifePrint produces educational material. The safety system exists so that boundary is enforced by
code, not by a paragraph of small print.

Three layers:

1. **Screens** (`js/engine/safety.js`) — flags raised from the user's own answers, some of which block
   generation until acknowledged.
2. **Content rules** — what the generator is allowed to write, and the vocabulary it may not use.
3. **Validation** (`js/engine/validate.js`) — 17 checks over the finished book, shown before export.

---

## 1. Safety screens

Every flag names the specific combination of answers that triggered it, what LifePrint will do about
it, and what the user should do. Flags marked *acknowledgement required* block step 10 — the gate is
enforced in `validateStep(9)`, and step 9 hides the generic wizard nav so there is no way around it.
Acknowledgements are stored with a date and printed in the clinician-review chapter.

| Level | Meaning | Behaviour |
| --- | --- | --- |
| `urgent` | Could indicate an active medical problem | Undismissable; shown first; advises contacting a clinician before changing anything |
| `stop` | Serious risk combination | Acknowledgement required before generation |
| `caution` | Worth knowing, printed in the book | Acknowledgement required for most; always printed |

### Flags implemented

| Flag | Level | Trigger |
| --- | --- | --- |
| Please contact a clinician before changing your diet | urgent | Urgent symptom answers (e.g. unexplained weight loss, blood in stool, difficulty swallowing) |
| Your goal weight implies a large, fast change | caution | Goal weight far below current weight, or an implausibly low calorie floor |
| N major food groups removed at once | caution | Framework stack eliminates several major groups |
| Vegan + AIP + Low-FODMAP together needs supervision | stop | That specific stack — very little food survives and protein, B12, iron, and calcium all become hard |
| Weight-loss goal during pregnancy | stop | Pregnancy plus a fat-loss goal |
| Restrictive protocol during pregnancy | stop | Pregnancy plus a restrictive framework |
| Eating-disorder history + a restrictive plan | stop | Disclosed history plus restriction or tracking-heavy output |
| Anaphylaxis-level allergy on file | stop | Any allergy marked anaphylaxis |
| Condition + a restrictive protocol | stop | Diabetes, kidney disease, liver disease, or similar plus restriction |
| Injury recovery in progress | caution | Injury disclosed with a training plan requested |
| Medications and supplements together | caution | Both lists non-empty — interaction risk belongs to a pharmacist |
| Nut allergy with a plant-based plan | caution | Nut exclusion plus vegan/vegetarian protein sourcing |

## 2. Hard content limits

LifePrint will not write, at any length, theme, or tone:

- Supplement doses, brands, or timing protocols. It names categories and says to ask a clinician.
- Medication guidance of any kind, including "take with food" style instructions.
- Calorie or macro prescriptions framed as clinical targets. Numbers appear only as **estimates**.
- Condition-specific limits: carbohydrate dosing against insulin, protein or potassium limits in
  kidney disease, protein restriction in liver disease, sodium prescriptions in heart failure.
- Any claim that a food or plan diagnoses, treats, cures, heals, or reverses a condition.
- Any statement that a store stocks an item or that a restaurant dish is safe. Availability and
  formulations change; the book teaches label reading instead.
- Any framing of an IgG or similar food-sensitivity panel as an allergy test or a diagnosis.

### Banned claim vocabulary

`cure`, `cures`, `treat`, `treats`, `heal`, `heals`, `diagnose`, `diagnoses`, `guaranteed`,
`reverses`, `eliminates disease`.

`scanClaims()` scans the entire generated book text for these words. It allows explicitly negated or
disclaimered usages ("this book does not diagnose", "not a treatment"), and the noun sense where it is
unambiguous, so the check produces signal rather than noise. Any surviving hit fails validation check
*Medical claims are hedged* and is listed with its surrounding context.

## 3. How sources are ranked

See PIPELINE.md for the full precedence table. The safety-relevant consequences:

- **Allergy ≠ intolerance ≠ sensitivity ≠ preference.** They are separate fields, ranked differently,
  and worded differently in the book. An allergy produces a permanent hard exclusion with allergen
  family expansion and cross-contact guidance. A sensitivity-panel finding produces a temporary,
  reintroducible, cited reduction.
- **Clinician instructions are never overridden.** Not by a framework, not by a preference, not by a
  craving. Validation check *Clinician instructions are not overridden* fails the export if one was.
- **Report findings require confirmation.** Extraction is heuristic; nothing extracted affects a
  ruling until the user confirms it on step 6.

## 4. Reintroduction, not permanent removal

Temporary exclusions are scheduled rather than forgotten. The reintroduction chapter prints one food
at a time, a portion progression across days, and a 72-hour watch window — and explicitly excludes
allergy and diagnosed-intolerance foods from self-directed trials.

## 5. Validation checks (17)

| Key | Check |
| --- | --- |
| `allergens` | No allergen appears in any recipe or meal |
| `prohibited` | No prohibited food appears in the plan |
| `hidden` | No allergen appears as a hidden or substituted ingredient |
| `contradiction` | No contradictory ruling appears in two chapters |
| `estimates` | Nutrition is labelled as an estimate |
| `citations` | Every confirmed finding carries a citation |
| `claims` | Medical claims are hedged |
| `stores` | Store availability is never guaranteed |
| `toc` | Every chapter has content for its TOC entry |
| `frequency` | Meal plan matches the requested meals per day |
| `servings` | Recipe servings cover the household |
| `budget` | Budget tier respected |
| `equipment` | Only equipment the user owns is required |
| `dislikes` | Foods the user dislikes are excluded |
| `clinician` | Clinician instructions are not overridden |
| `appendix` | Clinician-review appendix matches the safety flags |
| `reconcile` | Foods the user refuses to eliminate are reconciled explicitly |

Failures do not silently block export; they are shown in full, and exporting anyway requires an
explicit confirmation that records the user's intent.

## 6. Privacy as a safety property

Health information never leaves the browser. Files are read with `FileReader`, PDFs are parsed by
pdf.js locally, and document contents are discarded after extraction — only metadata persists. There
is no analytics, no telemetry, and no network request other than the CDN fetches for jsPDF, pdf.js,
and fonts. Clearing site data destroys everything, which is stated on the welcome screen and again at
export.
