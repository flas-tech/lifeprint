// Step 1 — Profile: who the book is for, and the constraints that shape every recipe.
import { el, card, field, chipGroup, optionCards, toast } from '../ui/dom.js';
import { ACTIVITY_LEVELS, SKILL_LEVELS, BUDGETS, STORES, EQUIPMENT } from '../state.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default {
  render(ctx) {
    const st = ctx.state.profile;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 1 of 13' }),
      el('h1', { text: 'Who is this book for?' }),
      el('p', { class: 'lede', text: 'Only your first name is required. Everything else sharpens the plan — portions, prep times, and which recipes survive the filter. Leave anything blank and LifePrint will say so in the book instead of guessing.' })
    );

    const body = el('div', { class: 'step-body' });

    // ---- identity ----
    const identity = el('div', { class: 'grid two' }, [
      field({
        label: 'First name *', id: 'firstName', value: st.firstName, placeholder: 'Taylor',
        attrs: { 'aria-invalid': ctx.errorFor('firstName') ? 'true' : null, maxlength: '40' },
        hint: 'Printed on the cover.',
        onInput: (v) => ctx.patch((s) => { s.profile.firstName = v; ctx.invalidateBook('Name changed.'); }),
      }),
      field({
        label: 'Age', id: 'age', type: 'number', value: st.age, placeholder: '34',
        attrs: { min: '13', max: '110', 'aria-invalid': ctx.errorFor('age') ? 'true' : null },
        hint: 'Used for general life-stage context only. 13–110.',
        onInput: (v) => ctx.patch((s) => { s.profile.age = v; }),
      }),
      field({
        label: 'Sex', id: 'sex', value: st.sex,
        options: [{ id: '', label: 'Prefer not to say' }, { id: 'female', label: 'Female' }, { id: 'male', label: 'Male' }, { id: 'intersex', label: 'Intersex' }],
        hint: 'Affects a few general notes, nothing clinical.',
        onInput: (v) => ctx.patch((s) => { s.profile.sex = v; }),
      }),
      field({
        label: 'Occupation', id: 'occupation', value: st.occupation, placeholder: 'Operations manager',
        hint: 'Helps shape schedule-aware routines.',
        onInput: (v) => ctx.patch((s) => { s.profile.occupation = v; }),
      }),
    ]);
    const identityErr = ctx.errorFor('firstName') || ctx.errorFor('age');
    body.append(card({ title: 'Basics', sub: 'The cover, the greeting, and life-stage context.', children: [identity, identityErr ? el('p', { class: 'err', text: identityErr }) : null] }));

    // ---- measurements ----
    const heightImperial = st.heightUnit === 'imperial';
    const measure = el('div', { class: 'stack' });
    measure.append(
      el('div', { class: 'row' }, [
        el('span', { class: 'label', text: 'Height units' }),
        ...['imperial', 'metric'].map((u) =>
          el('button', {
            class: 'chip', type: 'button', 'aria-pressed': st.heightUnit === u ? 'true' : 'false',
            onclick: () => ctx.patch((s) => { s.profile.heightUnit = u; }, { rerender: true }),
          }, u === 'imperial' ? 'ft / in' : 'cm')
        ),
      ])
    );
    measure.append(
      el('div', { class: 'grid three' }, heightImperial
        ? [
            field({ label: 'Height (ft)', id: 'heightFt', type: 'number', value: st.heightFt, attrs: { min: '3', max: '8' }, onInput: (v) => ctx.patch((s) => { s.profile.heightFt = v; }) }),
            field({ label: 'Height (in)', id: 'heightIn', type: 'number', value: st.heightIn, attrs: { min: '0', max: '11' }, onInput: (v) => ctx.patch((s) => { s.profile.heightIn = v; }) }),
            field({ label: 'Current weight (lb)', id: 'weight', type: 'number', value: st.weight, attrs: { min: '1', 'aria-invalid': ctx.errorFor('weight') ? 'true' : null }, onInput: (v) => ctx.patch((s) => { s.profile.weight = v; s.profile.weightUnit = 'lb'; }) }),
          ]
        : [
            field({ label: 'Height (cm)', id: 'heightCm', type: 'number', value: st.heightCm, attrs: { min: '90', max: '250' }, onInput: (v) => ctx.patch((s) => { s.profile.heightCm = v; }) }),
            field({ label: 'Current weight (kg)', id: 'weight', type: 'number', value: st.weight, attrs: { min: '1', 'aria-invalid': ctx.errorFor('weight') ? 'true' : null }, onInput: (v) => ctx.patch((s) => { s.profile.weight = v; s.profile.weightUnit = 'kg'; }) }),
            el('div', {}),
          ]
      )
    );
    measure.append(
      field({
        label: `Goal weight (${st.weightUnit})`, id: 'goalWeight', type: 'number', value: st.goalWeight,
        hint: 'Optional. If a goal weight implies losing more than roughly 1% of your body weight a week, LifePrint will flag it at the safety review instead of building toward it.',
        onInput: (v) => ctx.patch((s) => { s.profile.goalWeight = v; }),
      })
    );
    if (ctx.errorFor('weight')) measure.append(el('p', { class: 'err', text: ctx.errorFor('weight') }));
    body.append(card({ title: 'Measurements', sub: 'Optional. Nutrition figures in your book stay labeled as estimates either way.', children: [measure] }));

    // ---- activity & kitchen ----
    body.append(
      card({
        title: 'Activity level',
        sub: 'Drives the fitness chapter and how hard the recovery guidance leans.',
        children: [optionCards({
          name: 'Activity level',
          value: st.activityLevel,
          columns: 'three',
          items: ACTIVITY_LEVELS.map((a) => ({ id: a, title: cap(a) })),
          onChange: (v) => ctx.patch((s) => { s.profile.activityLevel = v; ctx.invalidateBook('Activity level changed.'); }),
        })],
      })
    );

    const kitchen = el('div', { class: 'stack' });
    kitchen.append(
      el('div', {}, [
        el('div', { class: 'label', style: 'margin-bottom:8px', text: 'Equipment you actually own' }),
        chipGroup({
          name: 'Equipment',
          items: EQUIPMENT.map((e) => ({ id: e, label: cap(e) })),
          selected: st.equipment,
          onChange: (v) => ctx.patch((s) => { s.profile.equipment = v; ctx.invalidateBook('Equipment changed.'); }),
        }),
        el('div', { class: 'hint', style: 'margin-top:6px', text: 'Recipes that need equipment you do not have are filtered out — a pre-export check enforces this.' }),
      ])
    );
    kitchen.append(
      el('div', { class: 'grid three' }, [
        field({
          label: 'Cooking skill', id: 'cookingSkill', value: st.cookingSkill,
          options: SKILL_LEVELS.map((s) => ({ id: s, label: cap(s) })),
          onInput: (v) => ctx.patch((s) => { s.profile.cookingSkill = v; }),
        }),
        field({
          label: 'Household size', id: 'householdSize', type: 'number', value: st.householdSize,
          attrs: { min: '1', max: '12', 'aria-invalid': ctx.errorFor('householdSize') ? 'true' : null },
          hint: 'Recipes scale to this.',
          onInput: (v) => ctx.patch((s) => { s.profile.householdSize = Number(v) || 1; }),
        }),
        field({
          label: 'Weekly grocery budget', id: 'budget', value: st.budget,
          options: BUDGETS.map((b) => ({ id: b, label: cap(b) })),
          hint: 'Filters out pricier recipes.',
          onInput: (v) => ctx.patch((s) => { s.profile.budget = v; ctx.invalidateBook('Budget changed.'); }),
        }),
      ])
    );
    kitchen.append(
      el('div', { class: 'grid two' }, [
        field({
          label: `Time per meal: ${st.timePerMeal} min`, id: 'timePerMeal', type: 'range', value: st.timePerMeal,
          attrs: { min: '10', max: '90', step: '5' },
          hint: 'Recipes longer than this are excluded from your rotation.',
          onInput: (v, input) => {
            ctx.patch((s) => { s.profile.timePerMeal = Number(v); });
            const label = input.parentElement.querySelector('label');
            if (label) label.textContent = `Time per meal: ${v} min`;
          },
        }),
        field({
          label: `Weekly batch-prep window: ${st.batchWindow} min`, id: 'batchWindow', type: 'range', value: st.batchWindow,
          attrs: { min: '0', max: '240', step: '15' },
          hint: 'Sets the size of the batch-prep chapter.',
          onInput: (v, input) => {
            ctx.patch((s) => { s.profile.batchWindow = Number(v); });
            const label = input.parentElement.querySelector('label');
            if (label) label.textContent = `Weekly batch-prep window: ${v} min`;
          },
        }),
      ])
    );
    if (ctx.errorFor('householdSize')) kitchen.append(el('p', { class: 'err', text: ctx.errorFor('householdSize') }));
    body.append(card({ title: 'Your kitchen and week', sub: 'These are hard constraints, not suggestions — the meal plan respects all four.', children: [kitchen] }));

    body.append(
      card({
        title: 'Where you shop',
        sub: 'Each store you pick gets its own guide chapter. Availability is never guaranteed — stock and formulations change.',
        children: [chipGroup({
          name: 'Stores',
          items: STORES.map((s) => ({ id: s, label: s })),
          selected: st.stores,
          onChange: (v) => {
            ctx.patch((s) => { s.profile.stores = v; ctx.invalidateBook('Stores changed.'); });
            if (v.length > 4) toast('Four or five stores is usually plenty — more just makes the chapter longer.');
          },
        })],
      })
    );

    return wrap.appendChild(body) && wrap;
  },
};
