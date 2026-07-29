// LifePrint — state schema, persistence, migration, validation.
// Everything lives in localStorage under `lifeprint.v1`. Nothing is ever sent anywhere.

import { runSafetyChecks } from './engine/safety.js';

export const STORAGE_KEY = 'lifeprint.v1';
export const SCHEMA_VERSION = 1;

export const RESTRICTION_CATEGORIES = [
  'Medical allergy',
  'Diagnosed intolerance',
  'Food sensitivity test result',
  'User-observed trigger',
  'Personal preference',
  'Protocol-based exclusion',
];

export const CATEGORY_EXPLAINERS = {
  'Medical allergy': 'An immune (IgE) reaction diagnosed by a clinician. Treated as a permanent, hard exclusion.',
  'Diagnosed intolerance': 'A clinician-confirmed digestive or enzymatic intolerance, e.g. lactose intolerance or celiac disease.',
  'Food sensitivity test result': 'A result from an IgG or similar panel. These are not allergy diagnoses and are treated as temporary and reintroducible.',
  'User-observed trigger': 'Something you have noticed yourself. Useful signal, not a diagnosis — LifePrint flags it for tracking.',
  'Personal preference': 'You would rather not eat it. Excluded from plans as a preference, never framed as medical.',
  'Protocol-based exclusion': 'Removed because a framework you chose excludes it, for the duration of that phase.',
};

export const GOALS = [
  'Fat loss', 'Muscle gain', 'Improved energy', 'Reduced bloating', 'Better digestion',
  'Better sleep', 'Reduced stress', 'Improved fitness', 'Injury recovery support',
  'Autoimmune-diet support', 'Better meal consistency', 'Reduced sugar', 'Higher protein',
  'Lower carbohydrate intake', 'Improved skin', 'Hormone-supportive lifestyle',
  'General wellness', 'Better organization', 'Custom goal',
];

export const STORES = ['Publix', 'Whole Foods', "Trader Joe's", 'Costco', 'Walmart', 'Target', 'Sprouts', 'Kroger', 'Aldi', 'Other'];
export const EQUIPMENT = ['stovetop', 'oven', 'air fryer', 'slow cooker', 'pressure cooker', 'grill', 'blender', 'food processor', 'microwave', 'rice cooker', 'sous vide'];
export const ACTIVITY_LEVELS = ['sedentary', 'lightly active', 'moderately active', 'active', 'very active'];
export const SKILL_LEVELS = ['beginner', 'comfortable', 'confident', 'advanced'];
export const BUDGETS = ['tight', 'moderate', 'flexible'];
export const CUISINES = ['Mediterranean', 'Italian', 'Mexican', 'Japanese', 'Thai', 'Indian', 'Chinese', 'Middle Eastern', 'American comfort', 'French', 'Korean', 'Caribbean', 'Ethiopian', 'Vietnamese'];
export const DOC_TYPES = ['Lab report', 'Food-sensitivity report', 'DNA report', 'Nutrition plan', 'Clinician instructions', 'Existing meal plan', 'Medication/supplement list', 'Fitness assessment', 'Recovery protocol'];
export const TONES = ['supportive', 'straightforward', 'clinical', 'coach'];
export const BOOK_STYLES = [
  { id: 'minimal', name: 'Minimal' },
  { id: 'elegant', name: 'Elegant' },
  { id: 'modern-wellness', name: 'Modern wellness' },
  { id: 'clinical', name: 'Clinical' },
  { id: 'feminine', name: 'Feminine' },
  { id: 'masculine', name: 'Masculine' },
  { id: 'athletic', name: 'Athletic' },
  { id: 'luxury', name: 'Luxury' },
  { id: 'nature', name: 'Nature inspired' },
  { id: 'colorful', name: 'Colorful' },
  { id: 'print-bw', name: 'Black-and-white printer friendly' },
];

export const CHAPTERS = [
  ['welcome', 'Welcome & how to use this book', 'Sets expectations and explains the four food statuses.', true],
  ['your-profile', 'Your profile at a glance', 'Snapshot of your details, goals, and chosen frameworks.', true],
  ['goals', 'Your goals and priorities', 'Your ranked top three with what each one asks of you.', true],
  ['framework', 'Your lifestyle framework', 'What each framework you selected includes and excludes.', true],
  ['food-guide', 'Master food guide', 'Every food in the library sorted into four statuses.', true],
  ['can-i-eat', 'Can I eat this? index', 'Alphabetical quick-reference index with reasons.', true],
  ['why', 'Why these recommendations', 'Source, confidence, and reasoning behind each ruling.', true],
  ['sensitivities', 'Your sensitivities and findings', 'Confirmed report findings with citations.', true],
  ['reintroduction', 'Reintroduction protocol', 'One-at-a-time reintroduction order and logging.', true],
  ['meal-plan', 'Your meal plan', 'Day-by-day plan honoring your meals per day and prep time.', true],
  ['recipes', 'Recipes', 'Full recipes for everything in your plan.', true],
  ['grocery', 'Grocery guide', 'Aisle-by-aisle list built from your plan.', true],
  ['stores', 'Store-specific guides', 'What to look for at each store you shop.', true],
  ['pantry', 'Pantry, fridge & freezer checklists', 'The staples that make the plan easy.', true],
  ['batch-prep', 'Batch prep & meal-prep schedule', 'A weekly cook-once rhythm.', true],
  ['restaurant', 'Restaurant & takeout guide', 'What to order, what to ask, what to skip.', true],
  ['travel', 'Travel & fallback meals', 'Airport, hotel, and no-kitchen options.', true],
  ['hydration', 'Hydration', 'A simple daily target and how to hit it.', true],
  ['beverages', 'Coffee, tea & beverages', 'Caffeine timing and lower-impact swaps.', true],
  ['alcohol', 'Alcohol considerations', 'Honest, non-judgmental guidance.', false],
  ['supplements', 'Supplement overview', 'Educational only — no dosing.', true],
  ['fitness', 'Fitness plan', 'Weekly movement structured around your schedule.', true],
  ['recovery', 'Recovery & mobility', 'Managing load, soreness, and injury history.', true],
  ['sleep', 'Sleep', 'A wind-down that fits your evening.', true],
  ['stress', 'Stress & nervous system', 'Short practices that survive a busy week.', true],
  ['routines', 'Morning, evening & weekly reset routines', 'Three routines you can actually keep.', true],
  ['schedules', 'Weekly schedules', 'Meal prep, grocery, movement, recovery on one page.', true],
  ['trackers', 'Printable trackers', 'Meals, symptoms, digestion, energy, sleep, and more.', true],
  ['journal', 'Progress journal', 'Weekly reflection pages.', true],
  ['goal-review', 'Goal review', 'A monthly checkpoint against your top three.', true],
  ['notes', 'Notes', 'Blank space, on purpose.', false],
  ['symptom-map', 'Symptom & food association map', 'What you have linked to symptoms so far.', true],
  ['clinician', 'Review with your clinician', 'Every safety flag, in plain language.', true],
  ['sources', 'Source & citation index', 'Where every finding came from.', true],
];

export const HEALTH_FIELDS = [
  ['digestiveConcerns', 'Digestive concerns', 'multi', ['Bloating', 'Constipation', 'Diarrhea', 'Reflux', 'Gas', 'Cramping', 'Nausea', 'None']],
  ['energyLevel', 'Typical energy level', 'select', ['Very low', 'Low', 'Variable', 'Good', 'High']],
  ['sleepDuration', 'Typical sleep duration', 'select', ['<5 hours', '5-6 hours', '6-7 hours', '7-8 hours', '8+ hours']],
  ['stressLevel', 'Stress level', 'select', ['Low', 'Moderate', 'High', 'Very high']],
  ['cycleConsiderations', 'Menstrual-cycle considerations', 'text', null],
  ['injuries', 'Injuries or mobility restrictions', 'text', null],
  ['exerciseFrequency', 'Exercise frequency', 'select', ['None', '1-2x/week', '3-4x/week', '5-6x/week', 'Daily']],
  ['trainingPreferences', 'Training preferences', 'multi', ['Walking', 'Running', 'Strength training', 'Yoga', 'Pilates', 'Cycling', 'Swimming', 'Team sport', 'Mobility work', 'HIIT']],
  ['diagnoses', 'Medical diagnoses (free text)', 'text', null],
  ['medications', 'Medications', 'text', null],
  ['supplements', 'Supplements', 'text', null],
  ['symptomFoods', 'Foods associated with symptoms', 'chips', null],
  ['bowelHabits', 'Typical bowel habits', 'select', ['Regular daily', 'Every other day', 'Irregular', 'Frequent urgency', 'Prefer not to say']],
  ['hydration', 'Daily water intake', 'select', ['<2 cups', '2-4 cups', '5-7 cups', '8-10 cups', '10+ cups']],
  ['workSchedule', 'Work schedule', 'select', ['Standard daytime', 'Early mornings', 'Evenings', 'Overnight shifts', 'Rotating shifts', 'Flexible/remote']],
  ['travelSchedule', 'Travel schedule', 'select', ['Rarely', 'Monthly', 'Weekly', 'Constantly']],
  ['morningRoutine', 'Current morning routine', 'text', null],
  ['eveningRoutine', 'Current evening routine', 'text', null],
];

export const DIAGNOSIS_FLAGS = [
  ['pregnancy', 'Pregnant or trying to conceive'],
  ['diabetes', 'Diabetes (type 1 or 2)'],
  ['kidney', 'Kidney disease'],
  ['liver', 'Liver disease'],
  ['edHistory', 'History of an eating disorder'],
];

export const URGENT_SYMPTOMS = [
  ['severeGi', 'Severe or worsening GI pain'],
  ['weightLoss', 'Unexplained weight loss'],
  ['bloodStool', 'Blood in stool'],
  ['fainting', 'Fainting or near-fainting'],
];

export const TOTAL_STEPS = 13; // 0..12

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 0,
    visited: [0],
    profile: {
      firstName: '', age: '', sex: '', heightUnit: 'imperial', heightFt: '', heightIn: '', heightCm: '',
      weightUnit: 'lb', weight: '', goalWeight: '', occupation: '', activityLevel: 'moderately active',
      stores: [], cookingSkill: 'comfortable', householdSize: 1, budget: 'moderate',
      equipment: ['stovetop', 'oven', 'microwave'], timePerMeal: 30, batchWindow: 90,
    },
    goals: { selected: [], top3: [], customGoal: '' },
    frameworks: {
      selected: [], customText: '', clinicianText: '', conflictChoice: '', acknowledgedConflicts: [],
    },
    food: {
      favProteins: [], favVeg: [], favFruit: [], dislikes: [], allergies: [], intolerances: [],
      religiousRestrictions: [], restrictions: [], refuseToEliminate: [], commonlyEaten: [],
      craved: [], preferredMeals: [], cuisines: [], mealsPerDay: 3, snacks: 'sometimes',
      coffee: '1-2 cups', alcohol: 'rarely', dessert: 'sometimes', diningOut: '1-2x/week',
    },
    documents: [],
    findings: [],
    health: { flags: {}, urgent: {} },
    bookPrefs: {
      chapters: CHAPTERS.map(([id, , , on], i) => ({ id, on, order: i })),
      length: 30, mealPlanDays: 7, style: 'modern-wellness', pdfVariant: 'standard',
      title: '', subtitle: '', logoDataUrl: '', tone: 'supportive', accent: '', fontPair: '',
    },
    safety: { acknowledged: [] },
    export: { history: [], acknowledgedFailures: false },
    regenerateFresh: false,
    book: null,
    versions: [],
    meta: { demoLoaded: false, lastExportAt: null, edits: [] },
  };
}

let cache = null;

export function loadState() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = migrate(parsed);
      return cache;
    }
  } catch (err) {
    console.warn('[state] could not parse saved state, starting fresh', err);
  }
  cache = defaultState();
  return cache;
}

export function saveState(state) {
  cache = state || cache;
  cache.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    return true;
  } catch (err) {
    console.error('[state] save failed', err);
    return false;
  }
}

export function resetState() {
  cache = defaultState();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    /* ignore */
  }
  return cache;
}

export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const out = deepMerge(base, raw);
  out.version = SCHEMA_VERSION;
  // repair chapter list if new chapters were added since the save
  const known = new Set(out.bookPrefs.chapters.map((c) => c.id));
  CHAPTERS.forEach(([id, , , on], i) => {
    if (!known.has(id)) out.bookPrefs.chapters.push({ id, on, order: 1000 + i });
  });
  out.bookPrefs.chapters = out.bookPrefs.chapters
    .filter((c) => CHAPTERS.some(([id]) => id === c.id))
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));
  if (!Array.isArray(out.visited)) out.visited = [0];
  return out;
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(patch || {})) {
      if (k in base) out[k] = deepMerge(base[k], patch[k]);
      else out[k] = patch[k];
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  const migrated = migrate(parsed);
  cache = migrated;
  saveState(migrated);
  return migrated;
}

/* ---------------------------------------------------------------- validation */

export const STEP_TITLES = [
  'Welcome', 'Profile', 'Goals', 'Lifestyle framework', 'Food preferences', 'Upload documents',
  'Review findings', 'Health & lifestyle', 'Book preferences', 'Safety review', 'Generating',
  'Book editor', 'Export',
];

export const OPTIONAL_STEPS = [5, 6, 7];

/**
 * Safety flags that still block generation. Kept here (rather than only in the
 * step module) so the gate holds no matter how the user navigates.
 */
function pendingSafetyFlags(state, acked) {
  try {
    return runSafetyChecks(state).filter((f) => f.requiresAck && !acked.has(f.id));
  } catch (err) {
    console.warn('[state] safety check failed during validation', err);
    return [];
  }
}

export function validateStep(step, state) {
  const errors = [];
  if (step === 1) {
    if (!state.profile.firstName.trim()) errors.push({ field: 'firstName', message: 'First name is required — it personalizes your book cover.' });
    const age = Number(state.profile.age);
    if (state.profile.age !== '' && (!Number.isFinite(age) || age < 13 || age > 110)) {
      errors.push({ field: 'age', message: 'Enter an age between 13 and 110, or leave it blank.' });
    }
    if (state.profile.householdSize < 1 || state.profile.householdSize > 12) {
      errors.push({ field: 'householdSize', message: 'Household size should be between 1 and 12.' });
    }
    if (state.profile.weight !== '' && Number(state.profile.weight) <= 0) {
      errors.push({ field: 'weight', message: 'Weight must be a positive number.' });
    }
  }
  if (step === 2) {
    if (!state.goals.selected.length) errors.push({ field: 'goals', message: 'Choose at least one goal.' });
    if (state.goals.selected.includes('Custom goal') && !state.goals.customGoal.trim()) {
      errors.push({ field: 'customGoal', message: 'Describe your custom goal.' });
    }
    if (state.goals.selected.length > 1 && state.goals.top3.length === 0) {
      errors.push({ field: 'top3', message: 'Rank at least one priority so the book knows what to lead with.' });
    }
  }
  if (step === 3) {
    if (!state.frameworks.selected.length) errors.push({ field: 'frameworks', message: 'Pick at least one framework — "Balanced omnivore" is a fine default.' });
    if (state.frameworks.selected.includes('custom-framework') && !state.frameworks.customText.trim()) {
      errors.push({ field: 'customText', message: 'Describe your custom framework.' });
    }
    if (state.frameworks.selected.includes('clinician-custom') && !state.frameworks.clinicianText.trim()) {
      errors.push({ field: 'clinicianText', message: 'Paste or summarize the clinician instructions.' });
    }
  }
  if (step === 4) {
    for (const r of state.food.restrictions) {
      if (!r.category) errors.push({ field: 'restrictions', message: `Tag "${r.food}" with a category so it is handled correctly.` });
    }
    if (!state.food.mealsPerDay || state.food.mealsPerDay < 1 || state.food.mealsPerDay > 6) {
      errors.push({ field: 'mealsPerDay', message: 'Meals per day must be between 1 and 6.' });
    }
  }
  if (step === 6) {
    const pending = state.findings.filter((f) => f.status === 'Needs confirmation');
    if (pending.length) errors.push({ field: 'findings', message: `${pending.length} finding(s) still need confirmation or removal.`, soft: true });
  }
  if (step === 9) {
    const acked = new Set(state.safety.acknowledged || []);
    const flags = pendingSafetyFlags(state, acked);
    if (flags.length) {
      errors.push({
        field: 'safety',
        message: `${flags.length} flag${flags.length === 1 ? '' : 's'} still need acknowledgement: ${flags.map((f) => f.title).join('; ')}.`,
      });
    }
  }
  if (step === 8) {
    const on = state.bookPrefs.chapters.filter((c) => c.on);
    if (on.length < 3) errors.push({ field: 'chapters', message: 'Keep at least three chapters so the book is useful.' });
  }
  return errors;
}

export function completionPercent(state) {
  const checks = [
    !!state.profile.firstName,
    !!state.profile.activityLevel && state.profile.equipment.length > 0,
    state.goals.selected.length > 0,
    state.goals.top3.length > 0,
    state.frameworks.selected.length > 0,
    state.food.favProteins.length + state.food.favVeg.length + state.food.favFruit.length > 0,
    state.food.restrictions.length > 0 || state.visited.includes(4),
    state.visited.includes(5),
    state.findings.every((f) => f.status !== 'Needs confirmation') && state.visited.includes(6),
    state.visited.includes(7),
    state.bookPrefs.chapters.some((c) => c.on) && state.visited.includes(8),
    state.visited.includes(9),
    !!state.book,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/* --------------------------------------------------------------- demo data */

export function demoProfile() {
  const s = defaultState();
  s.profile = {
    ...s.profile,
    firstName: 'Taylor', age: 34, sex: 'female', heightUnit: 'imperial', heightFt: 5, heightIn: 6,
    weightUnit: 'lb', weight: 158, goalWeight: 145, occupation: 'Product designer',
    activityLevel: 'moderately active', stores: ['Publix', "Trader Joe's", 'Costco'],
    cookingSkill: 'comfortable', householdSize: 2, budget: 'moderate',
    equipment: ['stovetop', 'oven', 'air fryer', 'blender', 'slow cooker', 'microwave'],
    timePerMeal: 30, batchWindow: 120,
  };
  s.goals.selected = ['Improved energy', 'Reduced bloating', 'Better digestion', 'Higher protein', 'Better meal consistency'];
  s.goals.top3 = ['Reduced bloating', 'Improved energy', 'Higher protein'];
  s.frameworks.selected = ['mediterranean', 'low-fodmap', 'high-protein'];
  s.food = {
    ...s.food,
    favProteins: ['Chicken breast', 'Salmon (wild)', 'Chicken eggs', 'Greek yogurt (plain)'],
    favVeg: ['Zucchini', 'Spinach', 'Carrot', 'Green beans', 'Kale'],
    favFruit: ['Blueberries', 'Strawberries', 'Banana (firm)'],
    dislikes: ['Beet', 'Liver'],
    restrictions: [
      { id: 'r-demo-1', food: 'Whole milk', category: 'Diagnosed intolerance', severity: 'moderate', note: 'Lactose intolerance confirmed by GI clinic in 2023.' },
      { id: 'r-demo-2', food: 'Onion', category: 'User-observed trigger', severity: 'moderate', note: 'Reliable bloating within an hour.', action: 'avoid' },
      { id: 'r-demo-3', food: 'Instant ramen', category: 'Personal preference', severity: 'mild', note: '' },
    ],
    refuseToEliminate: ['Coffee', 'Dark chocolate (85%)'],
    commonlyEaten: ['Rolled oats', 'Greek yogurt (plain)', 'Chicken breast', 'White rice'],
    craved: ['Dark chocolate (85%)', 'Sourdough bread'],
    preferredMeals: ['Bowls', 'Sheet-pan dinners', 'Salads'],
    cuisines: ['Mediterranean', 'Japanese', 'Mexican'],
    mealsPerDay: 3, snacks: 'sometimes', coffee: '1-2 cups', alcohol: 'rarely',
    dessert: 'sometimes', diningOut: '1-2x/week',
  };
  s.health = {
    ...s.health,
    digestiveConcerns: ['Bloating', 'Gas'], energyLevel: 'Variable', sleepDuration: '6-7 hours',
    stressLevel: 'High', cycleConsiderations: 'Bloating worse in the luteal phase.',
    injuries: 'Old left ankle sprain — avoid high-impact plyometrics.',
    exerciseFrequency: '3-4x/week', trainingPreferences: ['Strength training', 'Walking', 'Yoga'],
    diagnoses: 'IBS-mixed (GI, 2023)', medications: '', supplements: 'Vitamin D, magnesium glycinate',
    symptomFoods: ['Onion', 'Garlic', 'Whole wheat bread'], bowelHabits: 'Irregular',
    hydration: '5-7 cups', workSchedule: 'Flexible/remote', travelSchedule: 'Monthly',
    morningRoutine: 'Coffee, dog walk, email.', eveningRoutine: 'Dinner late, phone in bed.',
    flags: {}, urgent: {},
  };
  s.bookPrefs = { ...s.bookPrefs, length: 30, mealPlanDays: 7, style: 'modern-wellness', tone: 'supportive' };
  s.meta.demoLoaded = true;
  s.visited = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  s.currentStep = 8;
  return s;
}

/** The "hard case" scenario used in QA: stacked restrictive frameworks + anaphylaxis + pregnancy. */
export function hardCaseProfile() {
  const s = defaultState();
  s.profile = {
    ...s.profile,
    firstName: 'Rowan', age: 31, sex: 'female', heightUnit: 'metric', heightCm: 170,
    weightUnit: 'kg', weight: 68, goalWeight: 58, occupation: 'ICU nurse',
    activityLevel: 'lightly active', stores: ['Whole Foods', 'Sprouts'],
    cookingSkill: 'confident', householdSize: 3, budget: 'flexible',
    equipment: ['stovetop', 'oven', 'blender', 'pressure cooker', 'slow cooker'],
    timePerMeal: 45, batchWindow: 180,
  };
  s.goals.selected = ['Reduced bloating', 'Autoimmune-diet support', 'Improved energy', 'Fat loss', 'Better digestion'];
  s.goals.top3 = ['Autoimmune-diet support', 'Reduced bloating', 'Fat loss'];
  s.frameworks.selected = ['vegan', 'aip', 'low-fodmap'];
  s.food = {
    ...s.food,
    favProteins: ['Tofu (firm)', 'Lentils (canned, rinsed)', 'Hemp hearts'],
    favVeg: ['Kale', 'Zucchini', 'Carrot', 'Spinach'],
    favFruit: ['Blueberries', 'Banana (firm)'],
    dislikes: ['Okra'],
    restrictions: [
      { id: 'r-hard-1', food: 'Almonds', category: 'Medical allergy', severity: 'severe', note: 'Tree-nut anaphylaxis — carries epinephrine.' },
      { id: 'r-hard-2', food: 'Cashews', category: 'Medical allergy', severity: 'severe', note: 'Tree-nut anaphylaxis.' },
      { id: 'r-hard-3', food: 'Whole wheat bread', category: 'Food sensitivity test result', severity: 'moderate', note: 'IgG panel, page 4.' },
    ],
    refuseToEliminate: ['Coffee'],
    commonlyEaten: ['Quinoa', 'Chickpeas', 'Oat milk'],
    craved: ['Dark chocolate (85%)'],
    preferredMeals: ['Bowls', 'Soups'],
    cuisines: ['Indian', 'Thai', 'Mediterranean'],
    mealsPerDay: 4, snacks: 'often', coffee: '3+ cups', alcohol: 'never',
    dessert: 'often', diningOut: 'weekly',
  };
  s.health = {
    ...s.health,
    digestiveConcerns: ['Bloating', 'Cramping', 'Diarrhea'], energyLevel: 'Low',
    sleepDuration: '5-6 hours', stressLevel: 'Very high',
    cycleConsiderations: 'Currently pregnant — second trimester.',
    injuries: 'Chronic low back strain.', exerciseFrequency: '1-2x/week',
    trainingPreferences: ['Walking', 'Yoga'],
    diagnoses: 'Hashimoto thyroiditis', medications: 'Levothyroxine', supplements: 'Prenatal, iron, B12',
    symptomFoods: ['Onion', 'Garlic', 'Apple'], bowelHabits: 'Frequent urgency',
    hydration: '2-4 cups', workSchedule: 'Rotating shifts', travelSchedule: 'Rarely',
    morningRoutine: 'Shift handoff, no breakfast.', eveningRoutine: 'Late dinner, screens.',
    flags: { pregnancy: true }, urgent: {},
  };
  s.bookPrefs = { ...s.bookPrefs, length: 100, mealPlanDays: 30, style: 'luxury', tone: 'clinical' };
  s.findings = [
    {
      id: 'f-hard-1', food: 'Whole wheat bread', level: 'High', sourceType: 'Uploaded report',
      sourceReference: 'Food-sensitivity report — page 4', confidence: 'moderate',
      status: 'Needs confirmation', docId: 'demo-doc',
    },
    {
      id: 'f-hard-2', food: 'Chicken eggs', level: 'Moderate', sourceType: 'Uploaded report',
      sourceReference: 'Food-sensitivity report — page 4', confidence: 'moderate',
      status: 'Needs confirmation', docId: 'demo-doc',
    },
  ];
  s.documents = [
    {
      id: 'demo-doc', name: 'sample-food-sensitivity-report.md', docType: 'Food-sensitivity report',
      size: 2048, pages: 6, addedAt: new Date().toISOString(),
      textExcerpt: 'IgG food sensitivity panel — results by reactivity class.',
      extractable: true,
    },
  ];
  s.meta.demoLoaded = true;
  s.visited = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  s.currentStep = 3;
  return s;
}
