// LifePrint — safety gate. Non-alarmist copy, but nothing is skipped silently.
import { eliminatedGroups, getProtocol } from './protocols.js';
import { foodByName } from './foods.js';

export const BANNED_CLAIM_WORDS = ['cure', 'cures', 'treat', 'treats', 'heal', 'heals', 'diagnose', 'diagnoses', 'guaranteed', 'reverses', 'eliminates disease'];

const RESTRICTIVE = ['aip', 'keto', 'low-fodmap', 'elimination-diet', 'whole30', 'vegan'];

function isRestrictive(ids) {
  return (ids || []).some((id) => RESTRICTIVE.includes(id)) || eliminatedGroups(ids).length >= 3;
}

function estimatedCalorieFloor(state) {
  // Deterministic Mifflin-St Jeor-style floor used only to detect an implausibly low target.
  const p = state.profile || {};
  const weightKg = p.weightUnit === 'kg' ? Number(p.weight) : Number(p.weight) * 0.4536;
  const heightCm = p.heightUnit === 'metric' ? Number(p.heightCm) : Number(p.heightFt) * 30.48 + Number(p.heightIn || 0) * 2.54;
  const age = Number(p.age) || 35;
  if (!weightKg || !heightCm) return null;
  const male = String(p.sex || '').toLowerCase().startsWith('m');
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (male ? 5 : -161);
  return Math.round(bmr);
}

/**
 * @returns {Array<{id, level: 'urgent'|'stop'|'caution', title, body, action, requiresAck: boolean, undismissable?: boolean}>}
 */
export function runSafetyChecks(state) {
  const flags = [];
  const ids = state.frameworks.selected || [];
  const health = state.health || {};
  const hFlags = health.flags || {};
  const urgent = health.urgent || {};
  const restrictive = isRestrictive(ids);
  const groups = eliminatedGroups(ids);

  const urgentMap = {
    severeGi: 'severe or worsening digestive pain',
    weightLoss: 'unexplained weight loss',
    bloodStool: 'blood in your stool',
    fainting: 'fainting or near-fainting',
  };
  const urgentHits = Object.keys(urgentMap).filter((k) => urgent[k]);
  if (urgentHits.length) {
    flags.push({
      id: 'urgent-symptoms',
      level: 'urgent',
      title: 'Please contact a clinician before changing your diet',
      body: `You marked ${urgentHits.map((k) => urgentMap[k]).join(', ')}. These are symptoms that deserve a real medical evaluation, and a lifestyle book is not the right first step. LifePrint will still build your book, but it will lead with this page and will not suggest any restriction as a response to these symptoms.`,
      action: 'Contact your primary care clinician or an urgent care provider. If symptoms are severe, seek immediate care.',
      requiresAck: true,
      undismissable: true,
    });
  }

  const floor = estimatedCalorieFloor(state);
  const weight = Number(state.profile.weight);
  const goal = Number(state.profile.goalWeight);
  const aggressive = weight && goal && (weight - goal) / weight > 0.15;
  if (floor && aggressive) {
    flags.push({
      id: 'aggressive-target',
      level: 'caution',
      title: 'Your goal weight implies a large, fast change',
      body: `Your goal is more than 15% below your current weight. LifePrint will not set a calorie target below your estimated resting energy need (~${floor} kcal, an estimate only). Slower changes hold better and protect muscle and menstrual function.`,
      action: 'Aim for a gradual rate of change and re-evaluate every 4-6 weeks.',
      requiresAck: true,
    });
  }

  if (groups.length > 5) {
    flags.push({
      id: 'many-groups',
      level: 'caution',
      title: `${groups.length} major food groups removed at once`,
      body: `Your frameworks remove ${groups.join(', ')}. That is a lot at once. It raises the chance of a nutrient gap and makes it harder to learn which food actually mattered.`,
      action: 'Consider phasing the eliminations, and ask your clinician about B12, iron, calcium, and vitamin D.',
      requiresAck: true,
    });
  }

  if (ids.includes('vegan') && ids.includes('aip') && ids.includes('low-fodmap')) {
    flags.push({
      id: 'triple-stack',
      level: 'stop',
      title: 'Vegan + AIP + Low-FODMAP together needs supervision',
      body: 'Stacking these three leaves very little to eat and makes an adequate protein, iron, B12, and calcium intake unlikely without professional planning and supplementation.',
      action: 'Please have a registered dietitian review this plan before you start. LifePrint will add a clinician-review page listing this flag.',
      requiresAck: true,
    });
  }

  if (hFlags.pregnancy) {
    if (aggressive || (state.goals.selected || []).includes('Fat loss')) {
      flags.push({
        id: 'pregnancy-weightloss',
        level: 'stop',
        title: 'Weight-loss goal during pregnancy',
        body: 'You indicated pregnancy along with a fat-loss goal. Intentional weight loss during pregnancy is a decision for your prenatal provider, not an app. LifePrint will drop the deficit framing and build a nourishment-first plan instead.',
        action: 'Bring your goals to your prenatal provider and follow their guidance on weight.',
        requiresAck: true,
      });
    }
    if (restrictive) {
      flags.push({
        id: 'pregnancy-restrictive',
        level: 'stop',
        title: 'Restrictive protocol during pregnancy',
        body: `Pregnancy raises requirements for protein, iron, folate, choline, iodine, and calcium. The frameworks you selected (${ids.map((i) => (getProtocol(i) || {}).short || i).join(', ')}) remove several major sources of those nutrients.`,
        action: 'Have your prenatal provider or a prenatal dietitian review this before starting.',
        requiresAck: true,
      });
    }
  }

  if (hFlags.edHistory && restrictive) {
    flags.push({
      id: 'ed-history',
      level: 'stop',
      title: 'Eating-disorder history + a restrictive plan',
      body: 'You told us there is an eating-disorder history. Restriction, food rules, and tracking can be genuinely destabilizing. LifePrint will remove calorie targets and weight-focused language from your book, and it will keep trackers optional.',
      action: 'Please involve your treatment team before starting any elimination or tracking protocol.',
      requiresAck: true,
    });
  }

  const anaphylaxis = (state.food.restrictions || []).filter(
    (r) => r.category === 'Medical allergy' && (String(r.severity).toLowerCase() === 'severe' || /anaphyla/i.test(r.note || '') || /anaphyla/i.test(r.food || ''))
  );
  if (anaphylaxis.length) {
    flags.push({
      id: 'anaphylaxis',
      level: 'stop',
      title: 'Anaphylaxis-level allergy on file',
      body: `You reported a severe allergy to ${anaphylaxis.map((a) => a.food).join(', ')}. LifePrint hard-excludes it and its food family from every recipe, meal, and grocery list — but a book cannot verify labels, cross-contact, or restaurant kitchens.`,
      action: 'Keep your prescribed epinephrine with you, read every label yourself, and confirm the exclusion list with your allergist.',
      requiresAck: true,
    });
  }

  for (const [key, label] of [['diabetes', 'diabetes'], ['kidney', 'kidney disease'], ['liver', 'liver disease']]) {
    if (hFlags[key] && restrictive) {
      flags.push({
        id: `${key}-restrictive`,
        level: 'stop',
        title: `${label[0].toUpperCase()}${label.slice(1)} + a restrictive protocol`,
        body: `Protein, potassium, sodium, phosphorus, and carbohydrate targets in ${label} are individual and clinically set. LifePrint's general guidance can conflict with your prescribed plan.`,
        action: 'Ask your care team to review this plan; where the two disagree, follow your care team.',
        requiresAck: true,
      });
    }
  }

  if ((health.injuries || '').trim() && /surgery|fracture|torn|rupture|acl|herniat|major/i.test(health.injuries)) {
    flags.push({
      id: 'major-injury',
      level: 'caution',
      title: 'Injury recovery in progress',
      body: 'You described a significant injury. The fitness chapter will stay conservative, avoid loading the affected area, and defer to any rehab program you are already following.',
      action: 'Follow your physical therapist over any general guidance in this book.',
      requiresAck: true,
    });
  }

  if ((health.medications || '').trim() && (health.supplements || '').trim()) {
    flags.push({
      id: 'med-supp-interaction',
      level: 'caution',
      title: 'Medications and supplements together',
      body: 'You listed both medications and supplements. Some combinations interact — timing, absorption, and clotting are common examples. LifePrint does not check interactions and never suggests dosing.',
      action: 'Ask a pharmacist to review the full list; it is free and takes five minutes.',
      requiresAck: true,
    });
  }

  const nutAllergy = (state.food.restrictions || []).some((r) => {
    const f = foodByName(r.food);
    return r.category === 'Medical allergy' && f && (f.markers.nut || f.markers.peanut);
  });
  if (nutAllergy && ids.includes('vegan')) {
    flags.push({
      id: 'nut-allergy-vegan',
      level: 'caution',
      title: 'Nut allergy with a plant-based plan',
      body: 'With nuts excluded, your protein and fat sources narrow considerably. The plan will lean on soy, legumes, seeds, and hemp — assuming those are safe for you.',
      action: 'Confirm seed and legume safety with your allergist before relying on them daily.',
      requiresAck: false,
    });
  }

  const order = { urgent: 0, stop: 1, caution: 2 };
  return flags.sort((a, b) => order[a.level] - order[b.level]);
}

export function needsAcknowledgement(flags, acknowledged) {
  const ackSet = new Set(acknowledged || []);
  return flags.filter((f) => f.requiresAck && !ackSet.has(f.id));
}

/** Scan generated copy for unhedged medical claims. */
export function scanClaims(text) {
  const hits = [];
  const lower = String(text || '').toLowerCase();
  for (const word of BANNED_CLAIM_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'g');
    let m;
    while ((m = re.exec(lower))) {
      const context = lower.slice(Math.max(0, m.index - 40), m.index + word.length + 40);
      // allow explicitly negated / disclaimered usage
      if (/not (intended to |meant to )?(diagnose|treat|cure)/.test(context)) continue;
      if (/does not (diagnose|treat|cure)/.test(context)) continue;
      if (/cannot (diagnose|treat|cure)/.test(context)) continue;
      if (/treatment team|treat yourself gently/.test(context)) continue;
      if (/(claim|promise|intend|able|try)\w* to (diagnose|treat|cure)/.test(context)) continue;
      // noun usage: "a deliberate treat", "sweeteners & treats"
      if (/(a|occasional|deliberate|&|and|weekly|the) treats?\b/.test(context)) continue;
      // verb-as-framing usage: "treats every finding as temporary"
      if (/treats? (it|them|every|each|this|that|all)\b/.test(context)) continue;
      // data label, not an act of diagnosing
      if (/diagnos\w+ (on file|you (shared|entered)|from your)/.test(context)) continue;
      hits.push({ word, context: context.trim() });
    }
  }
  return hits;
}
