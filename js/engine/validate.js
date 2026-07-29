// LifePrint — pre-export validation. Runs before every export; results are surfaced to the user.
import { getRecipe } from './recipes.js';
import { getFood, foodByName } from './foods.js';
import { scanClaims } from './safety.js';
import { bookPlainText } from './book.js';
import { slotsForMealsPerDay } from './mealplan.js';

const pass = (id, label, detail = '') => ({ id, label, status: 'pass', detail });
const warn = (id, label, detail) => ({ id, label, status: 'warn', detail });
const fail = (id, label, detail) => ({ id, label, status: 'fail', detail });

export function validateBook(book, state, rules) {
  const checks = [];
  const plan = book.data.plan;
  const avoid = new Set(rules.byStatus.Avoid.map((r) => r.foodId));
  const allergenIds = new Set(rules.byStatus.Avoid.filter((r) => r.hardExclusion).map((r) => r.foodId));

  // 1 — prohibited foods in recipes / meal plan
  const offenders = [];
  const allergenOffenders = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ingredientIds = meal.type === 'recipe'
        ? ((getRecipe(meal.recipeId) || { ingredients: [] }).ingredients || []).map((i) => i.foodId)
        : (meal.components || []).map((c) => c.foodId);
      for (const fid of ingredientIds) {
        if (allergenIds.has(fid)) allergenOffenders.push(`${day.label} ${meal.slot}: ${(getFood(fid) || {}).name}`);
        else if (avoid.has(fid)) offenders.push(`${day.label} ${meal.slot}: ${(getFood(fid) || {}).name}`);
      }
    }
  }
  checks.push(allergenOffenders.length
    ? fail('allergens', 'No allergen appears in any recipe or meal', allergenOffenders.slice(0, 6).join('; '))
    : pass('allergens', 'No allergen appears in any recipe or meal', `${allergenIds.size} hard-excluded food(s) checked across ${plan.days.length} days.`));
  checks.push(offenders.length
    ? fail('prohibited', 'No prohibited food appears in the plan', offenders.slice(0, 6).join('; '))
    : pass('prohibited', 'No prohibited food appears in the plan', `${avoid.size} avoided food(s) checked.`));

  // 2 — hidden-ingredient scan across printed recipe text
  const recipeChapter = book.chapters.find((c) => c.id === 'recipes');
  let hiddenHits = [];
  if (recipeChapter) {
    const text = recipeChapter.blocks
      .filter((b) => b.type === 'table' || b.type === 'ul' || b.type === 'ol')
      .map((b) => (b.type === 'table' ? b.rows.map((r) => r.join(' ')).join(' ') : b.items.join(' ')))
      .join(' ')
      .toLowerCase();
    for (const rid of allergenIds) {
      const f = getFood(rid);
      if (!f) continue;
      const needle = f.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '');
      if (needle.length > 3 && text.includes(needle)) hiddenHits.push(f.name);
    }
  }
  checks.push(hiddenHits.length
    ? fail('hidden', 'No allergen appears as a hidden or substituted ingredient', `Mentioned in printed recipe text: ${hiddenHits.join(', ')}`)
    : pass('hidden', 'No allergen appears as a hidden or substituted ingredient'));

  // 3 — contradictory rulings across chapters
  const statusMentions = new Map();
  for (const chapter of book.chapters) {
    for (const b of chapter.blocks) {
      if (b.type !== 'table' || !b.columns.includes('Status')) continue;
      const foodIdx = b.columns.indexOf('Food');
      const statusIdx = b.columns.indexOf('Status');
      for (const row of b.rows) {
        const food = row[foodIdx];
        const status = row[statusIdx];
        if (!food || !status) continue;
        const prev = statusMentions.get(food);
        if (prev && prev.status !== status) {
          statusMentions.set(food, { ...prev, conflict: `${prev.status} in ${prev.chapter}, ${status} in ${chapter.title}` });
        } else if (!prev) statusMentions.set(food, { status, chapter: chapter.title });
      }
    }
  }
  const contradictions = [...statusMentions.entries()].filter(([, v]) => v.conflict);
  checks.push(contradictions.length
    ? fail('contradiction', 'No contradictory ruling appears in two chapters', contradictions.slice(0, 4).map(([f, v]) => `${f}: ${v.conflict}`).join('; '))
    : pass('contradiction', 'No contradictory ruling appears in two chapters', `${statusMentions.size} food statuses cross-checked.`));

  // 4 — nutrition labeled as estimates
  const text = bookPlainText(book);
  const nutritionMentioned = /kcal|protein/i.test(text);
  const estimateLabeled = /estimate/i.test(text);
  checks.push(!nutritionMentioned || estimateLabeled
    ? pass('estimates', 'Nutrition is labeled as an estimate')
    : fail('estimates', 'Nutrition is labeled as an estimate', 'Nutrition figures appear without the estimate qualifier.'));

  // 5 — every uploaded-report finding carries a citation
  const uncited = (state.findings || []).filter((f) => f.status === 'Confirmed' && !f.sourceReference);
  checks.push(uncited.length
    ? fail('citations', 'Every confirmed finding carries a citation', uncited.map((f) => f.food).join(', '))
    : pass('citations', 'Every confirmed finding carries a citation', `${(state.findings || []).filter((f) => f.status === 'Confirmed').length} confirmed finding(s).`));

  // 6 — medical claim scan
  const claims = scanClaims(text);
  checks.push(claims.length
    ? warn('claims', 'Medical claims are hedged', `Review: ${claims.slice(0, 3).map((c) => `"${c.word}"`).join(', ')}`)
    : pass('claims', 'Medical claims are hedged', 'No unhedged cure/treat/diagnose language found.'));

  // 7 — store availability never guaranteed
  const storeChapter = book.chapters.find((c) => c.id === 'stores' || c.id === 'grocery');
  const storeText = storeChapter ? JSON.stringify(storeChapter) : '';
  checks.push(/guarantee|always in stock|will have/i.test(storeText)
    ? fail('stores', 'Store availability is never guaranteed', 'Found language implying guaranteed stock.')
    : pass('stores', 'Store availability is never guaranteed'));

  // 8 — TOC links resolve
  const ids = new Set(book.chapters.map((c) => c.id));
  const missing = book.chapters.filter((c) => !c.blocks || !c.blocks.length);
  checks.push(missing.length
    ? warn('toc', 'Every chapter has content for its TOC entry', `Empty: ${missing.map((c) => c.title).join(', ')}`)
    : pass('toc', 'Every chapter has content for its TOC entry', `${ids.size} chapters.`));

  // 9 — meal plan matches meal frequency
  const expected = slotsForMealsPerDay(state.food.mealsPerDay).length;
  const mismatched = plan.days.filter((d) => d.meals.length !== expected);
  checks.push(mismatched.length
    ? fail('frequency', 'Meal plan matches your meals per day', `${mismatched.length} day(s) do not have ${expected} meals.`)
    : pass('frequency', 'Meal plan matches your meals per day', `${expected} meals/day across ${plan.days.length} days.`));

  // 10 — recipe servings match household size
  const household = Math.max(1, Number(state.profile.householdSize) || 1);
  const underserved = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.type === 'recipe' && meal.servings < household) underserved.push(`${day.label} ${meal.slot}`);
    }
  }
  checks.push(underserved.length
    ? warn('servings', 'Recipe servings cover your household', `${underserved.length} meal(s) scale below ${household} servings.`)
    : pass('servings', 'Recipe servings cover your household', `All meals scaled to at least ${household} serving(s).`));

  // 11 — budget respected
  const budget = state.profile.budget;
  const overBudget = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.type !== 'recipe') continue;
      const r = getRecipe(meal.recipeId);
      if (!r) continue;
      if (budget === 'tight' && r.budgetTier !== 'tight') overBudget.push(r.name);
      if (budget === 'moderate' && r.budgetTier === 'flexible') overBudget.push(r.name);
    }
  }
  checks.push(overBudget.length
    ? warn('budget', 'Budget tier respected', `Above your ${budget} tier: ${[...new Set(overBudget)].slice(0, 4).join(', ')}`)
    : pass('budget', 'Budget tier respected', `All meals fit a ${budget} budget.`));

  // 12 — equipment respected
  const owned = new Set(state.profile.equipment || []);
  const needsMissing = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.type !== 'recipe') continue;
      const r = getRecipe(meal.recipeId);
      if (!r) continue;
      for (const e of r.equipment) if (!owned.has(e)) needsMissing.push(`${r.name} needs ${e}`);
    }
  }
  checks.push(needsMissing.length
    ? fail('equipment', 'Equipment you own is respected', [...new Set(needsMissing)].slice(0, 4).join('; '))
    : pass('equipment', 'Equipment you own is respected'));

  // 13 — dislikes excluded
  const dislikeIds = (state.food.dislikes || []).map((n) => (foodByName(n) ? foodByName(n).id : null)).filter(Boolean);
  const dislikeHits = [];
  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ids2 = meal.type === 'recipe'
        ? ((getRecipe(meal.recipeId) || { ingredients: [] }).ingredients || []).map((i) => i.foodId)
        : (meal.components || []).map((c) => c.foodId);
      for (const fid of ids2) if (dislikeIds.includes(fid)) dislikeHits.push((getFood(fid) || {}).name);
    }
  }
  checks.push(dislikeHits.length
    ? fail('dislikes', 'Foods you dislike are excluded', [...new Set(dislikeHits)].join(', '))
    : pass('dislikes', 'Foods you dislike are excluded', `${dislikeIds.length} disliked food(s) checked.`));

  // 14 — clinician instructions not overridden
  const clinicianOverridden = rules.clinicianInstructions.filter((c) => {
    const r = rules.rulings[c.foodId];
    return !r || r.status !== 'Avoid';
  });
  checks.push(clinicianOverridden.length
    ? fail('clinician', 'Clinician instructions are not overridden', clinicianOverridden.map((c) => c.raw).join(', '))
    : pass('clinician', 'Clinician instructions are not overridden', `${rules.clinicianInstructions.length} instruction(s) parsed.`));

  // 15 — safety appendix present when flags exist
  const hasClinChapter = book.chapters.some((c) => c.id === 'clinician');
  checks.push(book.data.safetyFlags.length && !hasClinChapter
    ? fail('appendix', 'Clinician-review appendix matches your safety flags', 'Safety flags exist but the clinician chapter is turned off.')
    : pass('appendix', 'Clinician-review appendix matches your safety flags', `${book.data.safetyFlags.length} flag(s).`));

  // 16 — refusal reconciliation surfaced
  const reconcile = book.data.reconciliations || [];
  const reconcileText = /asked to keep|do not want to eliminate/i.test(text);
  checks.push(!reconcile.length || reconcileText
    ? pass('reconcile', 'Foods you refuse to eliminate are reconciled explicitly', reconcile.length ? `${reconcile.length} reconciliation note(s).` : 'None needed.')
    : warn('reconcile', 'Foods you refuse to eliminate are reconciled explicitly', 'Reconciliation notes exist but were not printed.'));

  const failed = checks.filter((c) => c.status === 'fail').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  return {
    checks,
    failed,
    warned,
    passed: checks.length - failed - warned,
    ok: failed === 0,
    ranAt: new Date().toISOString(),
  };
}
