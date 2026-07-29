// Step 11 — the book editor: read it, edit it, regenerate parts, lock what you like.
import { el, card, callout, clear, toast, modal, field } from '../ui/dom.js';
import { renderChapter } from '../ui/blocks.js';
import { buildRules } from '../engine/rules.js';
import { buildBook } from '../engine/book.js';
import { validateBook } from '../engine/validate.js';

export default {
  showNav: false,
  render(ctx) {
    const wrap = el('div', {});
    const book = ctx.state.book;

    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 11 of 13' }),
      el('h1', { text: book ? book.title : 'No book yet' })
    );

    if (!book) {
      wrap.append(
        el('div', { class: 'step-body' }, [
          callout({ variant: 'info', title: 'Nothing to edit yet', text: 'Generate the book first — it takes about a second.' }),
          el('div', { class: 'row' }, [el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(10, { validate: false }) }, 'Go to generate')]),
        ])
      );
      return wrap;
    }

    wrap.append(el('p', { class: 'lede', text: 'Every paragraph here can be rewritten in your own words or regenerated as a different variant. Edits are kept when you rebuild. Lock a chapter to freeze it exactly as it reads now.' }));

    const body = el('div', { class: 'step-body' });

    if (book.stale) {
      body.append(callout({
        variant: 'caution',
        title: 'This book is older than your answers',
        text: `${book.staleReason} Rebuild from step 10 to refresh it — your edits survive.`,
      }));
    }

    const rebuild = ({ fresh = false } = {}) => {
      const rules = buildRules(ctx.state);
      const next = buildBook(ctx.state, {
        rules,
        edits: fresh ? {} : ctx.state.book.edits,
        variants: fresh ? {} : ctx.state.book.variants,
      });
      next.validation = validateBook(next, ctx.state, rules);
      next.locked = ctx.state.book.locked;
      ctx.patch((s) => { s.book = next; });
      return next;
    };

    // ---- toolbar ----
    const toolbar = el('div', { class: 'row between', style: 'margin-bottom:8px' }, [
      el('div', { class: 'row' }, [
        el('span', { class: 'badge on', text: `${book.chapters.length} chapters` }),
        el('span', { class: 'badge', text: `${book.stats.mealPlanDays}-day plan` }),
        el('span', { class: 'badge', text: `target ~${book.targetPages} pages` }),
        el('span', { class: 'badge', text: book.style }),
        el('span', { class: 'badge', text: `${Object.keys(book.edits || {}).length} edit(s)` }),
      ]),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { rebuild(); ctx.render(); toast('Rebuilt with your edits kept.'); } }, 'Rebuild'),
        el('button', { class: 'btn sm', type: 'button', onclick: () => ctx.go(12, { validate: false }) }, 'Export →'),
      ]),
    ]);
    body.append(toolbar);

    // ---- preview shell ----
    const tocPane = el('nav', { class: 'toc-pane', 'aria-label': 'Chapters' });
    const bookNode = el('article', { class: 'book', 'data-theme': book.style });

    const tocList = el('ol', {});
    book.chapters.forEach((c, i) => {
      tocList.append(el('li', {}, [el('a', { href: `#ch-${c.id}`, text: `${i + 1}. ${c.title}` })]));
    });
    tocPane.append(el('div', { class: 'rail-title', text: 'Contents' }), tocList);

    const editParagraph = (block) => {
      let draft = block.text;
      modal({
        title: 'Edit this paragraph',
        bodyNodes: [
          el('p', { class: 'tiny muted', text: 'Your words replace the generated text and are kept through every rebuild. Clear the box and save to restore the generated version.' }),
          field({
            label: 'Text', id: 'edit-block', value: block.text, textarea: true,
            attrs: { rows: '7' },
            onInput: (v) => { draft = v; },
          }),
        ],
        actions: [
          { label: 'Cancel' },
          {
            label: 'Save', kind: 'clay',
            onClick: () => {
              ctx.patch((s) => {
                s.book.edits = s.book.edits || {};
                if (draft.trim()) s.book.edits[block.id] = draft.trim();
                else delete s.book.edits[block.id];
              });
              rebuild();
              ctx.render();
              toast(draft.trim() ? 'Paragraph updated.' : 'Reverted to the generated text.');
            },
          },
        ],
      });
    };

    const regenerate = (block) => {
      ctx.patch((s) => {
        s.book.variants = s.book.variants || {};
        s.book.variants[block.id] = (s.book.variants[block.id] || 0) + 1;
      });
      rebuild();
      ctx.render();
      toast('Regenerated that paragraph from the same underlying rules.');
    };

    const chapterTools = (chapter) => {
      const locked = (book.locked || []).includes(chapter.id);
      return el('div', { class: 'chapter-tools' }, [
        el('span', { class: 'badge', text: `chapter ${book.chapters.indexOf(chapter) + 1}` }),
        el('button', {
          class: 'btn quiet sm', type: 'button',
          onclick: () => {
            ctx.patch((s) => {
              const set = new Set(s.book.locked || []);
              if (set.has(chapter.id)) set.delete(chapter.id);
              else set.add(chapter.id);
              s.book.locked = [...set];
            });
            ctx.render();
            toast(locked ? 'Chapter unlocked.' : 'Chapter locked — rebuilds will leave it alone.');
          },
        }, locked ? '🔒 Locked' : 'Lock chapter'),
        el('button', {
          class: 'btn quiet sm', type: 'button',
          onclick: () => {
            ctx.patch((s) => {
              s.book.variants = s.book.variants || {};
              for (const b of chapter.blocks) if (b.type === 'p') s.book.variants[b.id] = (s.book.variants[b.id] || 0) + 1;
            });
            rebuild();
            ctx.render();
            toast(`Rewrote every paragraph in “${chapter.title}”.`);
          },
        }, 'Regenerate chapter'),
        el('button', {
          class: 'btn quiet sm', type: 'button',
          onclick: () => {
            ctx.patch((s) => {
              const t = s.bookPrefs.chapters.find((x) => x.id === chapter.id);
              if (t) t.on = false;
            });
            rebuild();
            ctx.render();
            toast(`“${chapter.title}” removed. Turn it back on from step 8.`);
          },
        }, 'Remove from book'),
      ]);
    };

    for (const chapter of book.chapters) {
      bookNode.append(renderChapter(chapter, { editable: true, onEdit: editParagraph, onRegenerate: regenerate, tools: chapterTools }));
    }

    body.append(el('div', { class: 'preview-shell' }, [tocPane, bookNode]));

    // scroll-spy for the contents pane
    const links = [...tocList.querySelectorAll('a')];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        links.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${id}` ? 'true' : 'false'));
      }
    }, { rootMargin: '-80px 0px -70% 0px' });
    setTimeout(() => bookNode.querySelectorAll('.book-chapter').forEach((s) => observer.observe(s)), 0);

    body.append(el('div', { class: 'row', style: 'margin-top:32px' }, [
      el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(10, { validate: false }) }, '← Regenerate'),
      el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(12, { validate: false }) }, 'Validate & export →'),
    ]));

    return wrap.appendChild(body) && wrap;
  },
};
