# LifePrint — Roadmap

Everything below is **planned, not built**. Nothing in the shipped app is gated, limited, locked, or
upsold — the MVP is complete and free, and this document is direction, not a paywall.

---

## Next phase (the immediate follow-on)

| Item | Why it is next |
| --- | --- |
| Expand the food library toward ~800 items | Coverage is the most common source of "my food isn't here" |
| Phase-aware frameworks | AIP elimination vs reintroduction, FODMAP challenge phases, keto adaptation — one ruling per food per framework is too coarse |
| Daily FODMAP stacking | Individually low-FODMAP meals can still add up across a day |
| Recipe library to 100+, with scaling by household and leftovers logic | 27 recipes rotates thin at 30 days |
| In-app trackers | Printed forms work, but logging in the app enables the reintroduction feedback loop |
| Reintroduction follow-through | Log a challenge, record the outcome, and update the ruling's confidence |
| Better extraction | Table-aware parsing for common lab layouts, plus a per-lab hint file |
| Cover art | A small set of generated, theme-matched cover treatments |

## Later

- **Optional accounts with end-to-end encryption.** Sync between devices without the operator being
  able to read health data. If it cannot be done without weakening the privacy claim, it does not ship.
- **Clinician view.** A shareable read-only summary a dietitian can comment on, with the comments
  flowing back as level-2 precedence instructions.
- **Print fulfilment.** Send the PDF to a print-on-demand service and receive a bound book.
- **OCR.** WASM OCR for scanned reports, loaded on demand so it never costs anything to users who do
  not need it.
- **Localisation.** Translated UI, region-appropriate food libraries and aisle names, metric-first.
- **Grocery integration.** Export the list to a retailer's basket where a public API exists.
- **Household mode.** One plan reconciled across several people's restrictions, with a shared shop.
- **Wearable and lab import.** Sleep and activity data as context; repeat lab panels tracked over time.
- **Native wrappers.** iOS/Android shells for offline use and share-sheet file import.

## Planned roles (a future multi-user version)

| Role | Can |
| --- | --- |
| Individual | Everything the current app does |
| Household member | Contribute restrictions to a shared plan; see the shared shop and meal plan |
| Clinician (invited) | View a client's summary, add instructions that outrank frameworks, sign off on a phase |
| Coach (invited) | View adherence and trackers; no clinical instruction authority |
| Admin (clinic deployment) | Manage clinician seats and templates; never sees client health data by default |

## Planned monetization tiers

Described for planning only. **No feature in the shipped app is behind any of these.**

| Tier | Idea |
| --- | --- |
| Free | The current product: full wizard, full engine, full book, PDF export, local-only |
| Plus | Encrypted sync, unlimited saved book versions, expanded recipe and food libraries, in-app trackers |
| Clinician | Client roster, instruction templates, co-signed plans, clinic branding on exports |
| Print | Per-book professional printing and binding, priced per copy |

## Explicit non-goals

- Diagnosing anything, ever.
- Supplement or medication dosing.
- Selling supplements, or accepting placement money from brands that would bias food rulings.
- Selling, sharing, or monetising user health data in any form.
- Engagement mechanics — streaks, nudges, or gamified restriction — around eating behaviour.
