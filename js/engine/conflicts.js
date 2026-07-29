// LifePrint — framework conflict detection. Real rules, evaluated against the user's selections.
import { getProtocol, eliminatedGroups } from './protocols.js';
import { FOODS, foodByName } from './foods.js';
import { protocolRuling } from './protocols.js';

const has = (ids, id) => (ids || []).includes(id);

/** Count foods that survive every selected framework — a proxy for how narrow the diet becomes. */
export function survivingFoodCount(protocolIds) {
  const protocols = (protocolIds || []).map(getProtocol).filter(Boolean).filter((p) => !p.userDefined);
  let n = 0;
  const kept = [];
  for (const f of FOODS) {
    if (protocols.every((p) => protocolRuling(p, f) !== 'no')) {
      n += 1;
      kept.push(f);
    }
  }
  return { count: n, kept };
}

/**
 * @returns {Array<{id, severity: 'high'|'medium'|'low', title, explanation, options?}>}
 */
export function detectConflicts(state) {
  const ids = state.frameworks.selected || [];
  const out = [];
  const food = state.food || {};
  const restrictionNames = (food.restrictions || []).map((r) => (r.food || '').toLowerCase());
  const likesAnimalProtein = (food.favProteins || []).some((n) => {
    const f = foodByName(n);
    return f && f.markers.animal;
  });
  const likesFruit = [...(food.favFruit || []), ...(food.craved || [])].some((n) => {
    const f = foodByName(n);
    return f && f.tags.includes('fruit');
  });
  const likesLegumes = [...(food.favProteins || []), ...(food.commonlyEaten || [])].some((n) => {
    const f = foodByName(n);
    return f && f.markers.legume;
  });
  const nutFree =
    (food.restrictions || []).some((r) => {
      const f = foodByName(r.food);
      return f && (f.markers.nut || f.markers.peanut) && ['Medical allergy', 'Diagnosed intolerance'].includes(r.category);
    });

  if (has(ids, 'vegan') && has(ids, 'aip')) {
    out.push({
      id: 'vegan-aip',
      severity: 'high',
      title: 'Vegan + Autoimmune Protocol',
      explanation:
        'AIP removes grains, legumes, nuts, seeds, eggs, and dairy. Vegan removes all animal protein. Stacked together, almost every protein source is gone — what remains is vegetables, fruit, coconut, and roots. This combination is very hard to run without a protein and B12 shortfall.',
      recommendation: 'Run one at a time, or work with a dietitian who can build a supplemented plan.',
    });
  }
  if (has(ids, 'vegan') && has(ids, 'keto')) {
    out.push({
      id: 'vegan-keto',
      severity: 'high',
      title: 'Vegan + Ketogenic',
      explanation:
        'Most vegan protein comes packaged with carbohydrate (legumes, grains). Vegan keto narrows you to tofu, tempeh, seeds, nuts, and low-carb vegetables — workable, but only with careful planning and a soy or seed tolerance.',
      recommendation: 'Consider lower-carbohydrate vegan instead of strict ketosis.',
    });
  }
  if ((has(ids, 'vegan') || has(ids, 'vegetarian')) && likesAnimalProtein) {
    out.push({
      id: 'vegan-animal-preference',
      severity: 'medium',
      title: 'Plant-based framework + animal-protein preferences',
      explanation:
        'You selected a plant-based framework, but your favorite proteins are animal foods. LifePrint will honor the framework and exclude them, which usually leads to a plan you do not want to follow.',
      recommendation: 'Either switch to pescatarian/flexitarian, or replace those favorites with plant proteins you actually enjoy.',
    });
  }
  if (has(ids, 'keto') && likesFruit) {
    out.push({
      id: 'keto-fruit',
      severity: 'medium',
      title: 'Ketogenic + high fruit preference',
      explanation:
        'The fruit you listed as a favorite or craving does not fit a ketogenic carbohydrate ceiling. Something has to give: the fruit, or the ketosis target.',
      recommendation: 'Berries and citrus zest fit; tropical fruit and bananas generally do not.',
    });
  }
  if (has(ids, 'low-fodmap') && has(ids, 'vegan') && likesLegumes) {
    out.push({
      id: 'fodmap-legume-vegan',
      severity: 'high',
      title: 'Low-FODMAP + vegan + legume-heavy eating',
      explanation:
        'Low-FODMAP removes most legumes, which are the backbone of vegan protein. Canned, rinsed lentils and firm tofu are the main survivors, plus hemp hearts and small portions of tempeh.',
      recommendation: 'Plan protein deliberately around tofu, tempeh, canned rinsed lentils, and hemp — and keep the low-FODMAP phase short.',
    });
  }
  if (has(ids, 'aip') && has(ids, 'low-fodmap')) {
    out.push({
      id: 'aip-fodmap',
      severity: 'high',
      title: 'AIP + Low-FODMAP stacked',
      explanation:
        'Both are short-term elimination protocols with their own reintroduction phases. Running them at once makes it impossible to tell which trigger caused which change, and the combined food list is very small.',
      recommendation: 'Sequence them: run one protocol, complete its reintroductions, then decide whether the second is still needed.',
    });
  }
  if (nutFree && has(ids, 'vegan')) {
    out.push({
      id: 'nutfree-vegan',
      severity: 'medium',
      title: 'Nut-free + vegan protein scarcity',
      explanation:
        'A nut allergy or intolerance removes a major vegan protein and fat source. Your plan will lean on soy, legumes, seeds, and hemp instead.',
      recommendation: 'Check whether seeds are tolerated; if not, get professional support before continuing.',
    });
  }
  if (has(ids, 'keto') && has(ids, 'dash')) {
    out.push({
      id: 'keto-dash',
      severity: 'low',
      title: 'Ketogenic + DASH',
      explanation:
        'DASH is built on fruit, whole grains, legumes, and low-fat dairy; keto excludes most of those. The two frameworks pull in opposite directions on carbohydrate.',
      recommendation: 'Pick the one that matches your primary goal and borrow the sodium habits from DASH.',
    });
  }
  if (has(ids, 'intermittent-fasting') && (state.health || {}).flags && state.health.flags.pregnancy) {
    out.push({
      id: 'if-pregnancy',
      severity: 'high',
      title: 'Intermittent fasting during pregnancy',
      explanation:
        'Compressed eating windows are not appropriate during pregnancy — nutrient and energy needs are higher and more consistent.',
      recommendation: 'Remove the fasting framework and discuss meal timing with your prenatal provider.',
    });
  }

  const groups = eliminatedGroups(ids);
  if (groups.length > 5) {
    out.push({
      id: 'many-groups',
      severity: 'high',
      title: `${groups.length} major food groups eliminated`,
      explanation: `Your selections remove ${groups.join(', ')}. Past about five groups, nutrient gaps and social friction rise sharply and adherence usually drops.`,
      recommendation: 'Trim to the two or three exclusions with the strongest evidence for you, and revisit the rest later.',
    });
  }

  const { count } = survivingFoodCount(ids);
  if (count < 60 && ids.length > 1) {
    out.push({
      id: 'narrow-library',
      severity: count < 40 ? 'high' : 'medium',
      title: `Only ${count} of ${FOODS.length} foods survive your framework stack`,
      explanation:
        'A very small food library makes the plan repetitive and increases the odds of a nutrient gap. It also makes it harder to identify a real trigger later.',
      recommendation: 'Consider running the protocols in sequence instead of simultaneously.',
    });
  }

  const seen = new Set();
  return out.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

export const CONFLICT_OPTIONS = [
  { id: 'adjust', label: 'Adjust my selections', description: 'Go back and change frameworks now.' },
  { id: 'keep', label: 'Keep both and customize carefully', description: 'Continue with a narrower plan and extra tracking prompts.' },
  { id: 'supervision', label: 'Add a professional supervision note to my book', description: 'Continue and print a clinician-review page listing each conflict.' },
];
