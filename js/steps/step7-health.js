// Step 7 (optional) — Health, lifestyle, and the flags that change how cautious the book is.
import { el, card, field, chipGroup, toggleList, callout, autocomplete, clear, toast } from '../ui/dom.js';
import { HEALTH_FIELDS, DIAGNOSIS_FLAGS, URGENT_SYMPTOMS } from '../state.js';
import { searchFoods } from '../engine/foods.js';

export default {
  render(ctx) {
    const h = ctx.state.health;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 7 of 13 · optional' }),
      el('h1', { text: 'How is your body doing right now?' }),
      el('p', { class: 'lede', text: 'This shapes the sleep, stress, recovery, and hydration chapters, and it decides how conservative the whole book is. Every field is optional — but the flags at the bottom are the ones that matter most, because they can stop the plan.' })
    );

    const body = el('div', { class: 'step-body' });

    // ---- urgent symptoms first: they gate everything ----
    const urgentOn = URGENT_SYMPTOMS.filter(([k]) => h.urgent[k]);
    body.append(card({
      title: 'Are you experiencing any of these right now?',
      sub: 'These are not diet questions. They are the symptoms that mean a plan should wait until someone has examined you.',
      children: [
        toggleList({
          items: URGENT_SYMPTOMS.map(([k, label]) => ({ id: k, title: label, on: !!h.urgent[k] })),
          onToggle: (k, on) => ctx.patch((s) => { s.health.urgent[k] = on; ctx.invalidateBook('Urgent symptoms changed.'); }, { rerender: true }),
        }),
        urgentOn.length
          ? callout({
              variant: 'urgent',
              title: 'Please talk to a clinician before following any plan',
              text: `You flagged: ${urgentOn.map(([, l]) => l.toLowerCase()).join(', ')}. These can indicate a condition that diet changes will not fix and may mask. LifePrint will still let you build a book, but it will open with this warning on its own page, and you will have to acknowledge it before exporting. If symptoms are severe or sudden, seek urgent care rather than reading a book.`,
            })
          : null,
      ],
    }));

    // ---- diagnosis flags ----
    body.append(card({
      title: 'Anything on this list apply to you?',
      sub: 'Each of these changes what LifePrint is willing to recommend — restrictive protocols get blocked or heavily caveated, and the clinician page gets specific.',
      children: [
        toggleList({
          items: DIAGNOSIS_FLAGS.map(([k, label]) => ({ id: k, title: label, on: !!h.flags[k] })),
          onToggle: (k, on) => ctx.patch((s) => { s.health.flags[k] = on; ctx.invalidateBook('Health flags changed.'); }, { rerender: true }),
        }),
        h.flags.edHistory
          ? callout({
              variant: 'stop',
              title: 'A history of an eating disorder changes this book',
              text: 'LifePrint will remove calorie targets, weight-loss framing, and food-counting trackers from your book, and it will not print a goal weight. The plan becomes structure and variety rather than restriction. Please build this with your treatment team rather than alone.',
            })
          : null,
        h.flags.pregnancy
          ? callout({
              variant: 'stop',
              title: 'Pregnancy: elimination protocols need supervision',
              text: 'Nutrient needs rise during pregnancy and elimination diets can put them at risk. If you selected a restrictive framework, the safety review will ask you to confirm you have spoken to your obstetric provider, and your book will print a nutrient-coverage caution instead of a weight-loss plan.',
            })
          : null,
        h.flags.diabetes || h.flags.kidney || h.flags.liver
          ? callout({
              variant: 'caution',
              title: 'Condition-specific limits are outside LifePrint’s scope',
              text: 'Carbohydrate dosing with insulin, protein and potassium limits in kidney disease, and protein restriction in liver disease are all clinical decisions. Your book will flag every page where those decisions would apply and tell you to get the numbers from your care team.',
            })
          : null,
      ],
    }));

    // ---- general fields ----
    const grid = el('div', { class: 'grid two' });
    for (const [key, label, kind, options] of HEALTH_FIELDS) {
      if (kind === 'select') {
        grid.append(field({
          label, id: key, value: h[key] || '',
          options: [{ id: '', label: '—' }, ...options.map((o) => ({ id: o, label: o }))],
          onInput: (v) => ctx.patch((s) => { s.health[key] = v; ctx.invalidateBook('Health details changed.'); }),
        }));
      } else if (kind === 'multi') {
        grid.append(el('div', { class: 'field' }, [
          el('span', { class: 'label', text: label }),
          chipGroup({
            name: label,
            items: options.map((o) => ({ id: o, label: o })),
            selected: h[key] || [],
            onChange: (v) => ctx.patch((s) => { s.health[key] = v; ctx.invalidateBook('Health details changed.'); }),
          }),
        ]));
      } else if (kind === 'chips') {
        const host = el('div', { class: 'chips', style: 'margin-top:6px' });
        const renderChips = () => {
          clear(host);
          const arr = ctx.state.health[key] || [];
          if (!arr.length) host.append(el('span', { class: 'tiny muted', text: 'Nothing added yet.' }));
          arr.forEach((name, i) => host.append(el('button', {
            class: 'chip removable', type: 'button', 'aria-label': `Remove ${name}`,
            onclick: () => { ctx.patch((s) => { s.health[key].splice(i, 1); }); renderChips(); },
          }, name)));
        };
        const ac = autocomplete({
          id: key, label, hint: 'These build the symptom-association map chapter. Association is not causation, and the book says so.',
          search: (q) => searchFoods(q),
          onPick: (hit) => {
            ctx.patch((s) => {
              if (!Array.isArray(s.health[key])) s.health[key] = [];
              if (s.health[key].includes(hit.name)) { toast('Already on the list.'); return; }
              s.health[key].push(hit.name);
              ctx.invalidateBook('Symptom foods changed.');
            });
            renderChips();
          },
        });
        renderChips();
        ac.chipHost.append(host);
        grid.append(ac.node);
      } else {
        grid.append(field({
          label, id: key, value: h[key] || '', textarea: ['injuries', 'diagnoses', 'medications', 'supplements', 'morningRoutine', 'eveningRoutine'].includes(key),
          hint: key === 'medications' || key === 'supplements' ? 'Listed for your clinician page only. LifePrint never suggests a dose or a change.' : undefined,
          onInput: (v) => ctx.patch((s) => { s.health[key] = v; ctx.invalidateBook('Health details changed.'); }),
        }));
      }
    }
    body.append(card({ title: 'Day-to-day picture', sub: 'Sleep, stress, digestion, movement, schedule. The routines chapter is built almost entirely from these answers.', children: [grid] }));

    if ((h.medications || '').trim() && (h.supplements || '').trim()) {
      body.append(callout({
        variant: 'caution',
        title: 'Medications alongside supplements',
        text: 'Some supplements change how medications are absorbed — and some foods do too, notably grapefruit and high-vitamin-K greens with certain drugs. LifePrint will not attempt to reason about your specific combination. It prints both lists on the clinician page and asks you to have a pharmacist review them.',
      }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
