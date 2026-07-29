// Step 6 (optional) — Review every extracted finding. Nothing reaches the book unconfirmed.
import { el, card, field, callout, table, toast } from '../ui/dom.js';
import { foodByName } from '../engine/foods.js';

const STATUSES = ['Confirmed', 'Needs confirmation', 'Rejected'];

export default {
  render(ctx) {
    const findings = ctx.state.findings;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 6 of 13 · optional' }),
      el('h1', { text: 'You decide what counts.' }),
      el('p', { class: 'lede', text: 'Every finding below was read out of a document you added. None of them affect your book until you confirm them. Reject anything that looks like a misread — the extraction is a heuristic, not a lab technician.' })
    );

    const body = el('div', { class: 'step-body' });

    if (!findings.length) {
      body.append(callout({
        variant: 'info',
        title: 'Nothing to review',
        text: 'No findings were extracted or entered. Your book will be built from your answers alone, which is perfectly fine — the sensitivities chapter will simply say no reports were provided.',
      }));
      body.append(el('div', { class: 'row' }, [
        el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(5, { validate: false }) }, '← Add a document'),
        el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(7, { validate: false }) }, 'Continue without findings'),
      ]));
      return wrap.appendChild(body) && wrap;
    }

    const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: findings.filter((f) => f.status === s).length }), {});
    body.append(
      el('div', { class: 'grid three' }, [
        el('div', { class: 'stat' }, [el('b', { text: String(counts.Confirmed) }), el('span', { text: 'confirmed — these become rulings with citations' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(counts['Needs confirmation']) }), el('span', { text: 'still waiting on you' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(counts.Rejected) }), el('span', { text: 'rejected — kept on file, excluded from the book' })]),
      ])
    );

    if (counts['Needs confirmation']) {
      body.append(el('div', { class: 'row' }, [
        el('button', {
          class: 'btn ghost sm', type: 'button',
          onclick: () => ctx.patch((s) => { s.findings.forEach((f) => { if (f.status === 'Needs confirmation') f.status = 'Confirmed'; }); ctx.invalidateBook('Findings confirmed.'); }, { rerender: true }),
        }, 'Confirm all remaining'),
        el('button', {
          class: 'btn ghost sm', type: 'button',
          onclick: () => ctx.patch((s) => { s.findings.forEach((f) => { if (f.status === 'Needs confirmation') f.status = 'Rejected'; }); ctx.invalidateBook('Findings rejected.'); }, { rerender: true }),
        }, 'Reject all remaining'),
        el('span', { class: 'tiny muted', text: 'Bulk actions are here for speed, but reading each line is the point of this step.' }),
      ]));
    }

    for (const [i, f] of findings.entries()) {
      const matched = f.foodId || foodByName(f.food);
      const row = el('div', { class: 'card tight stack' }, [
        el('div', { class: 'row between' }, [
          el('div', {}, [
            el('strong', { text: f.food }),
            el('span', { class: 'badge', style: 'margin-left:8px', text: f.level }),
            !matched ? el('span', { class: 'badge', style: 'margin-left:6px', text: 'not in library' }) : null,
          ]),
          el('span', { class: `pill ${f.status === 'Confirmed' ? 'eat' : f.status === 'Rejected' ? 'avoid' : 'moderation'}`, text: f.status }),
        ]),
        el('p', { class: 'tiny muted', style: 'margin:0' }, [
          `Source: ${f.sourceType} · ${f.sourceReference} · confidence ${f.confidence}`,
        ]),
        f.excerpt ? el('p', { class: 'tiny mono', style: 'margin:0;color:var(--ink-3)', text: `“${f.excerpt}”` }) : null,
        el('div', { class: 'row' }, STATUSES.map((s) =>
          el('button', {
            class: `chip`, type: 'button', 'aria-pressed': f.status === s ? 'true' : 'false',
            onclick: () => ctx.patch((st) => { st.findings[i].status = s; ctx.invalidateBook('Findings changed.'); }, { rerender: true }),
          }, s)
        )),
        field({
          label: 'Your note (printed beside the finding)', id: `fnote-${i}`, value: f.note || '',
          placeholder: 'e.g. Matches what I noticed after bread-heavy weeks.',
          onInput: (v) => ctx.patch((s) => { s.findings[i].note = v; }),
        }),
      ]);
      body.append(row);
    }

    body.append(callout({
      variant: 'caution',
      title: 'How confirmed findings are treated',
      text: 'A confirmed panel result becomes “Eat in moderation” or “Occasional” — not “Avoid” — unless you also tag the food as a diagnosed intolerance or medical allergy on step 4. It is marked temporary, carries its page citation into the source index, and is scheduled into the reintroduction protocol so it does not quietly become permanent.',
    }));

    if (ctx.errorFor('findings')) body.append(callout({ variant: 'caution', title: 'Still unconfirmed', text: ctx.errorFor('findings') }));

    body.append(card({
      title: 'Citation preview',
      sub: 'This is exactly how the source index will read.',
      tone: 'quiet',
      children: [table({
        columns: ['Food', 'Level', 'Citation', 'Confidence', 'Status'],
        rows: findings.map((f) => [f.food, f.level, f.sourceReference, f.confidence, f.status]),
      })],
    }));

    return wrap.appendChild(body) && wrap;
  },
};
