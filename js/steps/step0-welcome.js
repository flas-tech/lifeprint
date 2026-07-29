// Step 0 — Welcome, scope, and the disclaimer you must read before anything else.
import { el, card, callout } from '../ui/dom.js';
import { FOOD_COUNT } from '../engine/foods.js';
import { RECIPE_COUNT } from '../engine/recipes.js';
import { PROTOCOL_COUNT } from '../engine/protocols.js';
import { CHAPTERS } from '../state.js';

export default {
  render(ctx) {
    const wrap = el('div', {});

    wrap.append(
      el('section', { class: 'hero' }, [
        el('div', { class: 'grid two', style: 'align-items:center;gap:48px' }, [
          el('div', {}, [
            el('div', { class: 'eyebrow', text: 'Personalized nutrition & lifestyle books' }),
            el('h1', { text: 'A book about how you eat, written from your answers.' }),
            el('p', { class: 'lede', text: 'Answer a structured intake, optionally add your own lab or food-sensitivity reports, and LifePrint assembles a printable book: food rulings with reasons, a meal plan you can actually cook, grocery lists by aisle, routines, trackers, and a page you can hand to your clinician.' }),
            el('div', { class: 'hero-actions' }, [
              el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(1) }, 'Build my book'),
              el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.openMenu() }, 'Load a demo profile'),
            ]),
            el('p', { class: 'tiny muted', style: 'margin-top:16px', text: 'No account. No server. Nothing you type or upload leaves this browser.' }),
          ]),
          el('div', { class: 'hero-art' }, [
            el('div', { class: 'center', style: 'padding:32px' }, [
              el('div', { style: 'font-family:var(--display);font-size:1.9rem;line-height:1.15;color:var(--forest)' }, 'Your Nutrition & Lifestyle Guide'),
              el('div', { class: 'tiny muted', style: 'margin-top:10px', text: 'Personalized edition · printable PDF' }),
              el('div', { style: 'margin-top:22px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap' }, [
                el('span', { class: 'pill eat', text: 'Eat freely' }),
                el('span', { class: 'pill moderation', text: 'Eat in moderation' }),
                el('span', { class: 'pill occasional', text: 'Occasional' }),
                el('span', { class: 'pill avoid', text: 'Avoid' }),
              ]),
            ]),
          ]),
        ]),
      ])
    );

    const body = el('div', { class: 'step-body' });

    body.append(
      callout({
        variant: 'caution',
        title: 'Read this first: LifePrint is educational, not medical care',
        text: 'LifePrint does not diagnose, treat, or cure anything, and it is not a substitute for a physician, registered dietitian, or therapist. It reorganizes what you tell it into a structured plan. Food-sensitivity panels (IgG and similar) are not allergy tests and are treated here as temporary, reintroducible signals. If you have a diagnosed allergy, are pregnant, manage diabetes, kidney or liver disease, or have any history of an eating disorder, review the plan with a clinician before you follow it.',
      })
    );

    body.append(
      el('div', { class: 'grid three' }, [
        el('div', { class: 'stat' }, [el('b', { text: String(FOOD_COUNT) }), el('span', { text: 'foods in the library, each with markers, substitutes and prep notes' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(PROTOCOL_COUNT) }), el('span', { text: 'framework rulesets that can be stacked and reconciled' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(RECIPE_COUNT) }), el('span', { text: 'seed recipes, filtered against your own rules' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(CHAPTERS.length) }), el('span', { text: 'possible chapters — reorder or switch any of them off' })]),
      ])
    );

    body.append(
      card({
        title: 'How it works',
        sub: 'Thirteen steps. Three of them are optional. You can leave and come back — progress saves as you type.',
        children: [
          el('ol', {}, [
            el('li', { text: 'Tell us about you: profile, goals, framework, food preferences, restrictions.' }),
            el('li', { text: 'Optionally upload lab or sensitivity reports. Parsing happens in this tab; files never upload anywhere.' }),
            el('li', { text: 'Confirm every finding we extract. Nothing is applied to your book until you say so.' }),
            el('li', { text: 'Choose chapters, length, tone, and one of eleven book styles.' }),
            el('li', { text: 'Review safety flags, then generate. Edit any paragraph, then export a print-ready PDF.' }),
          ]),
        ],
      })
    );

    body.append(
      el('div', { class: 'grid two' }, [
        card({
          title: 'What makes the rulings trustworthy',
          tone: 'quiet',
          children: [
            el('ul', {}, [
              el('li', { text: 'A documented eight-level precedence order — a medical allergy always outranks a framework preference.' }),
              el('li', { text: 'Every food ruling carries its source, confidence, and whether it is temporary.' }),
              el('li', { text: 'Contradictions between frameworks are surfaced to you, not silently resolved.' }),
              el('li', { text: 'Seventeen validation checks run before any export.' }),
            ]),
          ],
        }),
        card({
          title: 'What LifePrint will never do',
          tone: 'quiet',
          children: [
            el('ul', {}, [
              el('li', { text: 'Prescribe supplement doses, medication changes, or calorie targets as clinical goals.' }),
              el('li', { text: 'Call an IgG panel result an allergy.' }),
              el('li', { text: 'Override an instruction you attribute to your clinician.' }),
              el('li', { text: 'Send your data anywhere — there is no backend to send it to.' }),
            ]),
          ],
        }),
      ])
    );

    wrap.append(body);
    return wrap;
  },
};
