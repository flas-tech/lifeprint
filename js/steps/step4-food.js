// Step 4 — Food preferences, restrictions, and how you actually eat.
import { el, card, field, chipGroup, autocomplete, callout, toast, clear } from '../ui/dom.js';
import { searchFoods, foodByName } from '../engine/foods.js';
import { RESTRICTION_CATEGORIES, CATEGORY_EXPLAINERS, CUISINES } from '../state.js';

const MEAL_SHAPES = ['Bowls', 'Salads', 'Soups', 'Sheet-pan dinners', 'Stir-fries', 'Sandwiches & wraps', 'Grilled plates', 'Stews & braises', 'Breakfast for dinner', 'Snack plates'];

/** Chip list bound to an array of plain food names. */
function nameList(ctx, key, { label, hint, id }) {
  const arr = ctx.state.food[key];
  const host = el('div', { class: 'chips', style: 'margin-top:6px' });
  const renderChips = () => {
    clear(host);
    if (!arr.length) host.append(el('span', { class: 'tiny muted', text: 'Nothing added yet.' }));
    for (const name of arr) {
      host.append(
        el('button', {
          class: 'chip removable', type: 'button', 'aria-label': `Remove ${name}`,
          onclick: () => {
            const i = ctx.state.food[key].indexOf(name);
            ctx.patch((s) => { s.food[key].splice(i, 1); ctx.invalidateBook('Food preferences changed.'); });
            renderChips();
          },
        }, name)
      );
    }
  };
  const ac = autocomplete({
    id, label, hint,
    search: (q) => searchFoods(q),
    onPick: (hit) => {
      if (ctx.state.food[key].includes(hit.name)) {
        toast(`${hit.name} is already on that list.`);
        return;
      }
      ctx.patch((s) => { s.food[key].push(hit.name); ctx.invalidateBook('Food preferences changed.'); });
      renderChips();
    },
  });
  renderChips();
  ac.chipHost.append(host);
  return ac.node;
}

export default {
  render(ctx) {
    const st = ctx.state.food;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 4 of 13' }),
      el('h1', { text: 'What do you like, and what is off the table?' }),
      el('p', { class: 'lede', text: 'Foods you love get pulled into the rotation first. Foods you exclude need a category — the category is what decides whether a food is gone forever, gone for a phase, or simply not on the menu.' })
    );

    const body = el('div', { class: 'step-body' });

    // ---- favourites ----
    body.append(card({
      title: 'Foods you actually enjoy',
      sub: 'Search the library — matches include aliases, so “garbanzo” finds chickpeas. Anything not in the library can still be added as free text.',
      children: [
        el('div', { class: 'grid two' }, [
          nameList(ctx, 'favProteins', { id: 'fav-protein', label: 'Favourite proteins', hint: 'Anchors most dinners.' }),
          nameList(ctx, 'favVeg', { id: 'fav-veg', label: 'Favourite vegetables', hint: 'Two colours per plate is the target.' }),
          nameList(ctx, 'favFruit', { id: 'fav-fruit', label: 'Favourite fruit', hint: 'Used for snacks and breakfasts.' }),
          nameList(ctx, 'commonlyEaten', { id: 'common', label: 'What you already eat most weeks', hint: 'Keeping familiar foods is the single biggest predictor of sticking with a plan.' }),
        ]),
      ],
    }));

    body.append(card({
      title: 'Dislikes and cravings',
      sub: 'Dislikes are excluded outright — a pre-export check verifies none slipped into a recipe. Cravings are not judged; they get honest swaps and a place in the plan.',
      children: [
        el('div', { class: 'grid two' }, [
          nameList(ctx, 'dislikes', { id: 'dislikes', label: 'Foods you dislike', hint: 'Never printed as a recommendation.' }),
          nameList(ctx, 'craved', { id: 'craved', label: 'Foods you crave', hint: 'Gets a swap list, not a lecture.' }),
        ]),
      ],
    }));

    // ---- restrictions ----
    const restrictionHost = el('div', { class: 'stack' });
    const renderRestrictions = () => {
      clear(restrictionHost);
      if (!st.restrictions.length) {
        restrictionHost.append(el('p', { class: 'muted tiny', text: 'No exclusions yet. That is a valid answer.' }));
      }
      st.restrictions.forEach((r, i) => {
        const isAllergy = r.category === 'Medical allergy';
        const row = el('div', { class: 'card tight', style: 'background:var(--paper-2)' }, [
          el('div', { class: 'row between' }, [
            el('strong', { text: r.food }),
            el('button', {
              class: 'btn quiet sm', type: 'button',
              onclick: () => { ctx.patch((s) => { s.food.restrictions.splice(i, 1); ctx.invalidateBook('Restrictions changed.'); }); renderRestrictions(); },
            }, 'Remove'),
          ]),
          field({
            label: 'Why is it excluded?', id: `rcat-${i}`, value: r.category || '',
            options: [{ id: '', label: 'Choose a category…' }, ...RESTRICTION_CATEGORIES.map((c) => ({ id: c, label: c }))],
            attrs: { 'aria-invalid': !r.category ? 'true' : null },
            onInput: (v) => { ctx.patch((s) => { s.food.restrictions[i].category = v; ctx.invalidateBook('Restrictions changed.'); }); renderRestrictions(); },
          }),
          r.category ? el('p', { class: 'hint', text: CATEGORY_EXPLAINERS[r.category] }) : el('p', { class: 'err', text: 'A category is required — it sets the precedence level for this food.' }),
          isAllergy
            ? field({
                label: 'Severity', id: `rsev-${i}`, value: r.severity || 'moderate',
                options: [{ id: 'mild', label: 'Mild' }, { id: 'moderate', label: 'Moderate' }, { id: 'severe', label: 'Severe / anaphylaxis' }],
                hint: 'Severe adds an unmissable cross-contact page and an emergency-plan reminder.',
                onInput: (v) => ctx.patch((s) => { s.food.restrictions[i].severity = v; ctx.invalidateBook('Allergy severity changed.'); }),
              })
            : null,
          field({
            label: 'Note (optional)', id: `rnote-${i}`, value: r.note || '', placeholder: 'e.g. Confirmed by skin-prick test, 2019.',
            onInput: (v) => ctx.patch((s) => { s.food.restrictions[i].note = v; }),
          }),
        ]);
        restrictionHost.append(row);
      });
    };
    renderRestrictions();

    const addRestriction = autocomplete({
      id: 'add-restriction',
      label: 'Add a food to exclude',
      hint: 'One entry per food. Allergen families expand automatically — adding almonds also covers cashews, pistachios, and the rest of the tree-nut family.',
      search: (q) => searchFoods(q),
      onPick: (hit) => {
        if (st.restrictions.some((r) => r.food.toLowerCase() === hit.name.toLowerCase())) {
          toast(`${hit.name} is already excluded.`);
          return;
        }
        ctx.patch((s) => {
          s.food.restrictions.push({ id: `r-${Date.now()}`, food: hit.name, category: '', severity: 'moderate', note: '' });
          ctx.invalidateBook('Restrictions changed.');
        });
        renderRestrictions();
      },
    });

    body.append(card({
      title: 'Foods you exclude',
      sub: 'The category matters more than the food. A medical allergy is permanent and outranks everything; a sensitivity-panel result is treated as temporary and reintroducible; a preference is never framed as medical.',
      children: [
        addRestriction.node,
        ctx.errorFor('restrictions') ? el('p', { class: 'err', text: ctx.errorFor('restrictions') }) : null,
        el('div', { class: 'divider' }),
        restrictionHost,
      ],
    }));

    body.append(card({
      title: 'Religious or ethical restrictions',
      sub: 'Handled as absolute exclusions and never questioned in the text.',
      children: [nameList(ctx, 'religiousRestrictions', { id: 'religious', label: 'Foods excluded on religious or ethical grounds', hint: 'e.g. pork, shellfish, beef.' })],
    }));

    // ---- refuse to eliminate ----
    body.append(card({
      title: 'Foods you will not give up',
      sub: 'Be honest here. LifePrint keeps these where it safely can, and where it cannot — an allergy, a clinician instruction — it says exactly why, in writing, instead of quietly deleting your request.',
      children: [
        nameList(ctx, 'refuseToEliminate', { id: 'refuse', label: 'Non-negotiables', hint: 'Coffee, cheese, bread, wine — whatever it is.' }),
        st.refuseToEliminate.length
          ? callout({
              variant: 'info',
              title: 'How these are reconciled',
              text: 'If a non-negotiable is also excluded by a framework or a preference, it is downgraded to “Eat in moderation” and marked as your explicit override. If it is excluded by an allergy, a diagnosed intolerance, or a clinician instruction, it stays on Avoid — and the book prints the reason next to your request.',
            })
          : null,
      ],
    }));

    // ---- eating rhythm ----
    const rhythm = el('div', { class: 'stack' });
    rhythm.append(
      el('div', { class: 'grid three' }, [
        field({
          label: 'Meals per day', id: 'mealsPerDay', type: 'number', value: st.mealsPerDay,
          attrs: { min: '1', max: '6', 'aria-invalid': ctx.errorFor('mealsPerDay') ? 'true' : null },
          hint: 'The plan builds exactly this many slots per day.',
          onInput: (v) => ctx.patch((s) => { s.food.mealsPerDay = Number(v) || 3; ctx.invalidateBook('Meal frequency changed.'); }),
        }),
        field({ label: 'Snacks', id: 'snacks', value: st.snacks, options: ['never', 'rarely', 'sometimes', 'often'].map((x) => ({ id: x, label: x })), onInput: (v) => ctx.patch((s) => { s.food.snacks = v; }) }),
        field({ label: 'Coffee', id: 'coffee', value: st.coffee, options: ['none', '1-2 cups', '3+ cups'].map((x) => ({ id: x, label: x })), onInput: (v) => ctx.patch((s) => { s.food.coffee = v; }) }),
        field({ label: 'Alcohol', id: 'alcohol', value: st.alcohol, options: ['never', 'rarely', 'weekly', 'most days'].map((x) => ({ id: x, label: x })), onInput: (v) => ctx.patch((s) => { s.food.alcohol = v; }) }),
        field({ label: 'Dessert', id: 'dessert', value: st.dessert, options: ['never', 'rarely', 'sometimes', 'often'].map((x) => ({ id: x, label: x })), onInput: (v) => ctx.patch((s) => { s.food.dessert = v; }) }),
        field({ label: 'Dining out', id: 'diningOut', value: st.diningOut, options: ['rarely', '1-2x/week', 'weekly', '3+ times a week', 'most meals'].map((x) => ({ id: x, label: x })), onInput: (v) => ctx.patch((s) => { s.food.diningOut = v; }) }),
      ])
    );
    if (ctx.errorFor('mealsPerDay')) rhythm.append(el('p', { class: 'err', text: ctx.errorFor('mealsPerDay') }));
    rhythm.append(el('div', { class: 'divider' }));
    rhythm.append(el('div', { class: 'label', style: 'margin-bottom:8px', text: 'Meal shapes you like' }));
    rhythm.append(chipGroup({
      name: 'Meal shapes',
      items: MEAL_SHAPES.map((m) => ({ id: m, label: m })),
      selected: st.preferredMeals,
      onChange: (v) => ctx.patch((s) => { s.food.preferredMeals = v; ctx.invalidateBook('Meal shapes changed.'); }),
    }));
    rhythm.append(el('div', { class: 'label', style: 'margin:16px 0 8px', text: 'Cuisines you gravitate toward' }));
    rhythm.append(chipGroup({
      name: 'Cuisines',
      items: CUISINES.map((c) => ({ id: c, label: c })),
      selected: st.cuisines,
      onChange: (v) => ctx.patch((s) => { s.food.cuisines = v; ctx.invalidateBook('Cuisines changed.'); }),
    }));
    body.append(card({ title: 'How you eat', sub: 'Rhythm and shape. This is what keeps the plan recognizable as your life rather than someone else’s.', children: [rhythm] }));

    if (st.mealsPerDay <= 2) {
      body.append(callout({
        variant: 'caution',
        title: 'Two meals a day or fewer',
        text: 'That is a legitimate pattern for some people and a poor fit for others — particularly during pregnancy, with diabetes, or with any history of restrictive eating. Your book will build the slots you asked for and flag this at the safety review.',
      }));
    }

    const unmatched = [...st.favProteins, ...st.favVeg, ...st.favFruit, ...st.dislikes].filter((n) => !foodByName(n));
    if (unmatched.length) {
      body.append(callout({
        variant: 'info',
        title: `${unmatched.length} entr${unmatched.length === 1 ? 'y is' : 'ies are'} outside the food library`,
        text: `${unmatched.slice(0, 8).join(', ')} — these are kept as your own notes and printed in your book, but they cannot be matched to markers, substitutes, or recipes. Nothing is silently dropped.`,
      }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
