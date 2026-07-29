// Step 10 — the 12-stage build, run visibly so you can see what the engine did.
import { el, card, callout, clear, toast } from '../ui/dom.js';
import { PIPELINE } from '../pipeline.js';

export default {
  showNav: false,
  render(ctx) {
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 10 of 13' }),
      el('h1', { text: 'Building your book.' }),
      el('p', { class: 'lede', text: 'Twelve stages, all running in this tab. No request leaves your browser — the rules engine, the meal-plan generator, and the validator are all plain JavaScript reading your answers.' })
    );

    const body = el('div', { class: 'step-body' });
    const list = el('ol', { class: 'pipeline' });
    const nodes = PIPELINE.map(([id, label]) => {
      const li = el('li', { dataset: { state: 'idle' } }, [
        el('span', { class: 'pl-dot', 'aria-hidden': 'true' }),
        el('span', { text: label }),
        el('span', { class: 'pl-note' }),
      ]);
      list.append(li);
      return li;
    });

    const summary = el('div', { class: 'stack' });
    const startBtn = el('button', { class: 'btn', type: 'button' }, ctx.state.book && !ctx.state.book.stale ? 'Rebuild the book' : 'Start building');

    const run = async () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Building…';
      clear(summary);
      nodes.forEach((n) => { n.dataset.state = 'idle'; n.querySelector('.pl-note').textContent = ''; });
      const t0 = performance.now();
      try {
        const { book, validation } = await ctx.runPipeline((i, label, state) => {
          nodes[i].dataset.state = state;
          if (state === 'done') nodes[i].querySelector('.pl-note').textContent = `${Math.round(performance.now() - t0)}ms`;
        });
        const failed = validation.failed;
        summary.append(
          el('div', { class: 'grid three' }, [
            el('div', { class: 'stat' }, [el('b', { text: String(book.chapters.length) }), el('span', { text: 'chapters written' })]),
            el('div', { class: 'stat' }, [el('b', { text: String(book.stats.mealPlanDays) }), el('span', { text: 'days of meals' })]),
            el('div', { class: 'stat' }, [el('b', { text: String(book.stats.groceryItems) }), el('span', { text: 'grocery items by aisle' })]),
            el('div', { class: 'stat' }, [el('b', { text: String(book.stats.rulings['Eat freely'] + book.stats.rulings['Eat in moderation']) }), el('span', { text: 'foods you can eat' })]),
            el('div', { class: 'stat' }, [el('b', { text: String(book.stats.rulings.Avoid) }), el('span', { text: 'foods on avoid' })]),
            el('div', { class: 'stat' }, [el('b', { text: `${validation.passed}/${validation.checks.length}` }), el('span', { text: 'validation checks passed' })]),
          ])
        );
        summary.append(
          failed
            ? callout({ variant: 'stop', title: `${failed} validation check${failed === 1 ? '' : 's'} failed`, text: 'The book was still assembled, but the export step will show exactly what failed and why. Do not print it until those are resolved.' })
            : callout({ variant: 'info', title: 'Build clean', text: `Every validation check passed in ${Math.round(performance.now() - t0)}ms. You can now edit any paragraph, regenerate individual sections, and export.` })
        );
        summary.append(el('div', { class: 'row' }, [
          el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(11, { validate: false }) }, 'Open the book editor →'),
          el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(12, { validate: false }) }, 'Skip to export'),
        ]));
        toast('Book generated.');
      } catch (err) {
        summary.append(callout({ variant: 'stop', title: 'The build failed', text: `${err.message}. Your answers are safe — nothing was lost. Try again, and if it keeps failing, export your answers as JSON from “Book & data” so you do not lose them.` }));
        // eslint-disable-next-line no-console
        console.error(err);
      }
      startBtn.disabled = false;
      startBtn.textContent = 'Rebuild the book';
    };
    startBtn.addEventListener('click', run);

    body.append(card({
      title: 'Pipeline',
      sub: 'Each stage is a real function over your data — you can read them in js/engine/.',
      children: [list, el('div', { class: 'divider' }), el('div', { class: 'row' }, [startBtn, el('span', { class: 'tiny muted', text: 'Rebuilding keeps every edit you have made unless you ask for a fresh draft.' })]), summary],
    }));

    if (ctx.state.book) {
      body.append(callout({
        variant: ctx.state.book.stale ? 'caution' : 'info',
        title: ctx.state.book.stale ? 'Your existing book is out of date' : 'You already have a generated book',
        text: ctx.state.book.stale
          ? `${ctx.state.book.staleReason} Rebuild to pick up the changes — your paragraph edits are preserved.`
          : `Generated ${new Date(ctx.state.book.generatedAt).toLocaleString()} with ${ctx.state.book.chapters.length} chapters. You can go straight to the editor, or rebuild from scratch.`,
      }));
      body.append(el('div', { class: 'row' }, [
        el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(11, { validate: false }) }, 'Open the editor'),
        el('button', {
          class: 'btn quiet', type: 'button',
          onclick: () => ctx.confirmModal({
            title: 'Discard edits and rebuild fresh?',
            message: 'This throws away every paragraph edit and regenerated variant, then rebuilds from your answers.',
            confirmLabel: 'Discard and rebuild',
            onConfirm: () => { ctx.patch((s) => { s.regenerateFresh = true; s.book = null; }); run().then(() => ctx.patch((s) => { s.regenerateFresh = false; })); },
          }),
        }, 'Fresh draft (discard edits)'),
      ]));
    }

    body.append(el('div', { class: 'row', style: 'margin-top:24px' }, [
      el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(9, { validate: false }) }, '← Back to safety review'),
    ]));

    return wrap.appendChild(body) && wrap;
  },
};
