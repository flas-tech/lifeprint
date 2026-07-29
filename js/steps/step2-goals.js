// Step 2 — Goals and the ranked top three that the book leads with.
import { el, card, field, chipGroup, rankPicker, callout } from '../ui/dom.js';
import { GOALS } from '../state.js';

const CONFLICTING_PAIRS = [
  [['Fat loss'], ['Muscle gain'], 'Losing fat and gaining muscle at the same time is possible but slow. Your book will lean toward protein-forward, moderate-deficit guidance and say so plainly.'],
  [['Lower carbohydrate intake'], ['Improved fitness'], 'Very low carbohydrate intake and hard training can fight each other. The fitness chapter will note where to place the carbohydrates you do eat.'],
  [['Reduced bloating'], ['Higher protein'], 'Some high-protein staples (whey, legumes) are common bloating triggers. The plan will prefer lower-FODMAP protein sources.'],
];

export default {
  render(ctx) {
    const st = ctx.state.goals;
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 2 of 13' }),
      el('h1', { text: 'What do you want this book to do for you?' }),
      el('p', { class: 'lede', text: 'Pick everything that applies, then rank your top three. Ranking matters: it decides which chapter opens the book, which trackers are printed, and what the goal-review page measures.' })
    );

    const body = el('div', { class: 'step-body' });

    body.append(
      card({
        title: 'Goals',
        sub: `${st.selected.length} selected. There is no penalty for choosing many — but a book that chases eight goals equally is a book about nothing, which is why the ranking below exists.`,
        children: [
          chipGroup({
            name: 'Goals',
            items: GOALS.map((g) => ({ id: g, label: g })),
            selected: st.selected,
            onChange: (v) => {
              ctx.patch((s) => {
                s.goals.selected = v;
                s.goals.top3 = s.goals.top3.filter((g) => v.includes(g));
                ctx.invalidateBook('Goals changed.');
              }, { rerender: true });
            },
          }),
          ctx.errorFor('goals') ? el('p', { class: 'err', text: ctx.errorFor('goals') }) : null,
        ],
      })
    );

    if (st.selected.includes('Custom goal')) {
      body.append(
        card({
          title: 'Describe your custom goal',
          children: [
            field({
              label: 'Custom goal', id: 'customGoal', value: st.customGoal, textarea: true,
              placeholder: 'e.g. Eat in a way that keeps my afternoon energy stable through a rotating shift schedule.',
              attrs: { 'aria-invalid': ctx.errorFor('customGoal') ? 'true' : null, maxlength: '400' },
              hint: 'This is quoted verbatim in your goals chapter. LifePrint will not reinterpret it as a medical objective.',
              onInput: (v) => ctx.patch((s) => { s.goals.customGoal = v; }),
            }),
            ctx.errorFor('customGoal') ? el('p', { class: 'err', text: ctx.errorFor('customGoal') }) : null,
          ],
        })
      );
    }

    // ---- ranking ----
    if (st.selected.length) {
      const available = st.selected.filter((g) => !st.top3.includes(g));
      const rankCard = el('div', { class: 'stack' });
      rankCard.append(
        rankPicker({
          items: st.top3.map((g) => ({ id: g, label: g })),
          onChange: (items) => ctx.patch((s) => { s.goals.top3 = items.map((i) => i.id); ctx.invalidateBook('Priorities changed.'); }, { rerender: true }),
        })
      );
      if (st.top3.length < 3 && available.length) {
        rankCard.append(
          el('div', {}, [
            el('div', { class: 'label', style: 'margin:8px 0', text: `Add to your top three (${st.top3.length}/3)` }),
            el('div', { class: 'chips' }, available.map((g) =>
              el('button', {
                class: 'chip', type: 'button',
                onclick: () => ctx.patch((s) => { if (s.goals.top3.length < 3) s.goals.top3.push(g); ctx.invalidateBook('Priorities changed.'); }, { rerender: true }),
              }, `+ ${g}`)
            )),
          ])
        );
      }
      if (ctx.errorFor('top3')) rankCard.append(el('p', { class: 'err', text: ctx.errorFor('top3') }));
      body.append(card({ title: 'Rank your top three', sub: 'Number one gets the most page space and the loudest tracker.', children: [rankCard] }));
    }

    // ---- goal tension notes ----
    const tensions = CONFLICTING_PAIRS.filter(([a, b]) => a.every((g) => st.selected.includes(g)) && b.every((g) => st.selected.includes(g)));
    for (const [a, b, note] of tensions) {
      body.append(callout({ variant: 'info', title: `${a.join(' + ')} alongside ${b.join(' + ')}`, text: note }));
    }
    if (st.selected.length > 6) {
      body.append(callout({
        variant: 'caution',
        title: `${st.selected.length} goals is a lot to carry at once`,
        text: 'LifePrint will still build the book, but progress on ten fronts usually means progress on none. Consider trimming to the three you would defend if someone asked you to justify them.',
      }));
    }
    if (st.selected.includes('Injury recovery support')) {
      body.append(callout({
        variant: 'caution',
        title: 'Injury recovery needs a clinician in the loop',
        text: 'The recovery chapter will stay conservative — general mobility and load-management principles only. It will not prescribe rehabilitation for a specific injury. Bring the clinician page to whoever is treating you.',
      }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
