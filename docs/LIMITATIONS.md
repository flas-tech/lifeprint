# LifePrint — Limitations

An honest list. If any of these are dealbreakers for your use case, they are dealbreakers today.

## Medical

1. **This is not medical advice.** LifePrint is educational. It does not diagnose, treat, or manage any
   condition, and it is not a substitute for a physician, registered dietitian, or pharmacist.
2. **No clinical numbers.** No supplement doses, no medication guidance, no calorie prescriptions, no
   condition-specific limits (carbohydrate dosing for insulin, protein or potassium limits in kidney
   disease, sodium targets in heart failure). These require a clinician who knows your labs.
3. **Nutrition values are estimates.** Calories and protein come from a curated reference table for a
   stated serving size. Real portions, brands, cuts, and cooking losses vary; treat every number as an
   approximation, never a target to hit precisely.
4. **Allergen safety is guidance, not a guarantee.** The engine excludes allergen families and adds
   cross-contact language, but it cannot know how your food was manufactured or prepared. Always read
   labels and ask.
5. **Reintroduction is self-directed.** The schedule is educational. Allergy and diagnosed-intolerance
   foods are excluded from it, and anyone with a reaction history should reintroduce only under
   supervision.

## Data and personalization

6. **Curated seed data, not a full food database.** 284 foods, 27 recipes, 21 frameworks. Broad enough
   for a coherent book; not exhaustive. Foods outside the library are kept as your own words and
   handled generically.
7. **Framework rulings are simplified.** A single ruling per (food, framework) cannot capture
   phase-dependent rules — for example, the difference between AIP elimination and AIP reintroduction,
   or FODMAP-stacking effects across a whole day.
8. **The meal plan is a rotation, not an optimiser.** It respects your restrictions, meals per day,
   time budget, equipment, and dislikes, and reports estimated averages. It does not solve for macro
   targets, micronutrient sufficiency, or cost minimisation.
9. **No micronutrient analysis.** The book flags well-known risk areas for restrictive patterns (B12,
   iron, calcium, vitamin D, omega-3) as topics to discuss. It does not compute your intake.
10. **Deterministic text, not generative writing.** Chapters are assembled from templates driven by
    your data with a fixed set of variants per paragraph. Regeneration changes the wording within that
    set; it does not invent new prose.

## Document reading

11. **Text-layer PDFs only.** Scanned or photographed reports have no text to read. There is no OCR.
    You are told when this happens and offered manual entry.
12. **Extraction is heuristic and will miss things.** It looks for food names, aliases, severity words,
    and numbers near them. It will produce false positives and false negatives on unusual report
    layouts, which is exactly why every finding must be confirmed by you before it is used.
13. **Nothing is used unconfirmed.** A missed finding simply will not appear in your book. Review the
    findings screen against your report yourself.
14. **Document contents are not saved.** Only the file name, type, and character count persist. Reload
    the page and you will need to re-add the file to re-extract.

## Technical

15. **No accounts, no server, no sync.** One browser, one profile. Nothing is shared between devices.
16. **`localStorage` is the only storage.** Clearing site data, using private browsing, or hitting the
    storage quota loses your answers. Export the JSON if the work matters — that file is the backup.
17. **Storage is not encrypted.** Anyone with access to your unlocked browser profile can read it. On a
    shared machine, export and then reset.
18. **CDN dependency.** jsPDF and pdf.js load from a CDN. Offline or behind a blocking proxy, PDF
    export and PDF reading degrade — the app tells you and points at browser print and manual entry.
19. **Modern browsers only.** ES modules, `:has()`, `clamp()`, container-friendly flex/grid. Current
    Chrome, Edge, Firefox, and Safari are fine; Internet Explorer and very old mobile browsers are not
    supported.
20. **Very long books are slow to export.** The 100-page hard case runs three layout passes; expect a
    couple of seconds and a brief unresponsive moment on a low-end device.
21. **No collaboration, sharing links, or print fulfilment.** You get a PDF. What happens next is up to
    you.
22. **English only.** No localisation, and the parser's severity vocabulary is English.
23. **Accessibility tested, not audited.** AA contrast, keyboard paths, focus management, and reduced
    motion are implemented and spot-checked; there has been no formal screen-reader audit.

## Known rough edges

- Only the three most recent book drafts are restorable. Older entries stay in the version list as a
  record with no snapshot, because keeping every draft would exhaust the browser storage quota.
- Regenerating a paragraph cycles a small fixed variant set; cycling far enough returns to the start.
- The grocery list aggregates by food, not by package size, so quantities need common sense at the
  shop.
- Tracker pages are printed blank forms; there is no in-app logging.
- The clinician appendix is a summary for a conversation, not a clinical handoff document.
