// Step 8 — Book preferences: length, style, tone, chapters, order.
import { el, card, field, optionCards, callout, clear, toast } from '../ui/dom.js';
import { BOOK_STYLES, CHAPTERS, TONES } from '../state.js';

const LENGTHS = [
  { id: 15, title: '~15 pages', desc: 'Essentials only: rulings, a week of meals, a grocery list.' },
  { id: 30, title: '~30 pages', desc: 'The balanced default — plan, recipes, routines, trackers.' },
  { id: 60, title: '~60 pages', desc: 'Full guide with the complete food index and every tracker.' },
  { id: 100, title: '~100 pages', desc: 'Reference edition: extended notes, journal pages, every chapter in full.' },
];

const PLAN_DAYS = [
  { id: 3, title: '3 days', desc: 'A trial run.' },
  { id: 7, title: '7 days', desc: 'One repeatable week.' },
  { id: 14, title: '14 days', desc: 'Two weeks, less repetition.' },
  { id: 30, title: '30 days', desc: 'A full month — long books only.' },
];

const VARIANTS = [
  { id: 'standard', title: 'Standard', desc: 'Full colour, 6×9-style margins, serif headings.' },
  { id: 'printer', title: 'Printer friendly', desc: 'Grayscale, no tinted blocks, thin rules — cheap to print.' },
  { id: 'mobile', title: 'Mobile reading', desc: 'Narrower measure, larger type, more page breaks.' },
];

const TONE_DESC = {
  supportive: 'Warm and encouraging. Assumes you are doing your best.',
  straightforward: 'Plain and brief. No cheerleading.',
  clinical: 'Precise and neutral, closest to how a dietitian would write it.',
  coach: 'Direct and demanding. Expects you to show up.',
};

export default {
  render(ctx) {
    const bp = ctx.state.bookPrefs;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 8 of 13' }),
      el('h1', { text: 'Design your book.' }),
      el('p', { class: 'lede', text: 'Length, style, tone, and which of the 34 chapters you actually want. Order matters — the first chapter is what you will see every time you open the PDF.' })
    );

    const body = el('div', { class: 'step-body' });

    body.append(card({
      title: 'Title page',
      children: [
        el('div', { class: 'grid two' }, [
          field({
            label: 'Book title', id: 'title', value: bp.title,
            placeholder: `${ctx.state.profile.firstName || 'Your'} Nutrition & Lifestyle Guide`,
            hint: 'Leave blank to use your name automatically.',
            onInput: (v) => ctx.patch((s) => { s.bookPrefs.title = v; ctx.invalidateBook('Title changed.'); }),
          }),
          field({
            label: 'Subtitle', id: 'subtitle', value: bp.subtitle,
            placeholder: 'Personalized edition',
            onInput: (v) => ctx.patch((s) => { s.bookPrefs.subtitle = v; ctx.invalidateBook('Subtitle changed.'); }),
          }),
        ]),
      ],
    }));

    body.append(card({
      title: 'How long should it be?',
      sub: 'Length is a real constraint, not a label: it decides how many foods are indexed, how many recipes are printed in full, and whether journal pages are included.',
      children: [optionCards({
        name: 'Length', value: bp.length, items: LENGTHS,
        onChange: (v) => ctx.patch((s) => { s.bookPrefs.length = v; ctx.invalidateBook('Length changed.'); }, { rerender: true }),
      })],
    }));

    body.append(card({
      title: 'How many days of meals?',
      children: [
        optionCards({
          name: 'Meal plan days', value: bp.mealPlanDays, items: PLAN_DAYS,
          onChange: (v) => {
            ctx.patch((s) => { s.bookPrefs.mealPlanDays = v; ctx.invalidateBook('Meal plan length changed.'); }, { rerender: true });
            if (v >= 14 && bp.length <= 15) toast('A 15-page book will summarize the rotation rather than print every day.');
          },
        }),
      ],
    }));

    // ---- styles ----
    const styleGrid = el('div', { class: 'grid three' });
    for (const s of BOOK_STYLES) {
      const on = bp.style === s.id;
      styleGrid.append(el('button', {
        class: 'optcard', type: 'button', 'aria-pressed': on ? 'true' : 'false', style: 'flex-direction:column;gap:10px',
        onclick: () => ctx.patch((st) => { st.bookPrefs.style = s.id; ctx.invalidateBook('Book style changed.'); }, { rerender: true }),
      }, [
        el('div', { class: 'book', 'data-theme': s.id, style: 'width:100%;padding:12px;box-shadow:none;pointer-events:none' }, [
          el('h2', { style: 'font-size:15px;margin:0 0 4px', text: 'Master food guide' }),
          el('p', { style: 'font-size:10.5px;margin:0 0 6px', text: 'Chickpeas — eat in moderation. Low-FODMAP in ¼-cup canned, rinsed portions.' }),
          el('div', { style: 'display:flex;gap:4px' }, [
            el('span', { class: 'pill eat', style: 'font-size:9px', text: 'Eat freely' }),
            el('span', { class: 'pill avoid', style: 'font-size:9px', text: 'Avoid' }),
          ]),
        ]),
        el('span', { class: 'oc-title', text: s.name }),
      ]));
    }
    body.append(card({
      title: 'Book style',
      sub: 'Eleven real typographic systems — each one changes fonts, colour, rules, and spacing in both the preview and the exported PDF.',
      children: [styleGrid],
    }));

    body.append(card({
      title: 'Tone of voice',
      children: [optionCards({
        name: 'Tone', value: bp.tone, columns: 'two',
        items: TONES.map((t) => ({ id: t, title: t.charAt(0).toUpperCase() + t.slice(1), desc: TONE_DESC[t] })),
        onChange: (v) => ctx.patch((s) => { s.bookPrefs.tone = v; ctx.invalidateBook('Tone changed.'); }),
      })],
    }));

    body.append(card({
      title: 'PDF variant',
      sub: 'You can export all three later — this just sets the default.',
      children: [optionCards({
        name: 'PDF variant', value: bp.pdfVariant, columns: 'three', items: VARIANTS,
        onChange: (v) => ctx.patch((s) => { s.bookPrefs.pdfVariant = v; }),
      })],
    }));

    // ---- chapters ----
    const chapterHost = el('div', { class: 'stack' });
    const renderChapters = () => {
      clear(chapterHost);
      const ordered = [...ctx.state.bookPrefs.chapters].sort((a, b) => a.order - b.order);
      const onCount = ordered.filter((c) => c.on).length;
      chapterHost.append(el('p', { class: 'tiny muted', text: `${onCount} of ${ordered.length} chapters on. Use the arrows to reorder; chapter one opens the book.` }));
      ordered.forEach((c, idx) => {
        const meta = CHAPTERS.find(([id]) => id === c.id);
        chapterHost.append(el('div', { class: 'rank-item' }, [
          el('span', { class: 'rk-num', text: String(idx + 1) }),
          el('span', { class: 'rk-name' }, [
            el('strong', { text: meta[1] }),
            el('span', { class: 'oc-desc', text: meta[2] }),
          ]),
          el('span', { class: 'rk-btns' }, [
            el('button', {
              class: 'switch', type: 'button', role: 'switch', 'aria-pressed': c.on ? 'true' : 'false', 'aria-label': `Include ${meta[1]}`,
              onclick: () => { ctx.patch((s) => { const t = s.bookPrefs.chapters.find((x) => x.id === c.id); t.on = !t.on; ctx.invalidateBook('Chapters changed.'); }); renderChapters(); },
            }),
            el('button', {
              class: 'iconbtn', type: 'button', 'aria-label': `Move ${meta[1]} up`, disabled: idx === 0 ? true : null,
              onclick: () => { ctx.patch((s) => { const arr = [...s.bookPrefs.chapters].sort((a, b) => a.order - b.order); const [x] = arr.splice(idx, 1); arr.splice(idx - 1, 0, x); s.bookPrefs.chapters = arr.map((y, i) => ({ ...y, order: i })); ctx.invalidateBook('Chapter order changed.'); }); renderChapters(); },
            }, '↑'),
            el('button', {
              class: 'iconbtn', type: 'button', 'aria-label': `Move ${meta[1]} down`, disabled: idx === ordered.length - 1 ? true : null,
              onclick: () => { ctx.patch((s) => { const arr = [...s.bookPrefs.chapters].sort((a, b) => a.order - b.order); const [x] = arr.splice(idx, 1); arr.splice(idx + 1, 0, x); s.bookPrefs.chapters = arr.map((y, i) => ({ ...y, order: i })); ctx.invalidateBook('Chapter order changed.'); }); renderChapters(); },
            }, '↓'),
          ]),
        ]));
      });
    };
    renderChapters();

    body.append(card({
      title: 'Chapters',
      sub: 'Switch off anything you will not read. Two chapters cannot be removed in practice — the disclaimer page and the clinician review page are added automatically whenever a safety flag exists.',
      children: [
        el('div', { class: 'row', style: 'margin-bottom:12px' }, [
          el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { ctx.patch((s) => { s.bookPrefs.chapters.forEach((c) => { c.on = true; }); ctx.invalidateBook('Chapters changed.'); }); renderChapters(); } }, 'Turn all on'),
          el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { ctx.patch((s) => { s.bookPrefs.chapters.forEach((c, i) => { c.on = i < 6; }); ctx.invalidateBook('Chapters changed.'); }); renderChapters(); } }, 'Essentials only'),
          el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { ctx.patch((s) => { s.bookPrefs.chapters = CHAPTERS.map(([id, , , on], i) => ({ id, on, order: i })); ctx.invalidateBook('Chapters reset.'); }); renderChapters(); } }, 'Reset to default'),
        ]),
        ctx.errorFor('chapters') ? el('p', { class: 'err', text: ctx.errorFor('chapters') }) : null,
        chapterHost,
      ],
    }));

    if (bp.length >= 60 && bp.mealPlanDays < 14) {
      body.append(callout({
        variant: 'info',
        title: 'Long book, short plan',
        text: 'A 60- or 100-page book has room for a longer rotation. If you want less repetition at the dinner table, bump the meal plan to 14 or 30 days.',
      }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
