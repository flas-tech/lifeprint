// LifePrint — controller: routing, state plumbing, autosave, pipeline.
import {
  loadState, saveState, resetState, exportJSON, importJSON, validateStep,
  completionPercent, STEP_TITLES, OPTIONAL_STEPS, TOTAL_STEPS, demoProfile, hardCaseProfile,
} from './state.js';
import { el, clear, qs, toast, modal, confirmModal, field } from './ui/dom.js';
import { buildRules } from './engine/rules.js';
import { buildBook } from './engine/book.js';
import { validateBook } from './engine/validate.js';
import { PIPELINE } from './pipeline.js';

import step0 from './steps/step0-welcome.js';
import step1 from './steps/step1-profile.js';
import step2 from './steps/step2-goals.js';
import step3 from './steps/step3-frameworks.js';
import step4 from './steps/step4-food.js';
import step5 from './steps/step5-documents.js';
import step6 from './steps/step6-findings.js';
import step7 from './steps/step7-health.js';
import step8 from './steps/step8-book-prefs.js';
import step9 from './steps/step9-safety.js';
import step10 from './steps/step10-generate.js';
import step11 from './steps/step11-editor.js';
import step12 from './steps/step12-export.js';

const STEPS = [step0, step1, step2, step3, step4, step5, step6, step7, step8, step9, step10, step11, step12];

let state = loadState();
let saveTimer = 0;
let errors = [];

/* ---------------- state plumbing ---------------- */
function markSaved(status) {
  const chip = qs('#savechip');
  if (!chip) return;
  chip.dataset.state = status;
  chip.textContent = status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed — storage full?' : 'Saved locally';
}

function persist() {
  markSaved('saving');
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    markSaved(saveState(state) ? 'idle' : 'error');
  }, 220);
}

/** Mutate state through a callback, autosave, optionally re-render. */
function patch(mutator, { rerender = false } = {}) {
  mutator(state);
  persist();
  updateChrome();
  if (rerender) render();
}

function invalidateBook(reason) {
  if (!state.book) return;
  state.book.stale = true;
  state.book.staleReason = reason || 'Your answers changed after this book was generated.';
}

/* ---------------- routing ---------------- */
function go(step, { validate = true } = {}) {
  if (validate && step > state.currentStep) {
    errors = validateStep(state.currentStep, state).filter((e) => !e.soft);
    if (errors.length) {
      render();
      toast(errors[0].message, 'warn');
      return false;
    }
  }
  errors = [];
  const target = Math.max(0, Math.min(TOTAL_STEPS - 1, step));
  state.currentStep = target;
  if (!state.visited.includes(target)) state.visited.push(target);
  persist();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  qs('#main').focus({ preventScroll: true });
  return true;
}

function next() {
  return go(state.currentStep + 1);
}
function back() {
  return go(state.currentStep - 1, { validate: false });
}

/* ---------------- pipeline ---------------- */

/** Runs the 12-stage build. onStage(index, label) is called per stage. */
async function runPipeline(onStage) {
  const pause = () => new Promise((r) => setTimeout(r, 90));
  let rules = null;
  let book = null;
  let validation = null;
  for (let i = 0; i < PIPELINE.length; i += 1) {
    const [id, label] = PIPELINE[i];
    onStage(i, label, 'active');
    if (id === 'protocols') rules = buildRules(state);
    if (id === 'chapters') book = buildBook(state, { rules, edits: state.book && !state.regenerateFresh ? state.book.edits : {}, variants: state.book && !state.regenerateFresh ? state.book.variants : {} });
    if (id === 'validate') validation = validateBook(book, state, rules);
    // eslint-disable-next-line no-await-in-loop
    await pause();
    onStage(i, label, 'done');
  }
  book.validation = validation;
  book.stale = false;
  state.book = book;
  state.rulesSnapshot = { counts: rules.counts, reconciliations: rules.reconciliations };
  const snapshot = JSON.stringify(book);
  state.versions = [
    { at: new Date().toISOString(), title: book.title, chapters: book.chapters.length, size: snapshot.length, snapshot },
    ...(state.versions || []),
  ].slice(0, 8);
  // Keep restorable snapshots for the three most recent drafts only; older entries stay as history.
  state.versions.forEach((v, i) => { if (i >= 3) delete v.snapshot; });
  // Storage quota: shed snapshots oldest-first until the save succeeds.
  for (let i = state.versions.length - 1; i >= 0 && !saveState(state); i -= 1) delete state.versions[i].snapshot;
  persist();
  return { rules, book, validation };
}

/* ---------------- chrome (rail, mobile bar, menu) ---------------- */
function stepEnabled(i) {
  if (i <= state.currentStep) return true;
  return state.visited.includes(i) || i === state.currentStep + 1;
}

function renderRail() {
  const rail = clear(qs('#rail'));
  const pct = completionPercent(state);
  rail.append(
    el('div', { class: 'rail-title', text: `Your book — ${pct}% ready` }),
    el('div', { class: 'rail-progress', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [el('i', { style: `width:${pct}%` })])
  );
  const ol = el('ol', {});
  STEP_TITLES.forEach((title, i) => {
    const done = state.visited.includes(i) && i < state.currentStep;
    const btn = el('button', {
      type: 'button',
      'aria-current': i === state.currentStep ? 'true' : null,
      dataset: { done: done ? 'true' : 'false', step: String(i) },
      disabled: stepEnabled(i) ? null : true,
      onclick: () => go(i, { validate: i > state.currentStep }),
    }, [title, OPTIONAL_STEPS.includes(i) ? el('span', { class: 'rail-optional', text: 'optional' }) : null]);
    ol.append(el('li', {}, [btn]));
  });
  rail.append(ol);
  rail.append(
    el('div', { class: 'rail-foot' }, [
      el('button', { class: 'btn quiet', type: 'button', onclick: openMenu }, 'Book & data'),
      el('a', { class: 'btn quiet', href: './docs/PRD.md', target: '_blank', rel: 'noreferrer' }, 'Product docs'),
    ])
  );
}

function renderMobileBar() {
  const bar = clear(qs('#mobilebar'));
  const pct = completionPercent(state);
  const isLast = state.currentStep >= TOTAL_STEPS - 1;
  bar.append(
    el('div', { class: 'mb-top' }, [
      el('span', { text: `Step ${state.currentStep + 1} of ${TOTAL_STEPS} — ${STEP_TITLES[state.currentStep]}` }),
      el('span', { text: `${pct}%` }),
    ]),
    el('div', { class: 'mb-bar' }, [el('i', { style: `width:${pct}%` })]),
    el('div', { class: 'mb-actions' }, [
      state.currentStep > 0 ? el('button', { class: 'btn ghost', type: 'button', onclick: back }, 'Back') : null,
      isLast
        ? el('button', { class: 'btn ghost', type: 'button', onclick: () => go(11) }, 'Back to editor')
        : el('button', { class: 'btn', type: 'button', onclick: next }, state.currentStep === 0 ? 'Start' : OPTIONAL_STEPS.includes(state.currentStep) ? 'Continue' : 'Continue'),
    ])
  );
}

function updateChrome() {
  renderRail();
  renderMobileBar();
}

function restoreVersion(index) {
  const v = (state.versions || [])[index];
  if (!v || !v.snapshot) { toast('That draft is a record only — no restorable copy was kept.', 'bad'); return; }
  confirmModal({
    title: 'Restore this draft?',
    message: `This replaces the book you are looking at with the draft from ${new Date(v.at).toLocaleString()} (${v.chapters} chapters). Your answers are not changed.`,
    confirmLabel: 'Restore this draft',
    onConfirm: () => {
      try {
        const restored = JSON.parse(v.snapshot);
        state.book = restored;
        state.versions = [
          { at: new Date().toISOString(), title: restored.title, chapters: restored.chapters.length, size: v.snapshot.length, snapshot: v.snapshot, restoredFrom: v.at },
          ...state.versions,
        ].slice(0, 8);
        state.versions.forEach((entry, i) => { if (i >= 3) delete entry.snapshot; });
        persist();
        toast('Draft restored.');
        go(11, { validate: false });
      } catch (err) {
        toast(`Could not restore that draft: ${err.message}`, 'bad');
      }
    },
  });
}

function openMenu() {
  const body = [];
  const info = el('div', { class: 'stack' });
  info.append(
    el('p', { class: 'tiny muted', text: `Everything you enter lives in this browser only (localStorage key “lifeprint.v1”). Last saved ${new Date(state.updatedAt).toLocaleString()}.` })
  );
  const rows = el('div', { class: 'row' });
  rows.append(
    el('button', { class: 'btn ghost sm', type: 'button', onclick: () => {
      const blob = new Blob([exportJSON(state)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `lifeprint-answers-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      toast('Answers exported as JSON.');
    } }, 'Export answers (JSON)'),
    el('label', { class: 'btn ghost sm', for: 'import-json' }, 'Import answers'),
    el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { state = demoProfile(); saveState(state); toast('Demo profile loaded.'); go(1, { validate: false }); } }, 'Load demo profile'),
    el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { state = hardCaseProfile(); saveState(state); toast('Hard-case profile loaded.'); go(1, { validate: false }); } }, 'Load hard case'),
    el('button', { class: 'btn danger sm', type: 'button', onclick: () => {
      confirmModal({
        title: 'Erase everything?',
        message: 'This clears your answers, uploaded findings, and generated book from this browser. It cannot be undone.',
        confirmLabel: 'Erase and start over',
        kind: 'danger',
        onConfirm: () => { state = resetState(); go(0, { validate: false }); toast('Cleared. Starting fresh.'); },
      });
    } }, 'Reset all data')
  );
  const importInput = el('input', {
    id: 'import-json', type: 'file', accept: 'application/json', class: 'sr-only',
    onchange: async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        state = importJSON(text);
        saveState(state);
        toast('Answers imported.');
        go(state.currentStep || 1, { validate: false });
      } catch (err) {
        toast(`Could not read that file: ${err.message}`, 'bad');
      }
    },
  });
  info.append(rows, importInput);
  body.push(info);

  if ((state.versions || []).length) {
    body.push(el('h3', { text: 'Book versions', style: 'margin-top:24px' }));
    body.push(el('p', { class: 'tiny muted', text: 'The three most recent drafts can be restored. Older entries are kept as a record only, to stay inside this browser’s storage limit.' }));
    const list = el('ul', { class: 'filelist' });
    state.versions.forEach((v, i) => {
      list.append(el('li', {}, [
        el('span', { class: 'grow', style: 'flex:1' }, `${new Date(v.at).toLocaleString()} — ${v.chapters} chapters`),
        i === 0 ? el('span', { class: 'badge on', text: 'current' }) : el('span', { class: 'badge', text: `v${state.versions.length - i}` }),
        v.snapshot && i > 0
          ? el('button', { class: 'btn ghost sm', type: 'button', onclick: () => { const bd = qs('.modal-backdrop'); if (bd) bd.remove(); restoreVersion(i); } }, 'Restore')
          : el('span', { class: 'tiny muted', text: v.snapshot ? 'in use' : 'record only' }),
      ]));
    });
    body.push(list);
  }
  modal({ title: 'Book & data', bodyNodes: body, actions: [{ label: 'Close' }], wide: true });
}

/* ---------------- render ---------------- */
const ctx = {
  get state() { return state; },
  patch,
  go,
  next,
  back,
  render: () => render(),
  errors: () => errors,
  errorFor: (fieldName) => (errors.find((e) => e.field === fieldName) || {}).message,
  runPipeline,
  invalidateBook,
  toast,
  modal,
  confirmModal,
  field,
  openMenu,
  setState: (nextState) => { state = nextState; saveState(state); },
};

function stepNav() {
  const isLast = state.currentStep >= TOTAL_STEPS - 1;
  const optional = OPTIONAL_STEPS.includes(state.currentStep);
  return el('div', { class: 'step-nav' }, [
    state.currentStep > 0 ? el('button', { class: 'btn ghost', type: 'button', onclick: back }, '← Back') : null,
    el('span', { class: 'grow' }),
    optional ? el('button', { class: 'btn quiet', type: 'button', onclick: () => go(state.currentStep + 1, { validate: false }) }, 'Skip this step') : null,
    isLast ? null : el('button', { class: 'btn', type: 'button', onclick: next }, state.currentStep === 0 ? 'Start building' : 'Continue →'),
  ]);
}

function render() {
  const main = clear(qs('#main'));
  const mod = STEPS[state.currentStep] || STEPS[0];
  const wrap = el('div', { class: 'step' });
  const node = mod.render(ctx);
  wrap.append(node);
  if (mod.showNav !== false) wrap.append(stepNav());
  main.append(wrap);
  document.title = `${STEP_TITLES[state.currentStep]} — LifePrint`;
  updateChrome();
}

/* ---------------- boot ---------------- */
function boot() {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || params.get('demo');
  if (scenario === 'demo') { state = demoProfile(); saveState(state); }
  if (scenario === 'hard') { state = hardCaseProfile(); saveState(state); }
  const stepParam = params.get('step');
  if (stepParam !== null) {
    const n = Number(stepParam);
    if (Number.isFinite(n)) {
      state.currentStep = Math.max(0, Math.min(TOTAL_STEPS - 1, n));
      for (let i = 0; i <= state.currentStep; i += 1) if (!state.visited.includes(i)) state.visited.push(i);
      saveState(state);
    }
  }
  qs('#btn-menu').addEventListener('click', openMenu);
  document.addEventListener('keydown', (ev) => {
    if (ev.altKey && ev.key === 'ArrowRight') next();
    if (ev.altKey && ev.key === 'ArrowLeft') back();
  });
  render();
  markSaved('idle');
  window.LifePrint = {
    get state() { return state; },
    go, runPipeline, buildRules, buildBook, validateBook, openMenu, restoreVersion,
    setState: (mutator) => { mutator(state); persist(); render(); },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
