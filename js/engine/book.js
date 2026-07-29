// LifePrint — book assembly. Turns engine output into an ordered chapter/block model that both
// the web preview and the PDF renderer consume. Deterministic: same state -> same book.
import { CHAPTERS } from '../state.js';
import { FOODS, getFood } from './foods.js';
import { getProtocol } from './protocols.js';
import { buildRules } from './rules.js';
import { detectConflicts } from './conflicts.js';
import { runSafetyChecks } from './safety.js';
import { generateMealPlan, buildGroceryList, buildStaples, buildBatchPlan, buildRestaurantGuide, slotsForMealsPerDay } from './mealplan.js';
import { getRecipe, estimateNutrition, RECIPES, checkRecipeCompliance } from './recipes.js';
import * as R from './routines.js';

const DEPTH = {
  15: { key: 'brief', foods: 48, recipes: 6, journal: 2, trackers: 4, indexAll: false, extendedNotes: false, targetPages: 15 },
  30: { key: 'standard', foods: 120, recipes: 10, journal: 4, trackers: 7, indexAll: false, extendedNotes: false, targetPages: 30 },
  60: { key: 'deep', foods: 220, recipes: 16, journal: 8, trackers: 11, indexAll: true, extendedNotes: true, targetPages: 60 },
  100: { key: 'complete', foods: FOODS.length, recipes: 24, journal: 14, trackers: 11, indexAll: true, extendedNotes: true, targetPages: 100 },
};

export function depthFor(state) {
  return DEPTH[Number(state.bookPrefs.length)] || DEPTH[30];
}

const TONE_LEAD = {
  supportive: ['Here is the gentle version:', 'A kind place to start:', 'Nothing here has to be perfect.'],
  straightforward: ['The short version:', 'Plainly:', 'What this means:'],
  clinical: ['Rationale:', 'Clinical context:', 'Basis for this guidance:'],
  coach: ['Your job this week:', 'Let us get to work:', 'Here is the play:'],
};

function toneLead(tone, variant) {
  const arr = TONE_LEAD[tone] || TONE_LEAD.supportive;
  return arr[variant % arr.length];
}

/** Deterministic paragraph variant: rotates sentence order and tone lead-in. Never invents facts. */
function para(ctx, id, sentences, opts = {}) {
  const variant = (ctx.variants || {})[id] || 0;
  const list = sentences.filter(Boolean);
  const rotated = variant === 0 ? list : list.slice(variant % list.length).concat(list.slice(0, variant % list.length));
  let text = rotated.join(' ');
  if (opts.tone && variant > 0) text = `${toneLead(ctx.tone, variant)} ${text}`;
  const edited = (ctx.edits || {})[id];
  return {
    type: 'p',
    id,
    text: edited !== undefined ? edited : text,
    edited: edited !== undefined,
    variant,
    variantCount: Math.max(1, list.length),
    generated: opts.heuristic ? 'heuristic' : 'rules-engine',
    why: opts.why || null,
  };
}

function h(ctx, id, text, level = 'h2') {
  const edited = (ctx.edits || {})[id];
  return { type: level, id, text: edited !== undefined ? edited : text, edited: edited !== undefined };
}

const bullets = (id, items) => ({ type: 'ul', id, items: items.filter(Boolean) });
const numbers = (id, items) => ({ type: 'ol', id, items: items.filter(Boolean) });
const table = (id, columns, rows, caption) => ({ type: 'table', id, columns, rows, caption, repeatHeader: true });
const callout = (id, variant, title, text) => ({ type: 'callout', id, variant, title, text });
const kv = (id, pairs) => ({ type: 'kv', id, pairs: pairs.filter(([, v]) => v !== '' && v !== undefined && v !== null) });
const journal = (id, title, lines) => ({ type: 'journal', id, title, lines });

function whyFrom(ruling) {
  if (!ruling) return null;
  return {
    recommendation: `${ruling.food}: ${ruling.status}`,
    reason: ruling.reason,
    sourceType: ruling.sourceType,
    sourceReference: ruling.sourceReference,
    confidence: ruling.confidence,
    temporary: !!ruling.temporary,
    reintroducible: !!ruling.reintroducible,
    foodId: ruling.foodId,
  };
}

/* ------------------------------------------------------------------ chapters */

const CHAPTER_META = Object.fromEntries(CHAPTERS.map(([id, title, desc, on]) => [id, { title, desc, on }]));

function buildChapter(id, ctx) {
  const b = [];
  const { state, rules, plan, grocery, staples, batch, restaurant, conflicts, safetyFlags, depth } = ctx;
  const name = state.profile.firstName || 'Friend';
  const protocols = (state.frameworks.selected || []).map(getProtocol).filter(Boolean);
  const protocolNames = protocols.map((p) => p.name);
  const top3 = state.goals.top3 || [];

  switch (id) {
    case 'welcome':
      b.push(para(ctx, 'welcome-1', [
        `${name}, this book was assembled from what you told LifePrint — your goals, your frameworks, your restrictions, and anything you uploaded and confirmed.`,
        'Nothing in it was invented. Every recommendation traces back to a source you can see, and the "why" pages name that source explicitly.',
        'It is educational guidance, not medical advice, and it does not replace a clinician who knows you.',
      ], { tone: true }));
      b.push(h(ctx, 'welcome-h1', 'How to use this book', 'h3'));
      b.push(numbers('welcome-2', [
        'Read the food guide first. It sorts every food into one of four statuses.',
        `Cook from the meal plan for your first ${Math.min(7, Number(state.bookPrefs.mealPlanDays) || 7)} days without improvising.`,
        'Print the trackers you will actually fill in — two is plenty.',
        'Revisit the reintroduction chapter once you have two calm weeks in a row.',
      ]));
      b.push(h(ctx, 'welcome-h2', 'The four statuses', 'h3'));
      b.push(table('welcome-3', ['Status', 'What it means'], [
        ['Eat freely', 'Fits your frameworks and nothing in your profile restricts it.'],
        ['Eat in moderation', 'Fine in smaller or less frequent portions during this phase.'],
        ['Occasional', 'A deliberate treat rather than a staple.'],
        ['Avoid', 'Excluded right now. The reason and its source are always named.'],
      ]));
      b.push(callout('welcome-4', 'info', 'What this book is not',
        'It is not a diagnosis, a treatment plan, or a substitute for care. It does not claim to cure or treat any condition. Where it disagrees with your clinician, follow your clinician.'));
      break;

    case 'your-profile': {
      const p = state.profile;
      const height = p.heightUnit === 'metric' ? (p.heightCm ? `${p.heightCm} cm` : '') : (p.heightFt ? `${p.heightFt} ft ${p.heightIn || 0} in` : '');
      b.push(kv('profile-1', [
        ['Name', p.firstName],
        ['Age', p.age],
        ['Height', height],
        ['Weight', p.weight ? `${p.weight} ${p.weightUnit}` : ''],
        ['Goal weight', p.goalWeight ? `${p.goalWeight} ${p.weightUnit}` : ''],
        ['Occupation', p.occupation],
        ['Activity level', p.activityLevel],
        ['Household size', p.householdSize],
        ['Cooking skill', p.cookingSkill],
        ['Budget', p.budget],
        ['Equipment', (p.equipment || []).join(', ')],
        ['Stores', (p.stores || []).join(', ')],
        ['Time per meal', `${p.timePerMeal} min`],
        ['Weekly batch window', `${p.batchWindow} min`],
        ['Frameworks', protocolNames.join(', ')],
        ['Meals per day', state.food.mealsPerDay],
      ]));
      b.push(para(ctx, 'profile-2', [
        `Your plan is built for ${p.householdSize === 1 ? 'one person' : `${p.householdSize} people`}, a ${p.timePerMeal}-minute weekday cooking ceiling, and a ${p.budget} budget.`,
        `Recipes were filtered to the equipment you actually own: ${(p.equipment || []).join(', ') || 'basic tools'}.`,
        depth.extendedNotes ? 'If any of these change, regenerate the book rather than working around it — the meal plan and grocery list both depend on them.' : '',
      ]));
      break;
    }

    case 'goals':
      b.push(para(ctx, 'goals-1', [
        top3.length ? `Your top priorities are ${top3.join(', ')}.` : 'You have not ranked priorities yet, so this book weights all of your goals equally.',
        `You also selected: ${(state.goals.selected || []).filter((g) => !top3.includes(g)).join(', ') || 'nothing else'}.`,
        'The plan leads with your first priority; the rest are supported but not optimized for.',
      ], { tone: true }));
      if (state.goals.customGoal) b.push(callout('goals-custom', 'info', 'Your custom goal', state.goals.customGoal));
      b.push(table('goals-2', ['Priority', 'Goal', 'What it asks of you', 'How to tell it is working'],
        (top3.length ? top3 : (state.goals.selected || []).slice(0, 3)).map((g, i) => [String(i + 1), g, goalAsk(g), goalSignal(g)])));
      if (depth.extendedNotes) {
        b.push(para(ctx, 'goals-3', [
          'Goals compete for attention. Two at a time is realistic; five is a wish list.',
          'Pick the one you would keep if a hard week forced you to drop the rest, and protect that one.',
        ]));
      }
      break;

    case 'framework': {
      b.push(para(ctx, 'fw-1', [
        `You selected ${protocolNames.length} framework${protocolNames.length === 1 ? '' : 's'}: ${protocolNames.join(', ')}.`,
        'Below is exactly what each one includes and excludes in this book, so nothing is a mystery later.',
      ], { tone: true }));
      for (const p of protocols) {
        b.push(h(ctx, `fw-${p.id}-h`, p.name, 'h3'));
        b.push(para(ctx, `fw-${p.id}-p`, [p.blurb, p.guidance, p.mealNotes]));
        b.push(kv(`fw-${p.id}-kv`, [
          ['Removes', (p.eliminatesGroups || []).join(', ') || 'nothing outright'],
          ['Emphasizes', (p.emphasize || []).join(', ') || 'balanced whole foods'],
          ['Supervision suggested', p.supervision ? 'Yes — it is a clinical-grade protocol' : 'Not required'],
        ]));
      }
      if (state.frameworks.customText) b.push(callout('fw-custom', 'info', 'Your custom framework', state.frameworks.customText));
      if (state.frameworks.clinicianText) {
        b.push(callout('fw-clin', 'info', 'Clinician instructions on file',
          `${state.frameworks.clinicianText}\n\nThese instructions override every other rule in this book.`));
      }
      if (conflicts.length) {
        b.push(h(ctx, 'fw-conf-h', 'Where your frameworks disagree', 'h3'));
        b.push(table('fw-conf', ['Conflict', 'Severity', 'Why it matters', 'Suggested resolution'],
          conflicts.map((c) => [c.title, c.severity, c.explanation, c.recommendation])));
        b.push(para(ctx, 'fw-conf-p', [
          `You chose to ${conflictChoiceLabel(state.frameworks.conflictChoice)}.`,
          'That choice is recorded here so a clinician can see the reasoning rather than guessing.',
        ]));
      }
      break;
    }

    case 'food-guide': {
      b.push(para(ctx, 'fg-1', [
        `Of the ${FOODS.length} foods in the LifePrint library, ${rules.counts['Eat freely']} are yours to eat freely, ${rules.counts['Eat in moderation']} in moderation, ${rules.counts.Occasional} occasionally, and ${rules.counts.Avoid} are paused.`,
        'Every "Avoid" entry names its source and says whether it can come back.',
      ], { tone: true }));
      const order = ['Eat freely', 'Eat in moderation', 'Occasional', 'Avoid'];
      const per = Math.max(12, Math.round(depth.foods / 4));
      for (const status of order) {
        const list = rules.byStatus[status];
        b.push(h(ctx, `fg-h-${status}`, `${status} (${list.length})`, 'h3'));
        const shown = list.slice(0, status === 'Avoid' ? Math.max(per, 40) : per);
        b.push(table(`fg-t-${status}`,
          status === 'Avoid' ? ['Food', 'Why', 'Source', 'Can it return?'] : ['Food', 'Category', 'Note'],
          shown.map((r) => (status === 'Avoid'
            ? [r.food, trim(r.reason, 150), r.sourceType, r.reintroducible ? 'Yes, later' : 'No']
            : [r.food, r.category, trim(r.personalizationNote || r.reason, 110)]))));
        if (list.length > shown.length) {
          b.push(para(ctx, `fg-more-${status}`, [`${list.length - shown.length} more ${status.toLowerCase()} foods are covered in the "Can I eat this?" index.`]));
        }
      }
      if (rules.reconciliations.length) {
        b.push(h(ctx, 'fg-recon-h', 'Foods you asked to keep', 'h3'));
        b.push(table('fg-recon', ['Food', 'Kept?', 'Note'], rules.reconciliations.map((r) => [r.food, r.kept ? 'Yes — limited' : 'No — safety rule', r.note])));
      }
      break;
    }

    case 'can-i-eat': {
      const list = depth.indexAll ? rules.list : rules.list.slice(0, depth.foods);
      const sorted = list.slice().sort((a, b2) => a.food.localeCompare(b2.food));
      b.push(para(ctx, 'cie-1', [
        'Alphabetical quick reference. Find the food, read the status, and move on.',
        depth.indexAll ? `All ${sorted.length} foods in your library are listed.` : `The ${sorted.length} most relevant foods for your plan are listed.`,
      ]));
      b.push(table('cie-2', ['Food', 'Status', 'Reason (short)'], sorted.map((r) => [r.food, r.status, trim(r.reason, 90)])));
      break;
    }

    case 'why': {
      const picks = rules.list
        .filter((r) => r.precedence <= 6)
        .sort((a, b2) => a.precedence - b2.precedence || a.food.localeCompare(b2.food))
        .slice(0, depth.extendedNotes ? 40 : 18);
      b.push(para(ctx, 'why-1', [
        'Every ruling in this book has a source and a confidence level. Nothing is a black box.',
        'Rulings are resolved in a strict order: medical allergy, then clinician instruction, then diagnosed intolerance, then confirmed sensitivity findings, then framework exclusions, then your own observations, then preferences.',
      ], { tone: true }));
      for (const r of picks) {
        b.push(para(ctx, `why-${r.foodId}`, [`${r.food} — ${r.status}.`, r.reason, r.personalizationNote], { why: whyFrom(r) }));
      }
      if (!picks.length) b.push(callout('why-none', 'info', 'No restrictions on file', 'Nothing in your profile creates an exclusion, so this chapter is short by design.'));
      break;
    }

    case 'sensitivities': {
      const confirmed = (state.findings || []).filter((f) => f.status === 'Confirmed');
      b.push(para(ctx, 'sens-1', [
        confirmed.length ? `${confirmed.length} finding${confirmed.length === 1 ? '' : 's'} from your uploaded reports were confirmed and applied.` : 'No uploaded report findings were confirmed, so nothing from a document is driving your plan.',
        'A food-sensitivity panel measures antibody binding, not allergy. It does not diagnose anything, and results commonly change between labs and between draws.',
        'LifePrint therefore treats every confirmed finding as temporary and reintroducible.',
      ], { tone: true }));
      if (confirmed.length) {
        b.push(table('sens-2', ['Food', 'Result', 'Source citation', 'Confidence', 'Status in your plan'],
          confirmed.map((f) => [f.food, f.level, f.sourceReference, f.confidence, 'Paused, reintroducible'])));
      }
      const pending = (state.findings || []).filter((f) => f.status === 'Needs confirmation');
      if (pending.length) {
        b.push(callout('sens-3', 'caution', `${pending.length} finding(s) were never confirmed`,
          `These were extracted but not confirmed, so they were NOT applied: ${pending.map((f) => f.food).join(', ')}.`));
      }
      break;
    }

    case 'reintroduction': {
      const proto = R.reintroductionProtocol(rules);
      if (!proto.applicable) {
        b.push(callout('reintro-none', 'info', 'Not applicable yet', 'Nothing in your plan is a temporary, reintroducible exclusion, so there is nothing to reintroduce.'));
        break;
      }
      b.push(para(ctx, 'reintro-1', [
        `${proto.items.length} food${proto.items.length === 1 ? '' : 's'} in your plan are paused temporarily and can be tested again.`,
        'Reintroduce in the order below — framework exclusions first, self-observed triggers last.',
        'A reaction during a trial does not prove an allergy. It is information for you and your clinician.',
      ], { tone: true }));
      b.push(bullets('reintro-2', proto.rules));
      b.push(table('reintro-3', ['#', 'Food', 'Why it was paused', 'Watch window'],
        proto.items.map((i) => [String(i.order), i.food, trim(i.why, 120), i.watchWindow])));
      b.push(h(ctx, 'reintro-h2', 'Portion progression for each trial', 'h3'));
      b.push(numbers('reintro-4', proto.items[0].schedule));
      if (proto.excludedFromReintro.length) {
        b.push(callout('reintro-5', 'caution', 'Never part of a self-directed trial',
          `${proto.excludedFromReintro.slice(0, 14).join(', ')}${proto.excludedFromReintro.length > 14 ? ', and others' : ''} — these come from allergy or diagnosed-intolerance rules. Only a clinician should revisit them.`));
      }
      b.push(table('reintro-log', ['Date', 'Food', 'Portion', 'Symptoms 0-72h', 'Verdict'], blankRows(5, 12)));
      break;
    }

    case 'meal-plan': {
      b.push(para(ctx, 'mp-1', [
        `${plan.days.length} days, ${plan.slots.length} meals a day (${plan.slots.join(', ')}), scaled for ${plan.household} ${plan.household === 1 ? 'person' : 'people'}.`,
        `Daily estimates average roughly ${plan.avgCalories} kcal and ${plan.avgProtein} g protein.`,
        'All nutrition numbers in this book are estimates calculated from a seed database — they are not measured values and should not be used as clinical targets.',
      ], { tone: true }));
      if (plan.plateCount) {
        b.push(callout('mp-2', 'info', 'Composed plates',
          `${plan.plateCount} meal slots use composed plates instead of stored recipes, because your rule set is narrow enough that no stored recipe fit. Each plate lists its components and is built only from your allowed foods.`));
      }
      if (plan.avgProtein < 55 || plan.avgCalories < 1400) {
        const short = [];
        if (plan.avgCalories < 1400) short.push(`about ${plan.avgCalories} estimated kcal a day`);
        if (plan.avgProtein < 55) short.push(`about ${plan.avgProtein} g estimated protein a day`);
        b.push(callout('mp-short', 'caution', 'This plan looks thin on the numbers',
          `Your allowed food library is narrow enough that the rotation lands at ${short.join(' and ')}. That is a direct consequence of the frameworks and exclusions you stacked, not a target we chose. Bring this page — and the clinician appendix — to a registered dietitian before running the plan for more than a few days, and ask specifically about protein and micronutrient coverage.`));
      }
      const chunk = depth.key === 'brief' ? 7 : plan.days.length;
      for (const day of plan.days.slice(0, chunk)) {
        b.push(h(ctx, `mp-day-${day.day}-h`, `${day.label} — est. ${day.totals.calories} kcal, ${day.totals.protein} g protein`, 'h3'));
        b.push(table(`mp-day-${day.day}`, ['Meal', 'What to eat', 'Est. kcal', 'Est. protein', 'Prep'],
          day.meals.map((m) => [cap(m.slot), m.name + (m.type === 'plate' ? ` (${m.components.map((c) => c.name).join(', ')})` : ''), String(m.calories), `${m.protein} g`, `${m.prepMin} min`])));
        b.push(para(ctx, `mp-day-${day.day}-p`, [day.leftoverStrategy], { heuristic: true }));
      }
      if (chunk < plan.days.length) {
        b.push(para(ctx, 'mp-rest', [`Days ${chunk + 1}-${plan.days.length} repeat this rotation. Choose a longer book length to print every day in full.`]));
      }
      break;
    }

    case 'recipes': {
      const used = plan.recipeIdsUsed.map(getRecipe).filter(Boolean);
      const extras = RECIPES.filter((r) => !plan.recipeIdsUsed.includes(r.id) && checkRecipeCompliance(r, (fid) => rules.rulings[fid]).compliant);
      const list = [...used, ...extras].slice(0, depth.recipes);
      b.push(para(ctx, 'rec-1', [
        list.length ? `${list.length} recipes, every ingredient checked against your rule set line by line.` : 'Your rule set is narrow enough that the stored recipe library has no fully compliant entries — your plan uses composed plates instead.',
        'Nutrition per serving is an estimate.',
      ], { tone: true }));
      for (const r of list) {
        const n = estimateNutrition(r);
        b.push(h(ctx, `rec-${r.id}-h`, r.name, 'h3'));
        b.push(kv(`rec-${r.id}-kv`, [
          ['Serves', r.servings],
          ['Prep', `${r.prepMin} min`],
          ['Cook', `${r.cookMin} min`],
          ['Equipment', r.equipment.join(', ') || 'none'],
          ['Est. per serving', `${n.calories} kcal, ${n.protein} g protein (estimate)`],
          ['Budget tier', r.budgetTier],
          ['Cuisine', r.cuisine.join(', ')],
        ]));
        b.push(table(`rec-${r.id}-ing`, ['Amount', 'Ingredient'], r.ingredients.map((i) => [`${i.qty} ${i.unit}`.trim(), (getFood(i.foodId) || { name: i.foodId }).name + (i.note ? ` — ${i.note}` : '')])));
        b.push(numbers(`rec-${r.id}-steps`, r.instructions));
        b.push(kv(`rec-${r.id}-notes`, [['Storage', r.storage], ['Batch prep', r.batchNotes]]));
        if (r.substitutions.length) b.push(bullets(`rec-${r.id}-subs`, r.substitutions));
      }
      break;
    }

    case 'grocery': {
      b.push(para(ctx, 'gro-1', [
        `${grocery.itemCount} items across ${Object.keys(grocery.byAisle).length} aisle groups, built from your meal plan.`,
        grocery.disclaimer,
      ], { tone: true }));
      for (const [aisle, items] of Object.entries(grocery.byAisle)) {
        b.push(h(ctx, `gro-h-${aisle}`, aisle, 'h3'));
        b.push(table(`gro-t-${aisle}`, ['Item', 'Rough quantity', 'Uses'], items.map((i) => [i.food, i.quantityHint, String(i.times)])));
      }
      break;
    }

    case 'stores': {
      if (!grocery.stores.length) {
        b.push(callout('stores-none', 'info', 'No stores selected', 'Add your usual stores in the profile step and this chapter fills itself in.'));
        break;
      }
      b.push(para(ctx, 'stores-1', ['Store-specific notes based on where you shop. Stock and formulations change constantly — always read the label yourself.']));
      for (const s of grocery.stores) {
        b.push(h(ctx, `store-${s.store}-h`, s.store, 'h3'));
        b.push(para(ctx, `store-${s.store}-p`, [s.notes], { heuristic: true }));
      }
      break;
    }

    case 'pantry':
      b.push(para(ctx, 'pan-1', ['A stocked kitchen is most of the plan. These lists contain only foods that are allowed for you.']));
      b.push(h(ctx, 'pan-h1', 'Pantry', 'h3'));
      b.push(table('pan-t1', ['Item', 'Note'], staples.pantry.map((i) => [i.name, trim(i.note, 100)])));
      b.push(h(ctx, 'pan-h2', 'Fridge', 'h3'));
      b.push(table('pan-t2', ['Item', 'Note'], staples.fridge.map((i) => [i.name, trim(i.note, 100)])));
      b.push(h(ctx, 'pan-h3', 'Freezer', 'h3'));
      b.push(table('pan-t3', ['Item', 'Note'], staples.freezer.map((i) => [i.name, trim(i.note, 100)])));
      break;

    case 'batch-prep':
      b.push(para(ctx, 'batch-1', [
        `You have about ${batch.windowMinutes} minutes a week for prep. ${batch.cadence}.`,
        `The tasks below total roughly ${batch.totalMinutes} minutes.`,
      ], { tone: true }));
      b.push(table('batch-2', ['Task', 'Minutes', 'Notes'], batch.tasks.map((t) => [t.task, String(t.minutes), t.notes || ''])));
      b.push(bullets('batch-3', [
        'Start the longest-cooking item first, then work down.',
        'Cool food fully before it goes in the fridge.',
        'Label everything with the date you cooked it.',
      ]));
      break;

    case 'restaurant':
      b.push(para(ctx, 'rest-1', [
        `You eat out about ${restaurant.diningOutFrequency}. This chapter assumes you will, and makes it easy.`,
        'Order structure beats menu literacy: protein, vegetable, starch, fat on the side.',
      ], { tone: true }));
      b.push(h(ctx, 'rest-h1', 'What to order', 'h3'));
      b.push(bullets('rest-2', restaurant.order));
      b.push(h(ctx, 'rest-h2', 'What to ask the server', 'h3'));
      b.push(bullets('rest-3', restaurant.ask));
      b.push(h(ctx, 'rest-h3', 'Hidden ingredients to question', 'h3'));
      b.push(bullets('rest-4', restaurant.hidden));
      b.push(callout('rest-5', 'info', 'Your safe-order script', restaurant.script));
      break;

    case 'travel':
      b.push(para(ctx, 'trav-1', ['Travel is where plans fall apart. The fix is packing food, not finding it.']));
      b.push(bullets('trav-2', restaurant.travel));
      b.push(table('trav-3', ['Situation', 'Fallback meal'], [
        ['Airport, 20 minutes', 'Rotisserie chicken or salad bowl + shelf-stable protein pouch'],
        ['Hotel, no kitchen', 'Rice cup + canned fish + pre-washed greens + olive oil packet'],
        ['Conference lunch', 'Eat your packed protein first, then whatever is safe from the buffet'],
        ['Long drive', 'Cooler with pre-portioned meals from the batch session'],
      ]));
      break;

    case 'hydration': {
      const hyd = R.hydrationTarget(state);
      b.push(para(ctx, 'hyd-1', [
        `Your estimated daily target is about ${hyd.cups} cups (${hyd.ounces} oz), adjusted for your weight and activity level.`,
        `You currently report ${hyd.current}.`,
        'This is an estimate, not a prescription — thirst, urine color, and climate all matter.',
      ], { tone: true }));
      b.push(bullets('hyd-2', hyd.tactics));
      b.push(table('hyd-3', ['Date', 'Cups', 'Electrolytes?', 'Notes'], blankRows(4, 10)));
      break;
    }

    case 'beverages': {
      const bev = R.beverageGuide(state);
      b.push(para(ctx, 'bev-1', [
        `You drink about ${bev.coffee} of coffee. Last caffeine ${bev.caffeineCutoff} is the single highest-leverage change.`,
      ], { tone: true }));
      b.push(bullets('bev-2', bev.notes));
      break;
    }

    case 'alcohol': {
      const bev = R.beverageGuide(state);
      b.push(para(ctx, 'alc-1', [
        `You reported drinking ${bev.alcohol}.`,
        'No moralizing here: alcohol affects sleep, recovery, and digestion, and it is worth knowing the cost so you can choose deliberately.',
        (state.health.flags || {}).pregnancy ? 'You indicated pregnancy — current guidance is no alcohol during pregnancy.' : '',
      ], { tone: true }));
      b.push(bullets('alc-2', [
        'Food first, water between, and a hard stop three hours before bed.',
        'Mixers are usually the larger sugar load.',
        'Two alcohol-free nights before any week you want to feel sharp.',
      ]));
      break;
    }

    case 'supplements': {
      const sup = R.supplementOverview(state);
      b.push(para(ctx, 'sup-1', [
        sup.listed.length ? `You listed: ${sup.listed.join(', ')}.` : 'You did not list any supplements.',
        sup.disclaimer,
      ], { tone: true }));
      if (sup.context.length) b.push(bullets('sup-2', sup.context));
      b.push(h(ctx, 'sup-h', 'How LifePrint handles supplements', 'h3'));
      b.push(bullets('sup-3', sup.rules));
      break;
    }

    case 'fitness': {
      const fit = R.fitnessPlan(state);
      b.push(para(ctx, 'fit-1', [
        `${fit.sessionsPerWeek} sessions a week, built around what you said you like: ${fit.preferences.join(', ')}.`,
        fit.progression,
        fit.disclaimer,
      ], { tone: true }));
      b.push(table('fit-2', ['Day', 'Focus', 'Minutes', 'What to do'], fit.blocks.map((x) => [x.day, x.focus, String(x.minutes), x.detail + (x.cautions ? ` ${x.cautions}` : '')])));
      b.push(h(ctx, 'fit-h', 'Non-negotiables', 'h3'));
      b.push(bullets('fit-3', fit.nonNegotiables));
      break;
    }

    case 'recovery': {
      const rec = R.recoveryPlan(state);
      b.push(para(ctx, 'recov-1', [rec.injuryNote], { tone: true }));
      b.push(table('recov-2', ['Practice', 'Detail'], rec.practices.map((p) => [p.name, p.detail])));
      break;
    }

    case 'sleep': {
      const sl = R.sleepPlan(state);
      b.push(para(ctx, 'sleep-1', [`You report ${sl.current}.`, sl.target, sl.shiftNote], { tone: true }));
      b.push(bullets('sleep-2', sl.windDown));
      b.push(table('sleep-3', ['Date', 'To bed', 'Woke', 'Hours', 'Quality 1-5'], blankRows(5, 10)));
      break;
    }

    case 'stress': {
      const st = R.stressPlan(state);
      b.push(para(ctx, 'stress-1', [`Your reported stress level is ${st.level}.`, st.note], { tone: true }));
      b.push(table('stress-2', ['Practice', 'Minutes', 'How'], st.practices.map((p) => [p.name, String(p.minutes), p.detail])));
      break;
    }

    case 'routines': {
      const rt = R.routines(state);
      for (const key of ['morning', 'evening', 'weeklyReset']) {
        const r = rt[key];
        b.push(h(ctx, `rt-${key}-h`, `${r.title} (${r.minutes} min)`, 'h3'));
        if (r.basedOn) b.push(para(ctx, `rt-${key}-p`, [`Based on what you described: ${r.basedOn}`], { heuristic: true }));
        b.push(numbers(`rt-${key}-l`, r.steps));
      }
      break;
    }

    case 'schedules': {
      const sched = R.weeklySchedules(state, batch);
      b.push(para(ctx, 'sched-1', ['One page for the whole week: shopping, prep, movement, recovery.']));
      b.push(table('sched-2', ['Day', 'Grocery', 'Meal prep', 'Movement', 'Recovery'],
        sched.map((s) => [s.day, s.grocery || '—', s.mealPrep || '—', s.movement, s.recovery])));
      break;
    }

    case 'trackers': {
      const list = R.TRACKERS.slice(0, depth.trackers);
      b.push(para(ctx, 'trk-1', [
        'Print only what you will fill in. Two trackers used beats eleven ignored.',
        (state.health.flags || {}).edHistory ? 'Because you told us there is an eating-disorder history, every tracker here is optional and none of them ask you to count calories.' : '',
      ], { tone: true }));
      for (const t of list) {
        b.push(h(ctx, `trk-${t.id}-h`, t.name, 'h3'));
        b.push(table(`trk-${t.id}`, t.columns, blankRows(t.columns.length, depth.key === 'brief' ? 8 : 14)));
      }
      break;
    }

    case 'journal':
      b.push(para(ctx, 'jrn-1', ['One page a week. Three lines is a complete entry.']));
      for (let i = 1; i <= depth.journal; i += 1) {
        b.push(journal(`jrn-page-${i}`, `Week ${i}`, 12));
      }
      break;

    case 'goal-review':
      b.push(para(ctx, 'gr-1', ['Once a month, answer these five questions honestly and adjust one thing.']));
      b.push(numbers('gr-2', [
        'Which priority actually improved?',
        'What did I do consistently?',
        'What did I plan but never do — and why?',
        'What is one thing to remove from the plan?',
        'What is the single next step?',
      ]));
      b.push(table('gr-3', ['Month', 'Goal', 'Evidence it moved', 'Adjustment'], blankRows(4, 6)));
      break;

    case 'notes':
      b.push(para(ctx, 'notes-1', ['Blank space, on purpose.']));
      for (let i = 1; i <= Math.max(2, Math.round(depth.journal / 2)); i += 1) b.push(journal(`notes-page-${i}`, `Notes ${i}`, 14));
      break;

    case 'symptom-map': {
      const map = R.symptomMap(state, rules);
      if (!map.entries.length) {
        b.push(callout('sym-none', 'info', 'Nothing mapped yet', 'You have not linked any foods to symptoms. Use the symptom tracker for two weeks and this chapter becomes useful.'));
        break;
      }
      b.push(para(ctx, 'sym-1', [
        `You linked ${map.entries.length} food${map.entries.length === 1 ? '' : 's'} to symptoms${map.concerns.length ? `: ${map.concerns.join(', ')}` : ''}.`,
        'Association is not causation — this map exists to give a clinician something concrete to work from.',
      ], { tone: true }));
      b.push(table('sym-2', ['You reported', 'Matched food', 'Status in your plan', 'Symptoms noted'],
        map.entries.map((e) => [e.input, e.matched || 'no match in library', e.status, e.symptoms.join(', ') || '—'])));
      break;
    }

    case 'clinician': {
      b.push(para(ctx, 'clin-1', [
        safetyFlags.length ? `${safetyFlags.length} item${safetyFlags.length === 1 ? '' : 's'} in your profile deserve a professional set of eyes.` : 'No safety flags were triggered by your profile.',
        'This page exists so you can hand your clinician one sheet instead of narrating your whole history.',
      ], { tone: true }));
      if (safetyFlags.length) {
        b.push(table('clin-2', ['Flag', 'Level', 'What it is', 'Suggested action'],
          safetyFlags.map((f) => [f.title, f.level === 'urgent' ? 'Urgent' : f.level === 'stop' ? 'Review first' : 'Caution', f.body, f.action])));
      }
      if (conflicts.length) {
        b.push(h(ctx, 'clin-h2', 'Framework conflicts', 'h3'));
        b.push(table('clin-3', ['Conflict', 'Severity', 'Detail'], conflicts.map((c) => [c.title, c.severity, c.explanation])));
      }
      b.push(kv('clin-4', [
        ['Medications on file', state.health.medications || 'none listed'],
        ['Supplements on file', state.health.supplements || 'none listed'],
        ['Diagnoses on file', state.health.diagnoses || 'none listed'],
        ['Frameworks', protocolNames.join(', ')],
        ['Hard exclusions', rules.byStatus.Avoid.filter((r) => r.hardExclusion).map((r) => r.food).join(', ') || 'none'],
      ]));
      b.push(callout('clin-5', 'info', 'For the clinician',
        'This document was generated by a static, browser-only tool from patient-entered data and patient-confirmed report extracts. It contains no diagnosis and no dosing. Nutrition figures are database estimates.'));
      break;
    }

    case 'sources': {
      const cited = rules.list.filter((r) => ['Uploaded report', 'Food sensitivity test result', 'Clinician instruction', 'Medical allergy', 'Diagnosed intolerance'].includes(r.sourceType));
      b.push(para(ctx, 'src-1', ['Every ruling that came from a document, a diagnosis, or a clinician instruction, with its citation.']));
      b.push(table('src-2', ['Food', 'Source type', 'Citation', 'Confidence'], cited.length ? cited.map((r) => [r.food, r.sourceType, r.sourceReference, r.confidence]) : [['—', 'No document-derived rulings', '—', '—']]));
      if ((state.documents || []).length) {
        b.push(h(ctx, 'src-h', 'Documents you uploaded', 'h3'));
        b.push(table('src-3', ['File', 'Type', 'Pages/lines read', 'Processed in browser'],
          state.documents.map((d) => [d.name, d.docType, String(d.pages || '—'), d.extractable ? 'Text extracted locally' : 'Manual entry only'])));
      }
      b.push(callout('src-4', 'info', 'Method note',
        'Findings were extracted with a conservative pattern matcher that only records food + result pairs actually present in the text, and only after you confirmed each one. Nothing was inferred.'));
      break;
    }

    default:
      b.push(para(ctx, `${id}-1`, ['This chapter is intentionally short.']));
  }
  return b;
}

/* ----------------------------------------------------------------- helpers */

function trim(text, n) {
  const s = String(text || '');
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const blankRows = (cols, rows) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));

function goalAsk(goal) {
  const map = {
    'Fat loss': 'A modest, sustained energy deficit plus protein and resistance training to protect muscle.',
    'Muscle gain': 'Progressive resistance training and enough protein and total energy to support it.',
    'Improved energy': 'Consistent meal timing, adequate iron and B12 intake, and protected sleep.',
    'Reduced bloating': 'Identifying fermentable triggers, slowing meals, and reducing very large single portions.',
    'Better digestion': 'Regular meal spacing, adequate fiber and fluid, and a symptom log.',
    'Better sleep': 'A fixed wake time, a caffeine cutoff, and a dim final hour.',
    'Reduced stress': 'Short daily practices and one boundary you actually hold.',
    'Improved fitness': 'Three sessions a week you can repeat for a month.',
    'Injury recovery support': 'Protein, sleep, and load management that respects the injury.',
    'Autoimmune-diet support': 'A time-boxed elimination with a planned reintroduction and clinical oversight.',
    'Better meal consistency': 'A repeatable rotation and one batch-cook session a week.',
    'Reduced sugar': 'Removing liquid sugar first, then baked goods, then keeping fruit.',
    'Higher protein': 'A 30-45 g protein anchor at each main meal.',
    'Lower carbohydrate intake': 'Concentrating carbohydrate around your largest meal or training.',
    'Improved skin': 'Consistency, hydration, sleep, and patience — skin changes lag by weeks.',
    'Hormone-supportive lifestyle': 'Adequate energy intake, sufficient fat, strength training, and sleep.',
    'General wellness': 'The unglamorous basics done most days.',
    'Better organization': 'One grocery day, one prep day, one written plan.',
    'Custom goal': 'A specific, observable weekly action.',
  };
  return map[goal] || 'A specific weekly action you can observe.';
}

function goalSignal(goal) {
  const map = {
    'Fat loss': 'Weekly average trending down slowly; strength maintained.',
    'Muscle gain': 'More reps or load at the same effort.',
    'Improved energy': 'Fewer afternoon crashes logged in the energy tracker.',
    'Reduced bloating': 'Lower bloating scores after previously reliable trigger meals.',
    'Better digestion': 'More regular pattern in the digestion log.',
    'Better sleep': 'Fewer night wakings; easier mornings at the same wake time.',
    'Reduced stress': 'You use the practice without deciding to.',
    'Improved fitness': 'Four consecutive weeks of three sessions.',
    'Injury recovery support': 'Pain-free range increasing week over week.',
    'Autoimmune-diet support': 'Symptom scores stabilize before reintroduction begins.',
    'Better meal consistency': 'Fewer than two unplanned meals a week.',
    'Reduced sugar': 'Cravings shorter and less frequent by week three.',
    'Higher protein': 'Protein anchor present at every main meal for a full week.',
    'Lower carbohydrate intake': 'Steadier afternoon energy without new headaches.',
    'Improved skin': 'Fewer flare days per month.',
    'Hormone-supportive lifestyle': 'More regular cycles and steadier mood, tracked over months.',
    'General wellness': 'You feel like yourself more days than not.',
    'Better organization': 'You know what dinner is before 4pm.',
  };
  return map[goal] || 'You can point to something concrete after four weeks.';
}

function conflictChoiceLabel(choice) {
  return {
    adjust: 'adjust your selections',
    keep: 'keep the combination and customize carefully',
    supervision: 'continue with a professional supervision note added to this book',
  }[choice] || 'continue without changing your selections';
}

/* ------------------------------------------------------------------- public */

export function buildBook(state, opts = {}) {
  const rules = opts.rules || buildRules(state);
  const conflicts = detectConflicts(state);
  const safetyFlags = runSafetyChecks(state);
  const plan = generateMealPlan(rules, state);
  const grocery = buildGroceryList(plan, rules, state);
  const staples = buildStaples(rules, state);
  const batch = buildBatchPlan(plan, state);
  const restaurant = buildRestaurantGuide(rules, state);
  const depth = depthFor(state);
  const ctx = {
    state, rules, plan, grocery, staples, batch, restaurant, conflicts, safetyFlags, depth,
    tone: state.bookPrefs.tone || 'supportive',
    edits: opts.edits || (state.book && state.book.edits) || {},
    variants: opts.variants || (state.book && state.book.variants) || {},
  };

  const enabled = (state.bookPrefs.chapters || [])
    .filter((c) => c.on)
    .sort((a, b) => a.order - b.order);

  const custom = (state.book && state.book.customChapters) || [];
  const locked = new Set((state.book && state.book.locked) || []);
  const prior = new Map(((state.book && state.book.chapters) || []).map((c) => [c.id, c]));

  const chapters = [];
  for (const entry of enabled) {
    const meta = CHAPTER_META[entry.id];
    if (!meta) continue;
    if (locked.has(entry.id) && prior.has(entry.id)) {
      chapters.push({ ...prior.get(entry.id), locked: true });
      continue;
    }
    chapters.push({
      id: entry.id,
      title: meta.title,
      description: meta.desc,
      blocks: buildChapter(entry.id, ctx),
      locked: false,
    });
  }
  for (const c of custom) {
    chapters.push({
      id: c.id,
      title: c.title,
      description: 'Custom chapter',
      custom: true,
      locked: locked.has(c.id),
      blocks: [
        { type: 'p', id: `${c.id}-body`, text: (ctx.edits[`${c.id}-body`] !== undefined ? ctx.edits[`${c.id}-body`] : c.body) || '', generated: 'user' },
      ],
    });
  }

  const title = state.bookPrefs.title || `${state.profile.firstName || 'Your'}${(state.profile.firstName || '').endsWith('s') ? "'" : "'s"} Personalized Lifestyle Book`;
  const subtitle = state.bookPrefs.subtitle || subtitleFor(state);

  return {
    title,
    subtitle,
    forName: state.profile.firstName || '',
    style: state.bookPrefs.style,
    tone: ctx.tone,
    generatedAt: new Date().toISOString(),
    depth: depth.key,
    targetPages: depth.targetPages,
    chapters,
    customChapters: custom,
    locked: [...locked],
    edits: ctx.edits,
    variants: ctx.variants,
    stats: {
      rulings: rules.counts,
      mealPlanDays: plan.days.length,
      recipeCount: plan.recipeIdsUsed.length,
      groceryItems: grocery.itemCount,
      conflicts: conflicts.length,
      safetyFlags: safetyFlags.length,
      plateCount: plan.plateCount,
      avgCalories: plan.avgCalories,
      avgProtein: plan.avgProtein,
    },
    data: { plan, grocery, conflicts, safetyFlags, reconciliations: rules.reconciliations },
  };
}

function subtitleFor(state) {
  const names = (state.frameworks.selected || []).map((id) => (getProtocol(id) || {}).short).filter(Boolean);
  const top = (state.goals.top3 || [])[0];
  if (names.length && top) return `${names.join(' + ')} · built around ${top.toLowerCase()}`;
  if (names.length) return names.join(' + ');
  return 'A personalized lifestyle handbook';
}

export function bookPlainText(book) {
  const out = [book.title, book.subtitle];
  for (const c of book.chapters) {
    out.push(c.title);
    for (const b of c.blocks) {
      if (b.type === 'p' || b.type === 'h2' || b.type === 'h3') out.push(b.text);
      else if (b.type === 'ul' || b.type === 'ol') out.push(b.items.join(' '));
      else if (b.type === 'callout') out.push(`${b.title} ${b.text}`);
      else if (b.type === 'table') out.push(b.rows.map((r) => r.join(' ')).join(' '));
      else if (b.type === 'kv') out.push(b.pairs.map(([k, v]) => `${k} ${v}`).join(' '));
    }
  }
  return out.join('\n');
}
