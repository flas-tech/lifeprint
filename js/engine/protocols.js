// LifePrint — framework / protocol rulesets (21 frameworks).
// Each ruleset is real inclusion/exclusion logic evaluated against the food markers in foods.js.
// `excludeMarkers` are hard exclusions for the framework; `limitMarkers` downgrade a food to
// "eat in moderation"; `emphasize` drives meal-plan and grocery ordering.

export const PROTOCOLS = [
  {
    id: 'omnivore-balanced',
    name: 'Balanced omnivore',
    short: 'Balanced',
    blurb: 'Whole-food omnivore eating with no category eliminated.',
    excludeMarkers: ['ultraProcessed'],
    limitMarkers: ['addedSugar', 'alcohol'],
    emphasize: ['vegetable', 'high-protein', 'whole-grain', 'fruit'],
    proteinFloorG: 90,
    guidance:
      'Build every plate from a protein anchor, two colors of produce, a starch sized to your activity, and a fat for satiety.',
    mealNotes: 'No food group is off the table; the structure comes from portioning and consistency.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    short: 'Mediterranean',
    blurb: 'Olive oil, seafood, legumes, vegetables, whole grains; red meat occasional.',
    excludeMarkers: ['ultraProcessed'],
    limitMarkers: ['addedSugar', 'refinedOil'],
    limitTags: ['red-meat'],
    emphasize: ['fish', 'omega3', 'vegetable', 'legume', 'whole-grain', 'herb'],
    proteinFloorG: 85,
    guidance:
      'Seafood two to three times a week, legumes most days, olive oil as the default fat, and red meat as a weekend item rather than a staple.',
    mealNotes: 'Flavor comes from herbs, citrus, and good oil — not from heavy sauces.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'paleo',
    name: 'Paleo',
    short: 'Paleo',
    blurb: 'No grains, legumes, dairy, or refined products.',
    excludeMarkers: ['grain', 'legume', 'dairy', 'soy', 'ultraProcessed', 'refinedOil'],
    limitTags: ['sweetener'],
    emphasize: ['vegetable', 'high-protein', 'fruit', 'nut', 'seed'],
    proteinFloorG: 110,
    guidance:
      'Anchor meals in animal protein and vegetables; use starchy roots and fruit for carbohydrate rather than grains.',
    mealNotes: 'Cassava, plantain, and winter squash replace bread and pasta.',
    supervision: false,
    eliminatesGroups: ['grains', 'legumes', 'dairy'],
  },
  {
    id: 'aip',
    name: 'Autoimmune Protocol (AIP)',
    short: 'AIP',
    blurb: 'Elimination phase of AIP: no grains, legumes, dairy, eggs, nuts, seeds, nightshades, alcohol.',
    excludeMarkers: [
      'grain', 'legume', 'dairy', 'egg', 'nut', 'peanut', 'soy', 'nightshade', 'alcohol',
      'caffeine', 'ultraProcessed', 'addedSugar', 'seedSpice',
    ],
    limitTags: ['sweetener', 'natural-sugar', 'treat'],
    emphasize: ['vegetable', 'organ', 'broth', 'omega3', 'herb', 'fermented'],
    proteinFloorG: 100,
    guidance:
      'AIP is a short-term elimination phase (typically 30-90 days) followed by structured reintroduction — it is not designed to be permanent.',
    mealNotes: 'Bone broth, slow-cooked meats, and roasted non-nightshade vegetables carry most meals.',
    supervision: true,
    eliminatesGroups: ['grains', 'legumes', 'dairy', 'eggs', 'nuts-seeds', 'nightshades'],
  },
  {
    id: 'keto',
    name: 'Ketogenic',
    short: 'Keto',
    blurb: 'Very low carbohydrate, high fat, moderate protein.',
    excludeMarkers: ['grain', 'addedSugar', 'alcohol'],
    excludeTags: ['starchy', 'natural-sugar'],
    limitTags: ['legume', 'berry', 'fruit'],
    emphasize: ['keto-friendly', 'fat', 'high-protein', 'leafy'],
    proteinFloorG: 110,
    guidance:
      'Keep total carbohydrate low enough to stay in ketosis, keep protein adequate, and let fat fill the rest of the plate.',
    mealNotes: 'Fruit is limited to berries, avocado, olives, and citrus zest/juice in small amounts.',
    supervision: false,
    eliminatesGroups: ['grains', 'most fruit', 'starchy vegetables'],
  },
  {
    id: 'low-carb',
    name: 'Lower carbohydrate',
    short: 'Low-carb',
    blurb: 'Reduced but not eliminated carbohydrate; no ketosis target.',
    excludeMarkers: ['addedSugar', 'ultraProcessed'],
    limitTags: ['starchy', 'grain', 'legume', 'fruit', 'natural-sugar'],
    emphasize: ['high-protein', 'vegetable', 'fat'],
    proteinFloorG: 110,
    guidance: 'Carbohydrate is concentrated around training and the largest meal of your day.',
    mealNotes: 'One measured starch per day rather than one at every meal.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'vegan',
    name: 'Vegan',
    short: 'Vegan',
    blurb: 'No animal products at all.',
    excludeMarkers: ['animal', 'dairy', 'egg'],
    excludeFoodIds: ['honey'],
    emphasize: ['plant-protein', 'legume', 'vegetable', 'whole-grain', 'nut', 'seed'],
    proteinFloorG: 80,
    guidance:
      'Protein comes from legumes, soy foods, seeds, and whole grains — aim for a protein source at every meal, not just at dinner.',
    mealNotes: 'Pair legumes with grains across the day; watch B12, iron, and omega-3 intake.',
    supervision: false,
    eliminatesGroups: ['meat', 'seafood', 'dairy', 'eggs'],
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian',
    short: 'Vegetarian',
    blurb: 'No meat or seafood; dairy and eggs allowed.',
    excludeMarkers: ['animal'],
    emphasize: ['plant-protein', 'legume', 'egg', 'dairy', 'vegetable'],
    proteinFloorG: 85,
    guidance: 'Eggs, dairy, legumes, and soy foods carry the protein load.',
    mealNotes: 'Keep an eye on iron and zinc; pair plant iron with vitamin C.',
    supervision: false,
    eliminatesGroups: ['meat', 'seafood'],
  },
  {
    id: 'pescatarian',
    name: 'Pescatarian',
    short: 'Pescatarian',
    blurb: 'No meat or poultry; seafood, eggs, and dairy allowed.',
    excludeTags: ['meat', 'poultry', 'red-meat', 'organ'],
    emphasize: ['fish', 'shellfish', 'omega3', 'vegetable', 'legume'],
    proteinFloorG: 95,
    guidance: 'Rotate oily and lean fish; vary sources to spread mercury exposure.',
    mealNotes: 'Canned fish is a legitimate weekday protein.',
    supervision: false,
    eliminatesGroups: ['meat', 'poultry'],
  },
  {
    id: 'low-fodmap',
    name: 'Low-FODMAP',
    short: 'Low-FODMAP',
    blurb: 'Short-term reduction of fermentable carbohydrates for GI symptom relief.',
    excludeFodmap: ['high'],
    limitFodmap: ['moderate'],
    emphasize: ['low-fodmap', 'high-protein', 'vegetable'],
    proteinFloorG: 95,
    guidance:
      'The elimination phase is 2-6 weeks. Reintroduction is the point — staying low-FODMAP indefinitely narrows the diet and the microbiome unnecessarily.',
    mealNotes: 'Garlic and onion are replaced with garlic-infused oil, scallion greens, and leek greens.',
    supervision: true,
    eliminatesGroups: ['high-FODMAP produce', 'most legumes', 'wheat'],
  },
  {
    id: 'gluten-free',
    name: 'Gluten-free',
    short: 'Gluten-free',
    blurb: 'No wheat, barley, rye, or gluten-containing derivatives.',
    excludeMarkers: ['gluten'],
    limitMarkers: ['glutenCrossContact'],
    emphasize: ['gluten-free', 'vegetable', 'high-protein'],
    proteinFloorG: 95,
    guidance: 'Certified gluten-free oats only; check sauces, dressings, and broths for wheat.',
    mealNotes: 'Rice, quinoa, buckwheat, millet, and cassava cover the starch slot.',
    supervision: false,
    eliminatesGroups: ['gluten grains'],
  },
  {
    id: 'dairy-free',
    name: 'Dairy-free',
    short: 'Dairy-free',
    blurb: 'No milk, cheese, yogurt, butter, cream, or whey.',
    excludeMarkers: ['dairy'],
    emphasize: ['dairy-free', 'vegetable', 'high-protein'],
    proteinFloorG: 95,
    guidance: 'Watch for whey and casein in protein powders, breads, and processed snacks.',
    mealNotes: 'Coconut, olive oil, and tahini replace butter and cream for richness.',
    supervision: false,
    eliminatesGroups: ['dairy'],
  },
  {
    id: 'whole30',
    name: 'Whole30-style reset',
    short: 'Whole30',
    blurb: '30-day reset: no grains, legumes, dairy, alcohol, or added sweeteners.',
    excludeMarkers: ['grain', 'legume', 'dairy', 'soy', 'alcohol', 'ultraProcessed'],
    excludeTags: ['sweetener', 'treat'],
    emphasize: ['vegetable', 'high-protein', 'fat', 'fruit'],
    proteinFloorG: 110,
    guidance: 'This is a time-boxed reset, not a long-term diet. Plan the reintroduction before you start.',
    mealNotes: 'Three composed meals, minimal snacking, no recreated desserts.',
    supervision: false,
    eliminatesGroups: ['grains', 'legumes', 'dairy', 'added sugar'],
  },
  {
    id: 'anti-inflammatory',
    name: 'Anti-inflammatory',
    short: 'Anti-inflammatory',
    blurb: 'Emphasizes omega-3s, polyphenols, and fiber; minimizes ultra-processed food and alcohol.',
    excludeMarkers: ['ultraProcessed', 'alcohol'],
    limitMarkers: ['addedSugar', 'refinedOil'],
    limitTags: ['red-meat', 'processed'],
    emphasize: ['omega3', 'berry', 'leafy', 'herb', 'spice', 'fish'],
    proteinFloorG: 95,
    guidance: 'Color, fiber, and fat quality do most of the work here. Consistency beats intensity.',
    mealNotes: 'Turmeric, ginger, berries, olive oil, and oily fish appear multiple times per week.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'high-protein',
    name: 'Higher protein',
    short: 'High-protein',
    blurb: 'Protein-forward eating for body composition, satiety, and recovery.',
    excludeMarkers: ['ultraProcessed'],
    emphasize: ['high-protein', 'vegetable', 'plant-protein'],
    proteinFloorG: 130,
    guidance: 'Aim for a clear protein anchor of roughly 30-45 g at each main meal.',
    mealNotes: 'Batch-cook one to two protein sources at the start of each week.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'intermittent-fasting',
    name: 'Intermittent fasting',
    short: 'IF',
    blurb: 'Timing framework: meals compressed into an eating window.',
    excludeMarkers: [],
    limitTags: ['added-sugar'],
    emphasize: ['high-protein', 'vegetable', 'fat'],
    proteinFloorG: 110,
    timing: { window: '8 hours', firstMeal: 'late morning', lastMeal: 'early evening' },
    guidance:
      'Because there are fewer meals, each one has to carry more protein and produce. Fasting is not a license to under-eat.',
    mealNotes: 'Water, black coffee, and plain tea during the fasting window.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'dash',
    name: 'DASH / heart-supportive',
    short: 'DASH',
    blurb: 'Lower sodium, higher potassium, produce- and whole-grain-forward.',
    excludeMarkers: ['ultraProcessed'],
    limitMarkers: ['highSodium', 'addedSugar'],
    limitTags: ['red-meat', 'processed'],
    emphasize: ['vegetable', 'fruit', 'whole-grain', 'legume', 'fish'],
    proteinFloorG: 85,
    guidance: 'Salt is added at the table, not in the pot, so you can feel the amount you use.',
    mealNotes: 'Rinse canned goods; herbs and acid replace salt for brightness.',
    supervision: false,
    eliminatesGroups: [],
  },
  {
    id: 'diabetes-friendly',
    name: 'Blood-sugar supportive',
    short: 'Blood sugar',
    blurb: 'Lower glycemic load, paired carbohydrate, consistent meal timing.',
    excludeMarkers: ['addedSugar', 'ultraProcessed'],
    limitTags: ['starchy', 'grain', 'natural-sugar', 'dried'],
    emphasize: ['high-protein', 'vegetable', 'fat', 'berry'],
    proteinFloorG: 110,
    guidance:
      'Carbohydrate is always paired with protein, fat, or fiber, and portions stay consistent from day to day.',
    mealNotes: 'A short walk after the largest meal is part of the plan, not an extra.',
    supervision: true,
    eliminatesGroups: ['added sugar'],
  },
  {
    id: 'elimination-diet',
    name: 'Elimination diet',
    short: 'Elimination',
    blurb: 'Removes the most common reactive foods for a defined trial period.',
    excludeMarkers: ['dairy', 'gluten', 'egg', 'soy', 'nut', 'peanut', 'shellfish', 'corn', 'addedSugar', 'ultraProcessed', 'alcohol'],
    limitMarkers: ['nightshade', 'caffeine'],
    emphasize: ['vegetable', 'high-protein', 'fruit'],
    proteinFloorG: 100,
    guidance:
      'An elimination trial is only useful if it ends in a structured reintroduction. Put the end date on the calendar now.',
    mealNotes: 'Keep a symptom log from day one — the data is the deliverable.',
    supervision: true,
    eliminatesGroups: ['dairy', 'gluten', 'eggs', 'soy', 'nuts', 'shellfish', 'corn'],
  },
  {
    id: 'clinician-custom',
    name: 'Clinician-provided custom protocol',
    short: 'Clinician protocol',
    blurb: 'Rules supplied by your clinician; LifePrint treats these as the highest authority.',
    excludeMarkers: [],
    userDefined: true,
    emphasize: [],
    proteinFloorG: 95,
    guidance:
      'Anything your clinician specified overrides LifePrint suggestions. Where the two disagree, the book will say so explicitly rather than quietly resolving it.',
    mealNotes: 'Enter the clinician instructions as restrictions so the engine can honor them.',
    supervision: true,
    eliminatesGroups: [],
  },
  {
    id: 'custom-framework',
    name: 'My own custom framework',
    short: 'Custom',
    blurb: 'Free-text framework you define yourself.',
    excludeMarkers: [],
    userDefined: true,
    emphasize: [],
    proteinFloorG: 95,
    guidance: 'LifePrint will apply your explicit restrictions and otherwise use balanced whole-food defaults.',
    mealNotes: 'Add specific foods to avoid in the restrictions step so they are honored everywhere.',
    supervision: false,
    eliminatesGroups: [],
  },
];

const byId = new Map(PROTOCOLS.map((p) => [p.id, p]));
export const getProtocol = (id) => byId.get(id) || null;
export const PROTOCOL_COUNT = PROTOCOLS.length;

/** Deterministic per-food ruling for a single framework: 'yes' | 'limit' | 'no'. */
export function protocolRuling(protocol, food) {
  if (!protocol || !food) return 'yes';
  const m = food.markers || {};
  const tags = food.tags || [];
  if ((protocol.excludeFoodIds || []).includes(food.id)) return 'no';
  for (const marker of protocol.excludeMarkers || []) if (m[marker]) return 'no';
  for (const t of protocol.excludeTags || []) if (tags.includes(t)) return 'no';
  if ((protocol.excludeFodmap || []).includes(food.fodmap)) return 'no';
  for (const marker of protocol.limitMarkers || []) if (m[marker]) return 'limit';
  for (const t of protocol.limitTags || []) if (tags.includes(t)) return 'limit';
  if ((protocol.limitFodmap || []).includes(food.fodmap)) return 'limit';
  // fall back to the precomputed flag in the seed data as a cross-check
  const flag = (food.frameworks || {})[protocol.id];
  return flag || 'yes';
}

/** Aggregate the strictest ruling across the selected frameworks. */
export function combinedProtocolRuling(protocolIds, food) {
  let worst = 'yes';
  const sources = [];
  for (const id of protocolIds || []) {
    const p = byId.get(id);
    if (!p || p.userDefined) continue;
    const r = protocolRuling(p, food);
    if (r === 'no') {
      worst = 'no';
      sources.push(p);
    } else if (r === 'limit') {
      if (worst !== 'no') worst = 'limit';
      sources.push(p);
    }
  }
  return { ruling: worst, sources };
}

export function eliminatedGroups(protocolIds) {
  const set = new Set();
  for (const id of protocolIds || []) {
    const p = byId.get(id);
    if (!p) continue;
    for (const g of p.eliminatesGroups || []) set.add(g);
  }
  return [...set];
}
