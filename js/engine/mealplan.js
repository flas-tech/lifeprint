// LifePrint — meal plan, grocery, pantry and batch-prep generation.
// Deterministic: the same profile always produces the same plan (seeded rotation, no Math.random).
import { RECIPES, getRecipe, estimateNutrition, checkRecipeCompliance } from './recipes.js';
import { FOODS, getFood, foodByName, AISLES } from './foods.js';
import { allowedFoods } from './rules.js';

export function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRotation(seed) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'second breakfast', 'late meal'];

export function slotsForMealsPerDay(n) {
  const map = {
    1: ['dinner'],
    2: ['lunch', 'dinner'],
    3: ['breakfast', 'lunch', 'dinner'],
    4: ['breakfast', 'lunch', 'dinner', 'snack'],
    5: ['breakfast', 'snack', 'lunch', 'snack', 'dinner'],
    6: ['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'snack'],
  };
  return map[Math.min(6, Math.max(1, Number(n) || 3))];
}

function compliantRecipes(rules, state) {
  const opts = {
    equipment: state.profile.equipment,
    budget: state.profile.budget,
    maxMinutes: Number(state.profile.timePerMeal) || 30,
  };
  const dislikes = new Set(
    (state.food.dislikes || []).map((n) => (foodByName(n) ? foodByName(n).id : null)).filter(Boolean)
  );
  const result = [];
  for (const r of RECIPES) {
    const check = checkRecipeCompliance(r, (id) => rules.rulings[id], opts);
    const hasDislike = r.ingredients.some((i) => dislikes.has(i.foodId));
    if (check.compliant && !hasDislike) result.push({ recipe: r, check });
  }
  return result;
}

/** Compose a deterministic "simple plate" when no seed recipe fits the rule set. */
function buildPlate(rules, state, slot, rot) {
  const pick = (pool, n) => {
    const out = [];
    const copy = pool.slice(0, Math.max(n * 4, 6));
    for (let i = 0; i < n && copy.length; i += 1) {
      const idx = Math.floor(rot() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };
  const proteins = allowedFoods(rules, state, (f) => f.protein >= 6 && ['meat', 'seafood', 'eggs-dairy', 'legumes', 'nuts-seeds', 'convenience'].includes(f.category));
  const veg = allowedFoods(rules, state, (f) => f.category === 'produce' && f.tags.includes('vegetable'));
  const starch = allowedFoods(rules, state, (f) => f.tags.includes('starchy') || f.category === 'grains' || f.tags.includes('fruit'));
  const fat = allowedFoods(rules, state, (f) => f.category === 'oils-fats' || f.tags.includes('fat'));
  const herb = allowedFoods(rules, state, (f) => f.category === 'herbs-spices');

  const parts = [
    ...pick(proteins, 1),
    ...pick(veg, slot === 'snack' ? 1 : 2),
    ...(slot === 'snack' ? [] : pick(starch, 1)),
    ...pick(fat, 1),
    ...pick(herb, 1),
  ].filter(Boolean);

  const uniq = [];
  const seen = new Set();
  for (const f of parts) if (!seen.has(f.id)) (seen.add(f.id), uniq.push(f));

  const calories = Math.round(uniq.reduce((a, f) => a + f.calories, 0) / 5) * 5;
  const protein = Math.round(uniq.reduce((a, f) => a + f.protein, 0));
  const label = uniq.length
    ? `${uniq[0].name} plate with ${uniq.slice(1, 3).map((f) => f.name.toLowerCase()).join(' and ')}`
    : 'Simple compliant plate';
  return {
    slot,
    name: label,
    type: 'plate',
    components: uniq.map((f) => ({ foodId: f.id, name: f.name, serving: f.serving })),
    calories,
    protein,
    prepMin: slot === 'snack' ? 5 : 20,
    generated: 'composed-plate',
    note: 'Composed from your allowed food list because no stored recipe fits every rule in your plan.',
  };
}

export function generateMealPlan(rules, state) {
  const days = Number(state.bookPrefs.mealPlanDays) || 7;
  const slots = slotsForMealsPerDay(state.food.mealsPerDay);
  const household = Math.max(1, Number(state.profile.householdSize) || 1);
  const pool = compliantRecipes(rules, state);
  const rot = makeRotation(seedFrom(`${state.profile.firstName}|${(state.frameworks.selected || []).join(',')}|${days}|${state.food.mealsPerDay}`));

  const bySlot = {};
  for (const slot of SLOT_ORDER) {
    bySlot[slot] = pool.filter((p) => p.recipe.mealTypes.includes(slot === 'second breakfast' ? 'breakfast' : slot === 'late meal' ? 'dinner' : slot));
  }

  const usage = new Map();
  const plan = [];
  const cursor = {};

  for (let d = 0; d < days; d += 1) {
    const meals = [];
    for (let si = 0; si < slots.length; si += 1) {
      const slot = slots[si];
      const candidates = bySlot[slot] && bySlot[slot].length ? bySlot[slot] : pool;
      let meal = null;
      if (candidates.length) {
        cursor[slot] = cursor[slot] === undefined ? Math.floor(rot() * candidates.length) : cursor[slot] + 1;
        const chosen = candidates[cursor[slot] % candidates.length];
        const r = chosen.recipe;
        const nutrition = estimateNutrition(r);
        const scaled = Math.max(r.servings, household);
        usage.set(r.id, (usage.get(r.id) || 0) + 1);
        meal = {
          slot,
          name: r.name,
          type: 'recipe',
          recipeId: r.id,
          servings: scaled,
          calories: nutrition.calories,
          protein: nutrition.protein,
          prepMin: r.prepMin + r.cookMin,
          caution: chosen.check.caution.map((c) => c.food.name),
          leftovers: r.servings > household || r.tags.includes('batch-prep'),
        };
      } else {
        meal = buildPlate(rules, state, slot, rot);
      }
      // avoid the same recipe twice in one day
      if (meals.some((m) => m.recipeId && m.recipeId === meal.recipeId)) {
        meal = buildPlate(rules, state, slot, rot);
      }
      meals.push(meal);
    }
    const totals = meals.reduce(
      (a, m) => ({ calories: a.calories + (m.calories || 0), protein: a.protein + (m.protein || 0), prepMin: a.prepMin + (m.prepMin || 0) }),
      { calories: 0, protein: 0, prepMin: 0 }
    );
    plan.push({
      day: d + 1,
      label: `Day ${d + 1}`,
      meals,
      totals,
      leftoverStrategy: meals.some((m) => m.leftovers)
        ? 'Cook once, eat twice: the flagged meal makes tomorrow\u2019s lunch.'
        : 'Nothing carries over today — keep a pantry fallback ready.',
      estimated: true,
    });
  }

  return {
    days: plan,
    slots,
    household,
    recipeIdsUsed: [...usage.keys()],
    plateCount: plan.reduce((a, d) => a + d.meals.filter((m) => m.type === 'plate').length, 0),
    poolSize: pool.length,
    avgCalories: Math.round(plan.reduce((a, d) => a + d.totals.calories, 0) / Math.max(1, plan.length)),
    avgProtein: Math.round(plan.reduce((a, d) => a + d.totals.protein, 0) / Math.max(1, plan.length)),
    estimated: true,
  };
}

export function buildGroceryList(plan, rules, state) {
  const counts = new Map();
  const add = (foodId, qty, unit) => {
    const f = getFood(foodId);
    if (!f) return;
    const r = rules.rulings[f.id];
    if (r && r.status === 'Avoid') return; // never appears on a list
    const key = f.id;
    const prev = counts.get(key) || { food: f, entries: [], times: 0 };
    prev.times += 1;
    if (qty) prev.entries.push(`${qty} ${unit || ''}`.trim());
    counts.set(key, prev);
  };
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.type === 'recipe') {
        const r = getRecipe(meal.recipeId);
        if (!r) continue;
        for (const ing of r.ingredients) add(ing.foodId, ing.qty, ing.unit);
      } else {
        for (const c of meal.components) add(c.foodId, 1, c.serving);
      }
    }
  }
  const byAisle = {};
  for (const aisle of AISLES) byAisle[aisle] = [];
  for (const entry of counts.values()) {
    const aisle = entry.food.aisle || 'Bulk & Other';
    (byAisle[aisle] = byAisle[aisle] || []).push({
      food: entry.food.name,
      foodId: entry.food.id,
      times: entry.times,
      quantityHint: summarizeQuantities(entry.entries, entry.times),
      note: entry.food.prepNotes,
    });
  }
  for (const aisle of Object.keys(byAisle)) {
    byAisle[aisle].sort((a, b) => b.times - a.times || a.food.localeCompare(b.food));
    if (!byAisle[aisle].length) delete byAisle[aisle];
  }
  const stores = (state.profile.stores || []).map((store) => ({
    store,
    notes: storeNotes(store, byAisle),
  }));
  return { byAisle, stores, itemCount: counts.size, disclaimer: 'Availability changes constantly — this is a shopping guide, not a live inventory. Call ahead for specialty items.' };
}

function summarizeQuantities(entries, times) {
  if (!entries.length) return `${times} use${times === 1 ? '' : 's'}`;
  const units = new Map();
  for (const e of entries) {
    const m = e.match(/^([\d.]+)\s*(.*)$/);
    if (!m) continue;
    const [, num, unit] = m;
    units.set(unit, (units.get(unit) || 0) + parseFloat(num));
  }
  return [...units.entries()].map(([unit, total]) => `${Math.round(total * 10) / 10} ${unit}`.trim()).join(' + ');
}

const STORE_HINTS = {
  Publix: 'Strong produce and store-brand basics; the deli will slice fresh meat without additives if you ask.',
  'Whole Foods': 'Best bet for specialty flours, coconut products, and clean-label condiments. Prices drop on 365-brand staples.',
  "Trader Joe's": 'Great frozen produce and pre-cut vegetables; check labels — many sauces contain garlic and onion.',
  Costco: 'Buy protein and frozen produce in bulk and portion it at home. Best cost-per-serving for the batch-prep chapter.',
  Walmart: 'Reliable for canned fish, frozen vegetables, and rice at the lowest price point.',
  Target: 'Good Good & Gather olive oil and frozen produce; limited specialty items.',
  Sprouts: 'Bulk bins for seeds and grains, and a strong selection of dairy-free products.',
  Kroger: 'Simple Truth line covers most organic staples; the bakery is a cross-contact risk for gluten.',
  Aldi: 'Cheapest produce and canned goods; selection rotates weekly so keep a flexible list.',
  Other: 'Use the aisle list as-is and ask staff where specialty items live.',
};

function storeNotes(store, byAisle) {
  const base = STORE_HINTS[store] || STORE_HINTS.Other;
  const highlights = Object.keys(byAisle).slice(0, 4);
  return `${base} Focus your trip on: ${highlights.join(', ')}.`;
}

export function buildStaples(rules, state) {
  const pantryPool = allowedFoods(rules, state, (f) => ['grains', 'oils-fats', 'condiments', 'herbs-spices', 'sweeteners', 'legumes', 'nuts-seeds'].includes(f.category));
  const fridgePool = allowedFoods(rules, state, (f) => ['produce', 'eggs-dairy', 'meat', 'seafood'].includes(f.category));
  const freezerPool = allowedFoods(rules, state, (f) => f.category === 'convenience' || f.tags.includes('freezer') || ['meat', 'seafood'].includes(f.category));
  return {
    pantry: pantryPool.slice(0, 16).map((f) => ({ name: f.name, note: f.prepNotes })),
    fridge: fridgePool.slice(0, 14).map((f) => ({ name: f.name, note: f.prepNotes })),
    freezer: freezerPool.slice(0, 10).map((f) => ({ name: f.name, note: 'Freeze in single portions and label with the date.' })),
  };
}

export function buildBatchPlan(plan, state) {
  const window = Number(state.profile.batchWindow) || 90;
  const batchRecipes = plan.recipeIdsUsed.map(getRecipe).filter((r) => r && (r.tags.includes('batch-prep') || r.servings >= 4));
  const tasks = [];
  let budget = window;
  for (const r of batchRecipes) {
    if (budget - r.prepMin <= 0) break;
    budget -= r.prepMin;
    tasks.push({ task: `Cook ${r.name}`, minutes: r.prepMin + r.cookMin, notes: r.batchNotes });
  }
  tasks.push({ task: 'Wash and dry greens; store with a paper towel', minutes: 10, notes: 'Doubles the useful life of leafy greens.' });
  tasks.push({ task: 'Portion protein into containers', minutes: 10, notes: 'Label with the day you cooked it.' });
  tasks.push({ task: 'Chop hardy vegetables for the week', minutes: 15, notes: 'Roots and squash hold 5 days cut.' });
  return {
    windowMinutes: window,
    tasks,
    totalMinutes: tasks.reduce((a, t) => a + t.minutes, 0),
    cadence: window >= 150 ? 'One long session on Sunday' : 'Two short sessions (Sunday + Wednesday)',
  };
}

export function buildRestaurantGuide(rules, state) {
  const avoid = rules.byStatus.Avoid.slice(0, 12).map((r) => r.food);
  const allergens = rules.byStatus.Avoid.filter((r) => r.sourceType === 'Medical allergy').map((r) => r.food);
  return {
    order: [
      'Grilled or roasted protein, plain, with oil and lemon on the side.',
      'Steamed or roasted vegetables, no sauce.',
      'A simple starch you recognize — rice, potato, or plantain.',
      'Salad dressed at the table with olive oil and vinegar.',
    ],
    ask: [
      'Is anything on this dish marinated, breaded, or finished with butter?',
      'Which oil is used on the flat top?',
      'Does the seasoning blend contain garlic or onion powder?',
      allergens.length ? `I have a serious allergy to ${allergens.join(', ')} — can the kitchen confirm no cross-contact?` : 'Can this be made without added sauce?',
    ],
    hidden: ['Soy in marinades and dressings', 'Wheat in soy sauce and thickened sauces', 'Dairy in "creamy" dressings and mashed vegetables', 'Onion and garlic powder in nearly every spice blend', 'Added sugar in glazes, slaws, and barbecue sauce'],
    script: `"I have a few restrictions — I avoid ${avoid.slice(0, 4).join(', ')}. Could I get the ${'grilled protein'} with plain vegetables and olive oil on the side? ${allergens.length ? `One is a serious allergy: ${allergens[0]}.` : ''} Thank you."`,
    travel: [
      'Airport: rotisserie chicken or a salad bowl plus a shelf-stable pouch of tuna.',
      'Hotel room: pre-cooked rice cup, canned fish, olive oil packets, and a bag of pre-washed greens.',
      'Gas station: hard-boiled eggs, jerky without sugar, plain nuts (if safe for you), and a banana.',
      'Long flights: pack two meals — assume nothing safe is available in the air.',
    ],
    diningOutFrequency: state.food.diningOut,
  };
}
