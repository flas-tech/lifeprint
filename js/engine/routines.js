// LifePrint — routines, schedules, trackers, reintroduction protocol, fitness & recovery.
import { foodByName } from './foods.js';

export function hydrationTarget(state) {
  const p = state.profile || {};
  const weightLb = p.weightUnit === 'kg' ? Number(p.weight) * 2.2046 : Number(p.weight);
  const activityBump = { sedentary: 0, 'lightly active': 2, 'moderately active': 3, active: 4, 'very active': 6 }[p.activityLevel] || 2;
  const base = weightLb ? Math.round((weightLb / 2) / 8) : 8; // cups
  const cups = Math.max(6, Math.min(20, base + activityBump));
  return {
    cups,
    ounces: cups * 8,
    current: (state.health || {}).hydration || 'not recorded',
    estimated: true,
    tactics: [
      'One full glass before coffee, every day. It is the easiest win in the book.',
      `Fill a ${Math.max(2, Math.round(cups / 4))}-cup bottle and finish it ${Math.min(4, Math.max(2, Math.round(cups / 4)))} times.`,
      'Add electrolytes on days with heavy sweat, long shifts, or air travel.',
      'Stop drinking large volumes 90 minutes before bed to protect sleep.',
    ],
  };
}

export function beverageGuide(state) {
  const coffee = (state.food || {}).coffee || 'none';
  const heavy = /3\+|4|5/.test(coffee);
  return {
    coffee,
    caffeineCutoff: heavy ? '10 hours before bed' : '8 hours before bed',
    notes: [
      heavy
        ? 'Your intake is on the higher side. Rather than quitting, move the last cup earlier and keep the first cup after food.'
        : 'Keep caffeine after your first meal rather than on an empty stomach — it is easier on both cortisol rhythm and digestion.',
      'Sparkling water with citrus covers most of the ritual of a soda without the sugar.',
      'Herbal tea after dinner is a useful bookend cue for the evening routine.',
      'Alcohol reliably fragments sleep architecture even when it makes you fall asleep faster.',
    ],
    alcohol: (state.food || {}).alcohol || 'not recorded',
  };
}

export function supplementOverview(state) {
  const listed = String((state.health || {}).supplements || '')
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const context = [];
  const ids = state.frameworks.selected || [];
  if (ids.includes('vegan')) context.push('Plant-based eating makes vitamin B12 a genuine requirement rather than an optional extra, and iron, zinc, iodine, and omega-3 (EPA/DHA) worth discussing.');
  if (ids.includes('aip') || ids.includes('elimination-diet')) context.push('Elimination phases commonly reduce calcium, magnesium, and fiber intake. Ask about monitoring rather than guessing.');
  if (ids.includes('keto')) context.push('Lower-carbohydrate eating increases sodium, potassium, and magnesium turnover, especially in the first two weeks.');
  if ((state.health.flags || {}).pregnancy) context.push('Pregnancy has specific prenatal requirements (folate, iron, choline, iodine, DHA) that should come from your prenatal provider, not an app.');
  return {
    listed,
    context,
    rules: [
      'LifePrint never suggests a dose. Dosing is a clinical decision.',
      'Bring the full list — including anything herbal — to a pharmacist or clinician.',
      'Introduce one new supplement at a time, two weeks apart, so you can attribute any change.',
      'Food first where it is realistic; supplements fill genuine gaps rather than replacing meals.',
    ],
    disclaimer: 'Educational overview only. Nothing here is a recommendation to start, stop, or change a supplement.',
  };
}

export function fitnessPlan(state) {
  const h = state.health || {};
  const freq = h.exerciseFrequency || '1-2x/week';
  const prefs = h.trainingPreferences && h.trainingPreferences.length ? h.trainingPreferences : ['Walking', 'Strength training'];
  const injured = !!(h.injuries || '').trim();
  const pregnant = !!(h.flags || {}).pregnancy;
  const sessions = { None: 2, '1-2x/week': 2, '3-4x/week': 4, '5-6x/week': 5, Daily: 6 }[freq] || 3;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const blocks = [];
  const strength = prefs.includes('Strength training');
  for (let i = 0; i < sessions; i += 1) {
    const day = days[(i * 2) % 7];
    const type = strength && i % 2 === 0 ? 'Full-body strength' : prefs[(i + 1) % prefs.length];
    blocks.push({
      day,
      focus: type,
      minutes: type === 'Full-body strength' ? 45 : 30,
      detail:
        type === 'Full-body strength'
          ? 'Six movements: push, pull, hinge, squat, carry, core. Two to three sets each, stopping two reps short of failure.'
          : `${type} at a conversational effort. If you cannot hold a conversation, slow down.`,
      cautions: injured ? 'Skip anything that loads the area you flagged as injured; substitute an unaffected pattern.' : '',
    });
  }
  return {
    sessionsPerWeek: sessions,
    preferences: prefs,
    blocks,
    progression: pregnant
      ? 'Hold intensity steady rather than progressing, and follow your prenatal provider on load and positions.'
      : 'Add one rep per set each week for three weeks, then reset the load and repeat. Progress slowly and boringly.',
    nonNegotiables: [
      'A 10-minute walk after your largest meal.',
      'Two minutes of mobility for the area that bothers you most.',
      'One session you would still do on a bad day.',
    ],
    disclaimer: 'General educational programming. If you work with a physical therapist or coach, their plan takes precedence.',
  };
}

export function recoveryPlan(state) {
  const h = state.health || {};
  return {
    sleepAnchor: h.sleepDuration || 'not recorded',
    practices: [
      { name: 'Deload week', detail: 'Every fourth week, cut volume by a third. Recovery is where adaptation happens.' },
      { name: 'Post-session protein', detail: 'A protein-containing meal within a couple of hours of training. Timing matters far less than the daily total.' },
      { name: 'Mobility minimum', detail: 'Five minutes daily on hips, ankles, and thoracic spine beats an hour once a week.' },
      { name: 'Heat and cold', detail: 'Use whichever you will actually do. Cold immediately after strength work can blunt adaptation.' },
    ],
    injuryNote: (h.injuries || '').trim()
      ? `You reported: ${h.injuries}. Every session in this book should be modified around it, and a physical therapist's program overrides these pages.`
      : 'No injuries on file. Keep it that way by progressing load slowly.',
  };
}

export function sleepPlan(state) {
  const h = state.health || {};
  const short = /<5|5-6/.test(h.sleepDuration || '');
  const shift = /Overnight|Rotating/.test(h.workSchedule || '');
  return {
    current: h.sleepDuration || 'not recorded',
    target: short ? 'Add 30 minutes per night for two weeks, then reassess.' : 'Protect the duration you already get.',
    windDown: [
      shift ? 'Blackout mask and earplugs are non-optional on shift work — treat them as equipment.' : 'Dim the main lights 60 minutes before bed.',
      'Last caffeine 8-10 hours before your target sleep time.',
      'Screens out of arm\u2019s reach; charge the phone across the room.',
      'Same wake time seven days a week, even after a bad night.',
      'If you are awake more than 20 minutes, get up, sit in low light, and return when sleepy.',
    ],
    shiftNote: shift ? 'On rotating shifts, anchor meals to your wake time rather than the clock, and keep the pre-sleep routine identical regardless of hour.' : '',
  };
}

export function stressPlan(state) {
  const level = (state.health || {}).stressLevel || 'Moderate';
  const high = /High|Very high/.test(level);
  return {
    level,
    practices: [
      { name: 'Physiological sigh', minutes: 1, detail: 'Two inhales through the nose, one long exhale through the mouth. Repeat five times. Works in a hallway.' },
      { name: 'Daylight first', minutes: 10, detail: 'Ten minutes of outdoor light within an hour of waking.' },
      { name: 'One-page brain dump', minutes: 5, detail: 'Write everything unfinished, then circle the one thing that matters tomorrow.' },
      { name: 'Boundary sentence', minutes: 1, detail: 'One rehearsed sentence to decline a request without negotiating.' },
    ],
    note: high
      ? 'Your stress level is high enough that food changes alone will not fix how you feel. Keep the nutrition plan simple this month and spend your effort on sleep and load management.'
      : 'Keep these short. A practice you do daily for two minutes beats one you skip for twenty.',
  };
}

export function routines(state) {
  const h = state.health || {};
  const shift = /Overnight|Rotating/.test(h.workSchedule || '');
  return {
    morning: {
      title: 'Morning routine',
      steps: [
        'Water before coffee — one full glass.',
        shift ? 'Light exposure at the start of your waking period, whenever that falls.' : 'Ten minutes of daylight.',
        'Protein-forward first meal, sitting down.',
        'Write the one thing that would make today count.',
      ],
      minutes: 20,
      basedOn: h.morningRoutine || 'no current routine recorded',
    },
    evening: {
      title: 'Evening routine',
      steps: [
        'Kitchen closed and dishes done — a clear counter is tomorrow\u2019s head start.',
        'Set out tomorrow\u2019s water bottle and lunch.',
        'Two minutes of mobility.',
        'Screens away, low light, same time nightly.',
      ],
      minutes: 25,
      basedOn: h.eveningRoutine || 'no current routine recorded',
    },
    weeklyReset: {
      title: 'Weekly reset',
      steps: [
        'Ten-minute fridge audit: toss, wipe, reorganize.',
        'Review the meal plan and swap the two meals you know you will not cook.',
        'Order or shop from the grocery guide.',
        'Batch cook using the meal-prep schedule.',
        'Fill in last week\u2019s trackers and note one pattern.',
      ],
      minutes: 90,
    },
  };
}

export function weeklySchedules(state, batchPlan) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shopDay = (state.profile.stores || []).length > 1 ? 'Saturday' : 'Sunday';
  return days.map((day) => ({
    day,
    grocery: day === shopDay ? 'Shop / pick up order' : '',
    mealPrep: day === 'Sunday' ? `Batch session (${batchPlan.windowMinutes} min)` : day === 'Wednesday' && batchPlan.cadence.includes('Two') ? 'Short mid-week top-up (30 min)' : '',
    movement: ['Monday', 'Wednesday', 'Friday'].includes(day) ? 'Training block' : 'Walk',
    recovery: day === 'Thursday' ? 'Mobility + early night' : day === 'Sunday' ? 'Full rest' : 'Five-minute mobility',
  }));
}

export const TRACKERS = [
  { id: 'meals', name: 'Meal log', columns: ['Date', 'Meal', 'What I ate', 'Portion', 'How I felt after'] },
  { id: 'symptoms', name: 'Symptom log', columns: ['Date', 'Symptom', 'Severity 1-5', 'Suspected food', 'Notes'] },
  { id: 'digestion', name: 'Digestion log', columns: ['Date', 'Bloating 1-5', 'Regularity', 'Discomfort 1-5', 'Notes'] },
  { id: 'energy', name: 'Energy log', columns: ['Date', 'Morning 1-5', 'Afternoon 1-5', 'Evening 1-5', 'Notes'] },
  { id: 'sleep', name: 'Sleep log', columns: ['Date', 'To bed', 'Woke', 'Hours', 'Quality 1-5'] },
  { id: 'stress', name: 'Stress log', columns: ['Date', 'Level 1-5', 'Trigger', 'What helped'] },
  { id: 'exercise', name: 'Exercise log', columns: ['Date', 'Session', 'Minutes', 'Effort 1-10', 'Notes'] },
  { id: 'hydration', name: 'Hydration tracker', columns: ['Date', 'Cups', 'Electrolytes?', 'Notes'] },
  { id: 'reintro', name: 'Reintroduction log', columns: ['Date', 'Food', 'Portion', 'Symptoms 0-72h', 'Verdict'] },
  { id: 'reactions', name: 'Reaction log', columns: ['Date', 'Food', 'Reaction', 'Onset', 'Duration'] },
  { id: 'weekly', name: 'Weekly goal review', columns: ['Week', 'Goal', 'Went well', 'Got in the way', 'Next week'] },
];

/** Reintroduction protocol — only for reintroducible, temporary exclusions. */
export function reintroductionProtocol(rules) {
  const candidates = rules.list
    .filter((r) => r.status === 'Avoid' && r.reintroducible && r.temporary && !r.preferenceOnly)
    .sort((a, b) => {
      const rank = { 'Protocol-based exclusion': 0, 'Framework guidance': 1, 'Uploaded report': 2, 'Food sensitivity test result': 2, 'User-observed trigger': 3 };
      return (rank[a.sourceType] ?? 5) - (rank[b.sourceType] ?? 5) || a.food.localeCompare(b.food);
    });
  const ordered = candidates.slice(0, 12).map((r, i) => ({
    order: i + 1,
    food: r.food,
    why: r.reason,
    sourceType: r.sourceType,
    sourceReference: r.sourceReference,
    schedule: [
      'Day 1 — small portion (about a quarter of a normal serving) with a meal you already tolerate.',
      'Day 2 — half portion, same time of day.',
      'Day 3 — full portion.',
      'Days 4-5 — no test food. Watch and log.',
    ],
    watchWindow: '72 hours',
  }));
  return {
    applicable: ordered.length > 0,
    items: ordered,
    rules: [
      'One food at a time. Two at once tells you nothing.',
      'Keep everything else identical during a trial week.',
      'Log symptoms for 72 hours after the first exposure.',
      'If a clear reaction occurs, stop, wait a week, and note it. A reaction does not prove an allergy — it is information for you and your clinician.',
      'Foods excluded because of a medical allergy or a diagnosed intolerance are never part of a self-directed reintroduction.',
    ],
    excludedFromReintro: rules.list.filter((r) => r.status === 'Avoid' && !r.reintroducible).map((r) => r.food),
  };
}

export function symptomMap(state, rules) {
  const foods = (state.health.symptomFoods || []).map((n) => {
    const f = foodByName(n);
    const r = f ? rules.rulings[f.id] : null;
    return {
      input: n,
      matched: f ? f.name : null,
      status: r ? r.status : 'not in library',
      symptoms: state.health.digestiveConcerns || [],
    };
  });
  return { entries: foods, concerns: state.health.digestiveConcerns || [] };
}
