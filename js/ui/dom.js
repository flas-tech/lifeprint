// LifePrint — tiny DOM toolkit. No framework, no build step.

export const esc = (v) =>
  String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function frag(htmlString) {
  const t = document.createElement('template');
  t.innerHTML = htmlString.trim();
  return t.content;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/** Event delegation: on(root, 'click', '[data-x]', handler) */
export function on(root, type, sel, handler) {
  root.addEventListener(type, (ev) => {
    const target = ev.target.closest(sel);
    if (target && root.contains(target)) handler(ev, target);
  });
}

/* ---------------- toasts ---------------- */
let toastTimer = 0;
export function toast(message, kind = '') {
  const host = qs('#toasts');
  if (!host) return;
  const node = el('div', { class: `toast ${kind}`.trim(), role: 'status', text: message });
  host.append(node);
  window.clearTimeout(toastTimer);
  setTimeout(() => {
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 260);
  }, kind === 'bad' ? 6000 : 3600);
}

/* ---------------- modal ---------------- */
export function modal({ title, bodyNodes = [], actions = [], onClose, dismissable = true, wide = false }) {
  const root = qs('#modal-root');
  const prevFocus = document.activeElement;
  const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, style: wide ? 'max-width:820px' : '' });
  box.append(el('h2', { text: title }));
  for (const n of [].concat(bodyNodes)) box.append(n);
  const bar = el('div', { class: 'modal-actions' });
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  };
  for (const a of actions) {
    bar.append(
      el('button', {
        class: `btn ${a.kind || 'ghost'}`,
        type: 'button',
        onclick: () => {
          const keep = a.onClick ? a.onClick() : false;
          if (!keep) close();
        },
      }, a.label)
    );
  }
  if (actions.length) box.append(bar);
  const backdrop = el('div', { class: 'modal-backdrop' });
  backdrop.append(box);
  if (dismissable) {
    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop) close();
    });
  }
  const onKey = (ev) => {
    if (ev.key === 'Escape' && dismissable) close();
    if (ev.key === 'Tab') {
      const f = qsa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', box).filter((n) => !n.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  root.append(backdrop);
  const focusable = qs('button, input, select, textarea', box);
  if (focusable) focusable.focus();
  return { close, box };
}

export function confirmModal({ title, message, confirmLabel = 'Confirm', kind = 'clay', onConfirm }) {
  return modal({
    title,
    bodyNodes: [el('p', { text: message })],
    actions: [
      { label: 'Cancel' },
      { label: confirmLabel, kind, onClick: onConfirm },
    ],
  });
}

/* ---------------- components ---------------- */

/** Multi-select chip group. items: [{id,label,hint}] */
export function chipGroup({ items, selected = [], onChange, name = '' }) {
  const set = new Set(selected);
  const wrap = el('div', { class: 'chips', role: 'group', 'aria-label': name });
  for (const it of items) {
    const b = el('button', {
      class: 'chip',
      type: 'button',
      'aria-pressed': set.has(it.id) ? 'true' : 'false',
      title: it.hint || '',
      dataset: { id: it.id },
    }, it.label);
    b.addEventListener('click', () => {
      if (set.has(it.id)) set.delete(it.id);
      else set.add(it.id);
      b.setAttribute('aria-pressed', set.has(it.id) ? 'true' : 'false');
      onChange([...set]);
    });
    wrap.append(b);
  }
  return wrap;
}

/** Single-select option cards. items: [{id,title,desc}] */
export function optionCards({ items, value, onChange, name = '', columns = 'two' }) {
  const wrap = el('div', { class: `grid ${columns}`, role: 'radiogroup', 'aria-label': name });
  const buttons = [];
  for (const it of items) {
    const b = el('button', {
      class: 'optcard',
      type: 'button',
      role: 'radio',
      'aria-checked': it.id === value ? 'true' : 'false',
      'aria-pressed': it.id === value ? 'true' : 'false',
      dataset: { id: it.id },
    }, [
      el('span', { class: 'oc-mark', 'aria-hidden': 'true' }),
      el('span', {}, [el('span', { class: 'oc-title', text: it.title }), it.desc ? el('span', { class: 'oc-desc', text: it.desc }) : null]),
    ]);
    b.addEventListener('click', () => {
      for (const other of buttons) {
        other.setAttribute('aria-checked', other === b ? 'true' : 'false');
        other.setAttribute('aria-pressed', other === b ? 'true' : 'false');
      }
      onChange(it.id);
    });
    buttons.push(b);
    wrap.append(b);
  }
  return wrap;
}

/** Switch list. items: [{id,title,desc,on}] */
export function toggleList({ items, onToggle }) {
  const wrap = el('div', {});
  for (const it of items) {
    const sw = el('button', {
      class: 'switch',
      type: 'button',
      role: 'switch',
      'aria-pressed': it.on ? 'true' : 'false',
      'aria-label': it.title,
      dataset: { id: it.id },
    });
    sw.addEventListener('click', () => {
      const next = sw.getAttribute('aria-pressed') !== 'true';
      sw.setAttribute('aria-pressed', next ? 'true' : 'false');
      onToggle(it.id, next);
    });
    wrap.append(
      el('div', { class: 'toggle' }, [
        el('div', { class: 'tg-text' }, [el('strong', { text: it.title }), it.desc ? el('span', { text: it.desc }) : null]),
        sw,
      ])
    );
  }
  return wrap;
}

/** Reorderable list with up/down/remove. items: [{id,label}] */
export function rankPicker({ items, onChange, removable = true }) {
  const wrap = el('div', { class: 'rank' });
  const render = () => {
    clear(wrap);
    items.forEach((it, i) => {
      wrap.append(
        el('div', { class: 'rank-item' }, [
          el('span', { class: 'rk-num', text: String(i + 1) }),
          el('span', { class: 'rk-name', text: it.label }),
          el('span', { class: 'rk-btns' }, [
            el('button', {
              class: 'iconbtn', type: 'button', 'aria-label': `Move ${it.label} up`, disabled: i === 0,
              onclick: () => { const [x] = items.splice(i, 1); items.splice(i - 1, 0, x); render(); onChange(items); },
            }, '↑'),
            el('button', {
              class: 'iconbtn', type: 'button', 'aria-label': `Move ${it.label} down`, disabled: i === items.length - 1,
              onclick: () => { const [x] = items.splice(i, 1); items.splice(i + 1, 0, x); render(); onChange(items); },
            }, '↓'),
            removable
              ? el('button', {
                  class: 'iconbtn', type: 'button', 'aria-label': `Remove ${it.label}`,
                  onclick: () => { items.splice(i, 1); render(); onChange(items); },
                }, '×')
              : null,
          ]),
        ])
      );
    });
    if (!items.length) wrap.append(el('p', { class: 'muted tiny', text: 'Nothing selected yet.' }));
  };
  render();
  return wrap;
}

/** Text field with label + hint + error slot. */
export function field({ label, id, value = '', type = 'text', hint, placeholder, onInput, attrs = {}, textarea = false, options }) {
  const input = options
    ? el('select', { id, ...attrs })
    : el(textarea ? 'textarea' : 'input', { id, type: textarea ? null : type, value, placeholder: placeholder || '', ...attrs });
  if (options) {
    for (const o of options) {
      input.append(el('option', { value: o.id, selected: String(o.id) === String(value) ? true : null, text: o.label }));
    }
  }
  if (textarea) input.value = value;
  const errNode = el('div', { class: 'err', id: `${id}-err`, hidden: true });
  input.addEventListener(options ? 'change' : 'input', () => onInput && onInput(input.value, input, errNode));
  return el('div', { class: 'field' }, [
    el('label', { for: id, text: label }),
    input,
    hint ? el('div', { class: 'hint', text: hint }) : null,
    errNode,
  ]);
}

/** Data table from columns + rows of strings/nodes. */
export function table({ columns, rows, caption }) {
  const t = el('table', { class: 'tbl' });
  if (caption) t.append(el('caption', { text: caption }));
  t.append(el('thead', {}, [el('tr', {}, columns.map((c) => el('th', { scope: 'col', text: c })))]));
  t.append(
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((cell) => el('td', {}, [cell && cell.nodeType ? cell : document.createTextNode(String(cell ?? ''))])))))
  );
  return el('div', { class: 'tbl-wrap' }, [t]);
}

export function callout({ variant = 'info', title, text, actions = [] }) {
  const node = el('div', { class: `callout ${variant}`, role: variant === 'urgent' || variant === 'stop' ? 'alert' : null }, [
    title ? el('h4', { text: title }) : null,
    el('p', { text }),
  ]);
  if (actions.length) {
    node.append(el('div', { class: 'callout-actions' }, actions.map((a) => el('button', { class: `btn ${a.kind || 'ghost'} sm`, type: 'button', onclick: a.onClick }, a.label))));
  }
  return node;
}

export function statusPill(status) {
  const map = { 'Eat freely': 'eat', 'Eat in moderation': 'moderation', Occasional: 'occasional', Avoid: 'avoid' };
  return el('span', { class: `pill ${map[status] || 'neutral'}`, text: status });
}

export function card({ title, sub, children = [], tone = '' }) {
  return el('section', { class: `card ${tone}`.trim() }, [
    title ? el('h2', { text: title }) : null,
    sub ? el('p', { class: 'card-sub', text: sub }) : null,
    ...[].concat(children),
  ]);
}

/** Typeahead multi-add input backed by a search function. */
export function autocomplete({ id, label, hint, search, onPick, placeholder = 'Start typing…' }) {
  const list = el('div', { class: 'chips', style: 'margin-top:8px' });
  const input = el('input', { id, type: 'text', placeholder, autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': `${id}-list` });
  const results = el('div', { class: 'chips', id: `${id}-list`, style: 'margin-top:8px' });
  const render = () => {
    clear(results);
    const q = input.value.trim();
    input.setAttribute('aria-expanded', q.length >= 2 ? 'true' : 'false');
    if (q.length < 2) return;
    const hits = search(q).slice(0, 8);
    if (!hits.length) {
      results.append(el('span', { class: 'tiny muted', text: 'No match in the food library — you can still add it as free text.' }));
      results.append(el('button', { class: 'chip', type: 'button', onclick: () => { onPick({ id: null, name: q }); input.value = ''; render(); } }, `Add “${q}”`));
      return;
    }
    for (const h2 of hits) {
      results.append(el('button', { class: 'chip', type: 'button', onclick: () => { onPick(h2); input.value = ''; render(); } }, h2.name));
    }
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const first = qs('button', results);
      if (first) first.click();
    }
  });
  return { node: el('div', { class: 'field' }, [el('label', { for: id, text: label }), input, hint ? el('div', { class: 'hint', text: hint }) : null, results, list]), input, chipHost: list, refresh: render };
}
