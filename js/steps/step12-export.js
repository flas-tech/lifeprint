// Step 12 — validation, then export. Nothing prints until the checks are visible.
import { el, card, callout, toast, modal, table } from '../ui/dom.js';
import { downloadPdf, jsPDFAvailable } from '../pdf/export.js';
import { bookPlainText } from '../engine/book.js';

const VARIANTS = [
  ['standard', 'Standard PDF', 'Letter, full colour, 0.7in margins. What most people print or read on a laptop.'],
  ['printer', 'Printer-friendly', 'Greyscale throughout, no coloured fills. Cheaper on a home printer and safe for photocopiers.'],
  ['mobile', 'Mobile reading', 'Larger type on a narrower measure so it reads well on a phone screen.'],
];

export default {
  showNav: false,
  render(ctx) {
    const wrap = el('div', {});
    wrap.append(el('div', { class: 'eyebrow', text: 'Step 13 of 13' }), el('h1', { text: 'Check it, then take it with you.' }));

    const book = ctx.state.book;
    const body = el('div', { class: 'step-body' });

    if (!book) {
      body.append(
        callout({ variant: 'info', title: 'No book to export yet', text: 'Generate the book first, then come back here.' }),
        el('div', { class: 'row' }, [el('button', { class: 'btn', type: 'button', onclick: () => ctx.go(10, { validate: false }) }, 'Go to generate')])
      );
      return wrap.appendChild(body) && wrap;
    }

    wrap.append(el('p', { class: 'lede', text: 'Seventeen checks run against the finished book — allergens, prohibited claims, hidden ingredients, citations, contradictions, your own exclusions. You see all of them, pass or fail, before anything is exported.' }));

    const v = book.validation || { checks: [], passed: 0, failed: 0, warned: 0 };

    if (book.stale) {
      body.append(callout({
        variant: 'caution',
        title: 'This book is out of date',
        text: `${book.staleReason} Rebuild before exporting, or the PDF will not match your current answers.`,
        actions: [{ label: 'Rebuild now', kind: 'clay', onClick: () => ctx.go(10, { validate: false }) }],
      }));
    }

    // ---- validation panel ----
    const checks = el('ul', { class: 'checks' });
    for (const c of v.checks) {
      checks.append(el('li', { dataset: { status: c.status } }, [
        el('span', { class: 'ck-mark', 'aria-hidden': 'true', text: c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕' }),
        el('div', {}, [
          el('b', { text: c.label }),
          el('div', { class: 'tiny muted', text: c.detail }),
        ]),
        el('span', { class: `badge ${c.status}`, text: c.status }),
      ]));
    }

    body.append(card({
      title: `Validation — ${v.passed} passed, ${v.warned} warning${v.warned === 1 ? '' : 's'}, ${v.failed} failed`,
      sub: v.failed
        ? 'Fix the failures before printing. Each one names the exact food or claim that tripped it.'
        : 'Everything the validator knows how to check came back clean. It cannot check whether the plan is right for your body — only your clinician can.',
      tone: v.failed ? 'stop' : '',
      children: [checks],
    }));

    // ---- export panel ----
    const exportRow = el('div', { class: 'grid three' });
    for (const [id, label, blurb] of VARIANTS) {
      const btn = el('button', { class: id === 'standard' ? 'btn' : 'btn ghost', type: 'button' }, `Download ${label.toLowerCase()}`);
      btn.addEventListener('click', async () => {
        if (v.failed && !ctx.state.export.acknowledgedFailures) {
          ctx.confirmModal({
            title: `Export with ${v.failed} failed check${v.failed === 1 ? '' : 's'}?`,
            message: 'The PDF will contain content the validator flagged. Only do this if you are reviewing it yourself before use — do not hand it to someone else as finished.',
            confirmLabel: 'I understand, export anyway',
            onConfirm: () => { ctx.patch((s) => { s.export.acknowledgedFailures = true; }); btn.click(); },
          });
          return;
        }
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = 'Rendering…';
        // let the browser paint the disabled state before the synchronous render
        await new Promise((r) => setTimeout(r, 30));
        try {
          const { pages, name } = downloadPdf(book, { variant: id });
          ctx.patch((s) => {
            s.export.history = [{ at: new Date().toISOString(), variant: id, pages, name }, ...(s.export.history || [])].slice(0, 12);
          });
          toast(`${pages}-page PDF downloaded as ${name}.`);
          ctx.render();
        } catch (err) {
          modal({
            title: 'The PDF could not be built',
            bodyNodes: [
              el('p', { text: err.message }),
              el('p', { class: 'tiny muted', text: 'Your book is still saved in this browser. You can also use your browser’s own “Print → Save as PDF” on the editor screen as a fallback.' }),
            ],
            actions: [{ label: 'Close' }],
          });
          // eslint-disable-next-line no-console
          console.error(err);
        }
        btn.disabled = false;
        btn.textContent = original;
      });
      exportRow.append(el('div', { class: 'opt' }, [
        el('b', { text: label }),
        el('span', { class: 'tiny muted', text: blurb }),
        el('div', { style: 'margin-top:10px' }, [btn]),
      ]));
    }

    body.append(card({
      title: 'Export your book',
      sub: `${book.chapters.length} chapters, target around ${book.targetPages} pages, ${book.style.replace(/-/g, ' ')} styling. Rendered in this tab — the file never touches a server.`,
      children: [
        jsPDFAvailable() ? null : callout({ variant: 'caution', title: 'PDF library not loaded', text: 'The jsPDF script did not load, so the buttons below will fail. Reload the page while online, or use your browser’s Print → Save as PDF.' }),
        exportRow,
        el('div', { class: 'divider' }),
        el('div', { class: 'row' }, [
          el('button', {
            class: 'btn quiet', type: 'button',
            onclick: () => {
              const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state: ctx.state }, null, 2)], { type: 'application/json' });
              const a = el('a', { href: URL.createObjectURL(blob), download: 'lifeprint-answers.json' });
              document.body.append(a); a.click(); a.remove();
              toast('Answers exported as JSON.');
            },
          }, 'Export answers (JSON)'),
          el('button', {
            class: 'btn quiet', type: 'button',
            onclick: () => {
              const blob = new Blob([bookPlainText(book)], { type: 'text/plain' });
              const a = el('a', { href: URL.createObjectURL(blob), download: 'lifeprint-book.txt' });
              document.body.append(a); a.click(); a.remove();
              toast('Plain-text copy exported.');
            },
          }, 'Export plain text'),
          el('button', { class: 'btn quiet', type: 'button', onclick: () => window.print() }, 'Print this screen'),
        ]),
      ],
    }));

    // ---- history ----
    if ((ctx.state.export.history || []).length) {
      body.append(card({
        title: 'Your exports',
        sub: 'Kept in this browser so you can tell versions apart.',
        children: [table({
          columns: ['When', 'Variant', 'Pages', 'File'],
          rows: ctx.state.export.history.map((h) => [new Date(h.at).toLocaleString(), h.variant, String(h.pages), h.name]),
        })],
      }));
    }

    body.append(card({
      title: 'Before you use this',
      children: [
        callout({
          variant: 'caution',
          title: 'Take it to a professional',
          text: 'This book is a starting point for a conversation, not a prescription. The clinician review chapter at the back is written for exactly that — hand it over at your next appointment.',
        }),
        el('p', { class: 'tiny muted', text: 'Everything you entered stays in this browser’s localStorage. Clearing site data deletes it permanently, and nothing was ever uploaded. Export the JSON if you want a copy you control.' }),
      ],
    }));

    body.append(el('div', { class: 'row', style: 'margin-top:24px' }, [
      el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.go(11, { validate: false }) }, '← Back to the editor'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => ctx.openMenu() }, 'Book & data'),
    ]));

    return wrap.appendChild(body) && wrap;
  },
};
