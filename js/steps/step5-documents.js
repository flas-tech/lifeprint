// Step 5 (optional) — Upload documents. Parsing happens in this tab only.
import { el, card, field, callout, clear, toast, table } from '../ui/dom.js';
import { readFile, extractFindings, parseManualFindings, SUPPORTED_HINT } from '../parse/extract.js';
import { DOC_TYPES } from '../state.js';

export default {
  render(ctx) {
    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 5 of 13 · optional' }),
      el('h1', { text: 'Have a lab, panel, or plan you want folded in?' }),
      el('p', { class: 'lede', text: 'Add a food-sensitivity panel, a lab report, a clinician note, or an existing meal plan. LifePrint reads it in this browser tab, proposes findings, and applies nothing until you confirm each one on the next step. Skip this entirely if you have nothing to add.' })
    );

    const body = el('div', { class: 'step-body' });

    body.append(callout({
      variant: 'info',
      title: 'Where your file goes: nowhere',
      text: 'There is no backend in this app. Files are read with the browser’s FileReader, the text is scanned locally, and only the extracted findings and a short excerpt are kept in localStorage. The file itself is never stored or transmitted, which also means you will need to re-add it if you clear your browser data.',
    }));

    // ---- document type ----
    const pending = { docType: DOC_TYPES[1] };
    const typeField = field({
      label: 'What kind of document is this?', id: 'docType', value: pending.docType,
      options: DOC_TYPES.map((d) => ({ id: d, label: d })),
      hint: 'This becomes the citation label on every finding from this file.',
      onInput: (v) => { pending.docType = v; },
    });

    // ---- drop zone ----
    const status = el('div', { class: 'stack', style: 'margin-top:16px' });
    const fileInput = el('input', { type: 'file', id: 'file-input', class: 'sr-only', multiple: true, accept: '.pdf,.txt,.md,.csv,.tsv,text/plain,application/pdf,image/*' });
    const drop = el('div', { class: 'drop' }, [
      el('p', { style: 'margin:0 0 8px;font-weight:600', text: 'Drop files here, or choose them' }),
      el('p', { class: 'tiny muted', style: 'margin:0 0 14px', text: SUPPORTED_HINT }),
      el('label', { class: 'btn', for: 'file-input' }, 'Choose files'),
    ]);

    const handleFiles = async (files) => {
      for (const file of files) {
        clear(status).append(el('p', { class: 'tiny muted', text: `Reading ${file.name}…` }));
        // eslint-disable-next-line no-await-in-loop
        const result = await readFile(file);
        const docId = `d-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
        const found = result.ok ? extractFindings(result.text, { docName: result.name, docType: pending.docType, docId }) : [];
        ctx.patch((s) => {
          s.documents.push({
            id: docId,
            name: result.name,
            docType: pending.docType,
            size: result.size,
            pages: result.pages,
            addedAt: new Date().toISOString(),
            textExcerpt: (result.text || '').replace(/\[\[page \d+\]\]/g, '').trim().slice(0, 220),
            extractable: result.ok,
            note: result.note,
            findingCount: found.length,
          });
          const known = new Set(s.findings.map((f) => f.id));
          for (const f of found) if (!known.has(f.id)) s.findings.push(f);
          ctx.invalidateBook('Documents changed.');
        });
        if (!result.ok) toast(result.note, 'warn');
        else if (!found.length) toast(`${result.name}: no reactivity findings recognized. Use manual entry below.`, 'warn');
        else toast(`${result.name}: ${found.length} finding(s) proposed — confirm them on the next step.`);
      }
      clear(status);
      ctx.render();
    };

    fileInput.addEventListener('change', (ev) => handleFiles([...ev.target.files]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (ev) => handleFiles([...(ev.dataTransfer.files || [])]));

    body.append(card({ title: 'Add a document', children: [typeField, drop, fileInput, status] }));

    // ---- current documents ----
    if (ctx.state.documents.length) {
      const rows = ctx.state.documents.map((d) => [
        d.name,
        d.docType,
        `${d.pages} pg`,
        d.extractable ? `${d.findingCount ?? ctx.state.findings.filter((f) => f.docId === d.id).length} finding(s)` : 'no text found',
        el('button', {
          class: 'btn quiet sm', type: 'button',
          onclick: () => ctx.patch((s) => {
            s.documents = s.documents.filter((x) => x.id !== d.id);
            s.findings = s.findings.filter((f) => f.docId !== d.id);
            ctx.invalidateBook('Documents changed.');
          }, { rerender: true }),
        }, 'Remove'),
      ]);
      body.append(card({
        title: `${ctx.state.documents.length} document${ctx.state.documents.length === 1 ? '' : 's'} attached`,
        sub: 'Removing a document also removes every finding that came from it.',
        children: [table({ columns: ['File', 'Type', 'Length', 'Extracted', ''], rows })],
      }));
    }

    // ---- manual entry ----
    const manual = { text: '' };
    body.append(card({
      title: 'Manual entry',
      sub: 'For scans, photos, or anything LifePrint could not read. One food per line, with a reactivity level after a dash.',
      tone: 'quiet',
      children: [
        field({
          label: 'Findings', id: 'manual-findings', textarea: true, value: '',
          placeholder: 'Whole wheat bread — high\nChicken eggs — moderate\nCow milk (whole) — low',
          hint: 'Recognized levels: very high, high, moderate, low. Anything negative or normal is ignored on purpose.',
          onInput: (v) => { manual.text = v; },
        }),
        el('div', { class: 'row' }, [
          el('button', {
            class: 'btn', type: 'button',
            onclick: () => {
              const parsed = parseManualFindings(manual.text, { docType: pending.docType });
              if (!parsed.length) { toast('Nothing to add — type at least one line.', 'warn'); return; }
              ctx.patch((s) => {
                for (const f of parsed) s.findings.push(f);
                ctx.invalidateBook('Findings changed.');
              });
              toast(`${parsed.length} finding(s) added for review.`);
              ctx.go(6, { validate: false });
            },
          }, 'Add findings for review'),
          el('a', { class: 'btn quiet', href: './samples/sample-food-sensitivity-report.md', download: 'sample-food-sensitivity-report.md' }, 'Download a sample report to test with'),
        ]),
      ],
    }));

    body.append(callout({
      variant: 'caution',
      title: 'What a food-sensitivity panel is, and is not',
      text: 'IgG and similar panels are not allergy tests, and major allergy organizations do not endorse them for diagnosing food allergy or intolerance. LifePrint treats every panel result as a temporary, reintroducible signal with moderate-to-low confidence — never as a diagnosis, and never as a permanent exclusion.',
    }));

    return wrap.appendChild(body) && wrap;
  },
};
