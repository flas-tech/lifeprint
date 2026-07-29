// LifePrint — renders book blocks to DOM. The same block model feeds the PDF renderer.
import { el, table, statusPill } from './dom.js';

function whyPanel(why) {
  const pairs = [
    ['Recommendation', why.recommendation],
    ['Reason', why.reason],
    ['Source', why.sourceType],
    ['Reference', why.sourceReference],
    ['Confidence', why.confidence],
    ['Temporary', why.temporary ? 'yes' : 'no'],
    ['Reintroducible', why.reintroducible ? 'yes' : 'no'],
  ].filter(([, v]) => v != null && v !== '');
  const dl = el('dl', {});
  for (const [k, v] of pairs) {
    dl.append(el('dt', { text: k }), el('dd', { text: String(v) }));
  }
  return el('div', { class: 'why' }, [dl]);
}

/**
 * @param {object} block
 * @param {object} opts  { onEdit, onRegenerate, editable }
 */
export function renderBlock(block, opts = {}) {
  const { onEdit, onRegenerate, editable = false } = opts;
  const wrap = el('div', { class: 'blk', dataset: { id: block.id, edited: block.edited ? 'true' : 'false' } });

  const tools = () => {
    if (!editable) return null;
    const bar = el('div', { class: 'blk-tools' });
    if (['p', 'h2', 'h3'].includes(block.type) && onEdit) {
      bar.append(el('button', { class: 'btn quiet sm', type: 'button', onclick: () => onEdit(block, wrap) }, 'Edit'));
    }
    if (block.type === 'p' && onRegenerate) {
      bar.append(el('button', { class: 'btn quiet sm', type: 'button', onclick: () => onRegenerate(block) }, block.variantCount > 1 ? `Regenerate (variant ${block.variant + 1} of ${block.variantCount})` : 'Regenerate'));
    }
    if (block.generated) {
      bar.append(el('span', { class: 'badge', title: 'How this text was produced', text: block.generated === 'rules-engine' ? 'from your rules' : block.generated === 'user' ? 'your words' : 'template' }));
    }
    return bar;
  };

  switch (block.type) {
    case 'h2':
      wrap.append(tools(), el('h2', { id: block.id, text: block.text }));
      break;
    case 'h3':
      wrap.append(tools(), el('h3', { id: block.id, text: block.text }));
      break;
    case 'p': {
      wrap.append(tools(), el('p', { text: block.text }));
      if (block.why) {
        const details = el('details', { class: 'tiny' }, [el('summary', { text: 'Why this recommendation?' }), whyPanel(block.why)]);
        wrap.append(details);
      }
      break;
    }
    case 'ul':
      wrap.append(tools(), el('ul', {}, block.items.map((i) => el('li', { text: i }))));
      break;
    case 'ol':
      wrap.append(tools(), el('ol', {}, block.items.map((i) => el('li', { text: i }))));
      break;
    case 'kv': {
      const dl = el('dl', { class: 'why' });
      const inner = el('dl', {});
      for (const [k, v] of block.pairs) inner.append(el('dt', { text: k }), el('dd', { text: String(v) }));
      dl.append(inner);
      wrap.append(dl);
      break;
    }
    case 'table': {
      const statusCol = block.columns.indexOf('Status');
      const rows = block.rows.map((r) => r.map((cell, i) => (i === statusCol ? statusPill(cell) : cell)));
      wrap.append(table({ columns: block.columns, rows, caption: block.caption }));
      break;
    }
    case 'callout':
      wrap.append(el('div', { class: `callout ${block.variant}` }, [
        block.title ? el('h4', { text: block.title }) : null,
        el('p', { text: block.text }),
      ]));
      break;
    case 'journal': {
      wrap.append(el('h3', { text: block.title }));
      const lines = el('div', { class: 'journal-lines', style: `min-height:${Math.max(2, block.lines) * 26}px` });
      wrap.append(lines);
      break;
    }
    case 'pagebreak':
      wrap.append(el('div', { class: 'divider' }));
      break;
    default:
      wrap.append(el('p', { class: 'muted tiny', text: `[unsupported block: ${block.type}]` }));
  }
  return wrap;
}

export function renderChapter(chapter, opts = {}) {
  const section = el('section', { class: 'book-chapter', id: `ch-${chapter.id}` });
  if (opts.tools) section.append(opts.tools(chapter));
  section.append(el('h2', { id: `ch-h-${chapter.id}`, text: chapter.title }));
  for (const block of chapter.blocks) {
    if (block.type === 'h2' && block.text === chapter.title) continue;
    section.append(renderBlock(block, opts));
  }
  return section;
}
