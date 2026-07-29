// Step 9 — Safety review. Some flags must be acknowledged before the book can be built.
import { el, card, callout, table } from '../ui/dom.js';
import { runSafetyChecks, needsAcknowledgement } from '../engine/safety.js';
import { detectConflicts, CONFLICT_OPTIONS } from '../engine/conflicts.js';
import { buildRules } from '../engine/rules.js';

const LEVEL_ORDER = { urgent: 0, stop: 1, caution: 2 };

export default {
  // This screen renders its own gated forward button, so the generic step nav
  // must not offer a way around the acknowledgements.
  showNav: false,
  render(ctx) {
    const flags = runSafetyChecks(ctx.state).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    const conflicts = detectConflicts(ctx.state);
    const rules = buildRules(ctx.state);
    const acked = new Set(ctx.state.safety.acknowledged || []);
    const mustAck = flags.filter((f) => f.requiresAck);
    const outstanding = mustAck.filter((f) => !acked.has(f.id));

    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'eyebrow', text: 'Step 9 of 13' }),
      el('h1', { text: flags.length ? 'Before we build this, read these.' : 'Safety review: nothing to flag.' }),
      el('p', { class: 'lede', text: flags.length
        ? 'These are generated from your own answers. They are not legal boilerplate — each one names the specific combination that triggered it and what to do about it. Flags marked as required must be acknowledged; they are also printed in your book so the reasoning survives.'
        : 'Your answers did not trigger any safety flags. The standard educational disclaimer still appears in the book, and the clinician page will note that no flags were raised.' })
    );

    const body = el('div', { class: 'step-body' });

    if (flags.length) {
      body.append(el('div', { class: 'grid three' }, [
        el('div', { class: 'stat' }, [el('b', { text: String(flags.filter((f) => f.level === 'urgent').length) }), el('span', { text: 'urgent — see a clinician first' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(flags.filter((f) => f.level === 'stop').length) }), el('span', { text: 'hard stops needing acknowledgement' })]),
        el('div', { class: 'stat' }, [el('b', { text: String(flags.filter((f) => f.level === 'caution').length) }), el('span', { text: 'cautions printed in your book' })]),
      ]));
    }

    for (const f of flags) {
      const isAcked = acked.has(f.id);
      body.append(el('div', { class: `callout ${f.level === 'urgent' ? 'urgent' : f.level === 'stop' ? 'stop' : 'caution'}` }, [
        el('h4', {}, [
          f.title,
          el('span', { class: 'badge', style: 'margin-left:8px', text: f.level }),
          f.requiresAck ? el('span', { class: `badge ${isAcked ? 'on' : ''}`, style: 'margin-left:6px', text: isAcked ? 'acknowledged' : 'acknowledgement required' }) : null,
        ]),
        el('p', { text: f.body }),
        f.action ? el('p', {}, [el('strong', { text: 'What to do: ' }), f.action]) : null,
        f.requiresAck
          ? el('div', { class: 'callout-actions' }, [
              el('button', {
                class: `btn ${isAcked ? 'ghost' : 'clay'} sm`, type: 'button',
                onclick: () => ctx.patch((s) => {
                  const set = new Set(s.safety.acknowledged || []);
                  if (set.has(f.id)) set.delete(f.id);
                  else set.add(f.id);
                  s.safety.acknowledged = [...set];
                }, { rerender: true }),
              }, isAcked ? '✓ Acknowledged — click to undo' : 'I have read this and want to continue'),
            ])
          : null,
        f.undismissable ? el('p', { class: 'tiny', style: 'margin-top:8px', text: 'This flag stays in your book regardless of what you do here. It cannot be dismissed.' }) : null,
      ]));
    }

    if (conflicts.length && !ctx.state.frameworks.conflictChoice) {
      body.append(card({
        title: 'You have unresolved framework conflicts',
        sub: 'Pick how to proceed. This choice is printed in the book so it reads as a decision rather than an accident.',
        children: [
          el('div', { class: 'grid three' }, CONFLICT_OPTIONS.map((o) =>
            el('button', {
              class: 'optcard', type: 'button',
              onclick: () => {
                if (o.id === 'adjust') { ctx.go(3, { validate: false }); return; }
                ctx.patch((s) => { s.frameworks.conflictChoice = o.id; ctx.invalidateBook('Conflict choice set.'); }, { rerender: true });
              },
            }, [
              el('span', { class: 'oc-mark', 'aria-hidden': 'true' }),
              el('span', {}, [el('span', { class: 'oc-title', text: o.label }), el('span', { class: 'oc-desc', text: o.description })]),
            ])
          )),
        ],
      }));
    }

    // ---- what the engine resolved ----
    if (rules.reconciliations.length) {
      body.append(card({
        title: 'How your non-negotiables were reconciled',
        sub: 'You asked to keep these foods. Here is exactly what happened to each request, and why.',
        children: [table({
          columns: ['Food', 'Outcome', 'What happened and why'],
          rows: rules.reconciliations.map((r) => [
            r.food,
            r.kept ? 'Kept, portion-limited' : 'Removed',
            r.note,
          ]),
        })],
      }));
    }

    body.append(card({
      title: 'Precedence, in the order it is applied',
      sub: 'Every ruling in your book can be traced to one of these eight levels. Level 1 always wins.',
      tone: 'quiet',
      children: [table({
        columns: ['#', 'Level', 'Effect'],
        rows: [
          ['1', 'Medical allergy', 'Permanent hard exclusion, plus the whole allergen family and cross-contact guidance.'],
          ['2', 'Clinician instruction', 'Never overridden by any framework, preference, or craving.'],
          ['3', 'Diagnosed intolerance', 'Hard exclusion; family expanded where relevant (gluten, dairy).'],
          ['4', 'Religious or ethical restriction', 'Absolute exclusion, never questioned.'],
          ['5', 'Confirmed report finding', 'Temporary reduction, reintroducible, always cited.'],
          ['6', 'Framework exclusion', 'Applies for the phase you are running.'],
          ['7', 'User-observed trigger', 'Reduced and tracked, never framed as a diagnosis.'],
          ['8', 'Preference and dislikes', 'Excluded as preference; can be overridden by your non-negotiables.'],
        ],
      })],
    }));

    body.append(el('div', { class: 'row between', style: 'margin-top:8px' }, [
      el('p', { class: 'tiny muted', style: 'margin:0;max-width:52ch', text: outstanding.length
        ? `${outstanding.length} flag${outstanding.length === 1 ? '' : 's'} still need acknowledgement before generating.`
        : 'All required acknowledgements are complete.' }),
      el('button', {
        class: 'btn', type: 'button', disabled: outstanding.length ? true : null,
        onclick: () => ctx.go(10, { validate: false }),
      }, outstanding.length ? `Acknowledge ${outstanding.length} flag${outstanding.length === 1 ? '' : 's'} to continue` : 'Generate my book →'),
    ]));

    if (mustAck.length && !needsAcknowledgement(flags, [...acked]).length) {
      body.append(callout({ variant: 'info', title: 'Recorded', text: 'Your acknowledgements are stored with your answers and printed on the clinician review page with the date.' }));
    }

    return wrap.appendChild(body) && wrap;
  },
};
