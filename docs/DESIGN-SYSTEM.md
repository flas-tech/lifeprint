# LifePrint — Design System

Calm, premium, editorial wellness. Warm paper rather than clinical white, evergreen ink rather than
SaaS blue, clay as the single warm accent, and sage tints for status. Nothing about the interface
should feel like a hospital form or a generic dashboard.

Files: `css/base.css` (tokens, reset, base type), `css/app.css` (components and layout),
`css/themes.css` (the 11 book themes). The PDF renderer mirrors the theme table in
`js/pdf/export.js` so a book looks like itself on screen and on paper.

---

## 1. Colour

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#faf7f1` | App background |
| `--paper-2` / `--paper-3` | `#f4efe6` / `#ece5d8` | Recessed surfaces, table headers |
| `--card` | `#fffdf9` | Cards, book page surface |
| `--ink` / `--ink-2` / `--ink-3` / `--ink-4` | `#1c2a24` → `#94a49b` | Text hierarchy |
| `--hairline` / `--hairline-strong` | `#ddd4c4` / `#c8bda8` | 1px dividers, borders |
| `--forest` / `--forest-2` / `--forest-3` | `#1f4034` → `#3f7a63` | Primary brand and CTAs |
| `--sage` / `--sage-2` | `#dfe8df` / `#c3d5c6` | Positive status tints |
| `--clay` / `--clay-2` / `--clay-tint` | `#b4633f` / `#d08a63` / `#f6e7de` | Secondary accent, destructive-adjacent actions |

**Status colours** are semantic, never decorative:

| Status | Ink | Tint |
| --- | --- | --- |
| Eat freely | `--ok` `#2f6b4f` | `--ok-tint` `#e3efe6` |
| Eat in moderation | `--moderate` `#8a6d2f` | `--moderate-tint` `#f6eed9` |
| Occasional | `--occasional` `#9a5a2c` | `--occasional-tint` `#f7e8db` |
| Avoid | `--avoid` `#8f2f2a` | `--avoid-tint` `#f7e2e0` |
| Caution flag | `--caution` `#a8741c` | `--caution-tint` `#fbf0d9` |
| Stop flag | `--stop` `#8f2f2a` | `--stop-tint` `#f9e4e2` |
| Urgent flag | `--urgent` `#7a1f1a` | `--urgent-tint` `#f6dcd9` |
| Informational | `--info` `#2b5878` | `--info-tint` `#e7eef4` |

Deep red is reserved for hard stops. Amber is caution. Neither is used for emphasis or decoration.

## 2. Typography

- **Display:** Fraunces, falling back to Newsreader → Source Serif 4 → Georgia. Used for headings,
  book chapter titles, and stat figures.
- **UI/body:** Inter, falling back to Satoshi → system sans. Used for everything else.
- Loaded from Google Fonts with `display=swap`; the fallback stack is close enough in metrics that
  the swap is not jarring.

| Token | Size |
| --- | --- |
| `--text-xs` | 0.75rem |
| `--text-sm` | 0.8125rem |
| `--text-base` | 0.9375rem |
| `--text-md` | 1.0625rem |
| `--text-lg` | 1.25rem |
| `--text-xl` | 1.5rem |
| `--text-2xl` | 1.9rem |
| `--text-3xl` | 2.5rem |
| `--text-hero` | `clamp(2.4rem, 5vw, 3.6rem)` |

Weight contrast carries hierarchy before size does. Body copy is capped near 68 characters per line;
the book preview uses a narrower measure again.

## 3. Space, shape, motion

- Spacing scale `--s1` … `--s8` on a 4px base; layout gaps use `--s5`/`--s6` for generous whitespace.
- Radii: `--radius-sm` for controls, `--radius` for cards. No pill buttons except chips and badges.
- Dividers are 1px hairlines, never heavy rules or shadows-as-separators.
- Transitions 200–260 ms, ease-out, on colour/border/transform only. All animation is wrapped in
  `@media (prefers-reduced-motion: reduce)` overrides.
- Focus is always visible: a 2px `--forest` ring with 2px offset, never removed.

## 4. Components

`js/ui/dom.js` is the only place components are defined: `chipGroup`, `optionCards`, `toggleList`,
`rankPicker`, `field`, `table`, `callout`, `statusPill`, `card`, `autocomplete`, `toast`, `modal`,
`confirmModal`. `js/ui/blocks.js` renders the book block model (`h2`, `h3`, `p`, `ul`, `ol`, `table`,
`callout`, `kv`, `journal`) to DOM; the PDF renderer consumes the same model.

Layout: a fixed step rail on desktop (≥900px) with completion state per step; below that, a progress
bar plus "step N of 13" counter in a sticky `.mobilebar`. The book editor uses a two-column
`.preview-shell` (sticky contents pane + book) that collapses to one column on mobile.

## 5. The 11 book themes

Each theme sets `--bk-*` variables on `.book[data-theme="…"]` and has a matching entry in the PDF
`THEMES` table (display font, body font, accent, ink, soft, rule, tint, corner radius, and a couple of
behavioural flags).

| Theme | Character | Distinguishing treatment |
| --- | --- | --- |
| `minimal` | Neutral, quiet | Grotesque throughout, near-black ink, hairline rules |
| `elegant` | Warm editorial | Serif display and body, cream tint, wide leading |
| `modern-wellness` | Default | Serif headings, sans body, evergreen accent, soft rounded callouts |
| `clinical` | Precise, cool | Blue-slate accent, tighter rhythm, sans headings, small caps h3 |
| `feminine` | Soft, warm | Plum accent, rose tints, larger radii |
| `masculine` | Structural | Uppercase headings, square corners, cool graphite |
| `athletic` | Direct | Uppercase headings, green accent, denser tables |
| `luxury` | Restrained gold | Serif throughout, rule under each chapter title, square corners |
| `nature` | Earthy | Olive accent, warm sand tints |
| `colorful` | Energetic | Magenta accent, tinted table headers, larger radii |
| `print-bw` | Ink-saving | Pure greyscale, no fills, patterned status pills |

## 6. PDF-specific rules

- Letter, 0.6–0.75in margins (standard uses ~0.69in; the mobile variant tightens to ~0.64in and
  increases body size).
- Running header on every page after the cover: chapter title left, book title right, hairline under.
- Footer on every page after the cover: "Educational guidance — not medical advice" left, "Page N of T"
  right — drawn in a final pass so the total is real.
- Measure-before-draw for every block; a heading reserves its own height plus the first unbreakable
  unit of whatever follows, so headings never strand at a page foot.
- Tables are kept whole when they fit on a page; otherwise they split with the header row repeated,
  never leaving fewer than two rows under a header.
- Three variants: standard (colour), printer-friendly (greyscale, no filled backgrounds), mobile
  (larger type on a narrower measure).

## 7. Accessibility

- AA contrast for all text and status pills; status is never colour-only — the pill always carries its
  label, and the PDF prints the word.
- Every control is reachable and operable by keyboard; modals trap focus and restore it on close.
- Icon-only buttons carry `aria-label`; the contents pane marks the active chapter with
  `aria-current`; toasts use `role="status"`; hard-stop callouts use `role="alert"`.
- `@media print` rules strip the app chrome so the on-screen book prints acceptably even without the
  PDF path.
