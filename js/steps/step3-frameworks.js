// Step 3 — Lifestyle frameworks, stacking, and live conflict resolution.
import { el, card, field, callout, table, toast } from '../ui/dom.js';
import { PROTOCOLS } from '../engine/protocols.js';
import { detectConflicts, survivingFoodCount, CONFLICT_OPTIONS } from '../engine/conflicts.js';
import { FOOD_COUNT } from '../engine/foods.js';

export default {
  render(ctx) {
    const st = ctx.state.frameworks;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 3 of 13' }),
      el('h1', { text: 'Which framework are you following?' }),
      el('p', { class: 'lede', text: 'Pick one if you have a clear approach, or stack several. Stacking is where most plans quietly break, so LifePrint shows you what each combination costs before you commit — including how many foods are left standing.' })
    );

    const body = el('div', { class: 'step-body' });

    // ---- framework cards ----
    const grid = el('div', { class: 'grid two' });
    for (const p of PROTOCOLS) {
      const on = st.selected.includes(p.id);
      const node = el('button', {
        class: 'optcard', type: 'button', 'aria-pressed': on ? 'true' : 'false',
        onclick: () => ctx.patch((s) => {
          const set = new Set(s.frameworks.selected);
          if (set.has(p.id)) set.delete(p.id);
          else set.add(p.id);
          s.frameworks.selected = [...set];
          s.frameworks.conflictChoice = '';
          s.frameworks.acknowledgedConflicts = [];
          ctx.invalidateBook('Frameworks changed.');
        }, { rerender: true }),
      }, [
        el('span', { class: 'oc-mark', 'aria-hidden': 'true' }),
        el('span', {}, [
          el('span', { class: 'oc-title' }, [p.name, p.supervision ? el('span', { class: 'badge', style: 'margin-left:6px', text: 'supervision' }) : null]),
          el('span', { class: 'oc-desc', text: p.blurb }),
        ]),
      ]);
      grid.append(node);
    }
    body.append(card({
      title: 'Frameworks',
      sub: `${st.selected.length} selected. “Balanced omnivore” is a legitimate answer and eliminates nothing.`,
      children: [grid, ctx.errorFor('frameworks') ? el('p', { class: 'err', text: ctx.errorFor('frameworks') }) : null],
    }));

    if (st.selected.includes('custom-framework')) {
      body.append(card({
        title: 'Describe your custom framework',
        children: [field({
          label: 'Custom framework', id: 'customText', value: st.customText, textarea: true,
          placeholder: 'e.g. No pork or shellfish, dinner finished by 7pm, one meat-free day a week.',
          attrs: { 'aria-invalid': ctx.errorFor('customText') ? 'true' : null, maxlength: '800' },
          hint: 'Printed verbatim in your framework chapter. LifePrint applies whatever it can match to the food library and lists the rest as your own rules.',
          onInput: (v) => ctx.patch((s) => { s.frameworks.customText = v; }),
        }), ctx.errorFor('customText') ? el('p', { class: 'err', text: ctx.errorFor('customText') }) : null],
      }));
    }

    if (st.selected.includes('clinician-custom')) {
      body.append(card({
        title: 'Clinician instructions',
        sub: 'Anything you enter here outranks every framework, preference, and craving in the book. Nothing in LifePrint can override it.',
        children: [field({
          label: 'What did your clinician tell you?', id: 'clinicianText', value: st.clinicianText, textarea: true,
          placeholder: 'e.g. Avoid gluten entirely (celiac, biopsy-confirmed 2021). Limit raw cruciferous vegetables. Sodium under 2g/day.',
          attrs: { 'aria-invalid': ctx.errorFor('clinicianText') ? 'true' : null, maxlength: '1200' },
          hint: 'Use one instruction per line. Lines starting with “avoid”, “no”, or “limit” are parsed against the food library; everything else is printed as-is.',
          onInput: (v) => ctx.patch((s) => { s.frameworks.clinicianText = v; ctx.invalidateBook('Clinician instructions changed.'); }),
        }), ctx.errorFor('clinicianText') ? el('p', { class: 'err', text: ctx.errorFor('clinicianText') }) : null],
      }));
    }

    // ---- what each selection eliminates ----
    if (st.selected.length) {
      const rows = st.selected.map((id) => {
        const p = PROTOCOLS.find((x) => x.id === id);
        return [
          p.name,
          (p.eliminatesGroups || []).length ? p.eliminatesGroups.join(', ') : 'nothing outright',
          (p.limitMarkers || []).length ? p.limitMarkers.join(', ') : '—',
          p.emphasize.slice(0, 4).join(', '),
        ];
      });
      body.append(card({
        title: 'What your stack removes',
        sub: 'Read this row by row. Every exclusion below shows up as “Avoid” in your book with the framework named as its source.',
        children: [table({ columns: ['Framework', 'Removes', 'Limits', 'Emphasizes'], rows })],
      }));

      const surviving = survivingFoodCount(st.selected);
      const pct = Math.round((surviving / FOOD_COUNT) * 100);
      body.append(
        el('div', { class: 'grid three' }, [
          el('div', { class: 'stat' }, [el('b', { text: String(surviving) }), el('span', { text: `foods still allowed out of ${FOOD_COUNT} (${pct}%)` })]),
          el('div', { class: 'stat' }, [el('b', { text: String(st.selected.length) }), el('span', { text: 'frameworks stacked' })]),
          el('div', { class: 'stat' }, [el('b', { text: st.selected.some((id) => (PROTOCOLS.find((p) => p.id === id) || {}).supervision) ? 'Yes' : 'No' }), el('span', { text: 'stack includes a framework meant to be supervised' })]),
        ])
      );
      if (surviving < 60) {
        body.append(callout({
          variant: 'caution',
          title: 'Your food library is getting narrow',
          text: `Only ${surviving} foods survive this combination. LifePrint can still build a book, but variety, protein, and micronutrient coverage all get harder from here — and the meal plan will repeat itself. This is worth a conversation with a dietitian.`,
        }));
      }
    }

    // ---- conflicts ----
    const conflicts = detectConflicts(ctx.state);
    if (conflicts.length) {
      const list = el('div', { class: 'stack' });
      for (const c of conflicts) {
        const acked = (st.acknowledgedConflicts || []).includes(c.id);
        list.append(
          el('div', { class: `callout ${c.severity === 'high' ? 'stop' : 'caution'}` }, [
            el('h4', {}, [c.title, el('span', { class: 'badge', style: 'margin-left:8px', text: `${c.severity} severity` })]),
            el('p', { text: c.explanation }),
            el('p', {}, [el('strong', { text: 'What we suggest: ' }), c.recommendation]),
            el('div', { class: 'callout-actions' }, [
              el('button', {
                class: `btn ${acked ? 'ghost' : 'clay'} sm`, type: 'button',
                onclick: () => ctx.patch((s) => {
                  const set = new Set(s.frameworks.acknowledgedConflicts || []);
                  if (set.has(c.id)) set.delete(c.id);
                  else set.add(c.id);
                  s.frameworks.acknowledgedConflicts = [...set];
                }, { rerender: true }),
              }, acked ? '✓ Acknowledged' : 'I understand this trade-off'),
            ]),
          ])
        );
      }
      body.append(card({
        title: `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} in your stack`,
        sub: 'LifePrint will not silently resolve these. Choose how you want to proceed — your choice is printed in the book so future-you knows it was deliberate.',
        children: [
          list,
          el('div', { class: 'divider' }),
          el('div', { class: 'label', style: 'margin-bottom:8px', text: 'How do you want to proceed?' }),
          el('div', { class: 'grid three' }, CONFLICT_OPTIONS.map((o) =>
            el('button', {
              class: 'optcard', type: 'button', 'aria-pressed': st.conflictChoice === o.id ? 'true' : 'false',
              onclick: () => {
                ctx.patch((s) => { s.frameworks.conflictChoice = o.id; ctx.invalidateBook('Conflict resolution changed.'); }, { rerender: true });
                if (o.id === 'adjust') toast('Adjust your framework selections above — the conflict list updates live.');
                if (o.id === 'supervision') toast('A clinician-review page will list every conflict.');
              },
            }, [
              el('span', { class: 'oc-mark', 'aria-hidden': 'true' }),
              el('span', {}, [el('span', { class: 'oc-title', text: o.label }), el('span', { class: 'oc-desc', text: o.description })]),
            ])
          )),
          !st.conflictChoice
            ? el('p', { class: 'hint', style: 'margin-top:10px', text: 'No choice yet — you can continue without one, and the safety review will ask again.' })
            : null,
        ],
      }));
    } else if (st.selected.length) {
      body.append(callout({ variant: 'info', title: 'No conflicts detected in this stack', text: 'These frameworks agree with each other closely enough to combine. LifePrint re-checks this at the safety review in case your restrictions change the picture.' }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
