// LifePrint — ruling resolution engine.
// Strict precedence order (see docs/PIPELINE.md):
//   1 medical allergy → 2 clinician instruction → 3 diagnosed intolerance →
//   4 confirmed sensitivity finding → 5 framework exclusion → 6 user-observed trigger →
//   7 personal dislike/refusal → 8 framework default
import { FOODS, getFood, foodByName } from './foods.js';
import { getProtocol, protocolRuling, PROTOCOLS } from './protocols.js';

export const STATUSES = ['Eat freely', 'Eat in moderation', 'Occasional', 'Avoid'];

const ALLERGEN_FAMILIES = [
  { marker: 'nut', label: 'tree nut' },
  { marker: 'peanut', label: 'peanut' },
  { marker: 'shellfish', label: 'shellfish' },
  { marker: 'fish', label: 'fish' },
  { marker: 'dairy', label: 'dairy' },
  { marker: 'egg', label: 'egg' },
  { marker: 'soy', label: 'soy' },
  { marker: 'gluten', label: 'gluten-containing grain' },
  { marker: 'corn', label: 'corn' },
];

function normalizeList(list) {
  return (list || []).map((x) => String(x || '').trim()).filter(Boolean);
}

/** Parse clinician free text conservatively for explicit avoid instructions. */
export function parseClinicianInstructions(text) {
  const out = [];
  if (!text) return out;
  const lines = String(text).split(/[\n;]+/);
  lines.forEach((line, idx) => {
    const m = line.match(/\b(avoid|eliminate|no|remove|stop eating|cut out)\b[:\s]+(.+)/i);
    if (!m) return;
    const items = m[2].split(/,| and | or |\//i);
    for (const item of items) {
      const food = foodByName(item.replace(/[.\s]+$/, '').trim());
      if (food) out.push({ foodId: food.id, reference: `Clinician instructions — line ${idx + 1}`, raw: item.trim() });
    }
  });
  return out;
}

function allergenTargets(state) {
  const map = new Map(); // foodId -> {label, direct, source}
  const allergyEntries = (state.food.restrictions || []).filter((r) => r.category === 'Medical allergy');
  for (const entry of allergyEntries) {
    const food = foodByName(entry.food);
    if (!food) continue;
    map.set(food.id, { label: food.name, direct: true, entry });
    for (const fam of ALLERGEN_FAMILIES) {
      if (!food.markers[fam.marker]) continue;
      for (const f of FOODS) {
        if (f.markers[fam.marker] && !map.has(f.id)) {
          map.set(f.id, { label: food.name, direct: false, family: fam.label, entry });
        }
      }
    }
  }
  return map;
}

/**
 * Build the complete rule set.
 * @returns {{rulings: Object<string, Ruling>, list: Ruling[], byStatus: Object, reconciliations: Array, allergenFamilies: string[]}}
 */
export function buildRules(state) {
  const protocolIds = state.frameworks.selected || [];
  const protocols = protocolIds.map(getProtocol).filter(Boolean);
  const allergens = allergenTargets(state);
  const clinician = parseClinicianInstructions(state.frameworks.clinicianText);
  const clinicianMap = new Map(clinician.map((c) => [c.foodId, c]));

  const restrictionsBy = (category) =>
    (state.food.restrictions || []).filter((r) => r.category === category);

  const intoleranceMap = new Map();
  for (const r of restrictionsBy('Diagnosed intolerance')) {
    const f = foodByName(r.food);
    if (f) intoleranceMap.set(f.id, r);
    // an intolerance to a dairy/gluten item implies the family (lactose, celiac)
    if (f && (f.markers.dairy || f.markers.gluten)) {
      const marker = f.markers.dairy ? 'dairy' : 'gluten';
      for (const other of FOODS) if (other.markers[marker] && !intoleranceMap.has(other.id)) intoleranceMap.set(other.id, { ...r, implied: true, impliedFrom: f.name, marker });
    }
  }

  const sensitivityMap = new Map();
  for (const finding of state.findings || []) {
    if (finding.status !== 'Confirmed') continue;
    const f = foodByName(finding.food);
    if (!f) continue;
    sensitivityMap.set(f.id, finding);
  }
  for (const r of restrictionsBy('Food sensitivity test result')) {
    const f = foodByName(r.food);
    if (f && !sensitivityMap.has(f.id)) {
      sensitivityMap.set(f.id, {
        food: r.food, level: r.severity || 'Moderate', sourceType: 'Food sensitivity test result',
        sourceReference: r.note || 'User-entered sensitivity result', confidence: 'moderate',
      });
    }
  }

  const triggerMap = new Map();
  for (const r of restrictionsBy('User-observed trigger')) {
    const f = foodByName(r.food);
    if (f) triggerMap.set(f.id, r);
  }
  for (const name of normalizeList(state.health.symptomFoods)) {
    const f = foodByName(name);
    if (f && !triggerMap.has(f.id)) triggerMap.set(f.id, { food: name, action: 'moderate', note: 'Listed in your health questionnaire as associated with symptoms.' });
  }

  const protocolExclusionMap = new Map();
  for (const r of restrictionsBy('Protocol-based exclusion')) {
    const f = foodByName(r.food);
    if (f) protocolExclusionMap.set(f.id, r);
  }

  const preferenceIds = new Set();
  for (const name of [...normalizeList(state.food.dislikes), ...normalizeList(restrictionsBy('Personal preference').map((r) => r.food)), ...normalizeList(state.food.religiousRestrictions)]) {
    const f = foodByName(name);
    if (f) preferenceIds.add(f.id);
  }

  const refuseIds = new Set();
  for (const name of normalizeList(state.food.refuseToEliminate)) {
    const f = foodByName(name);
    if (f) refuseIds.add(f.id);
  }

  const symptomLinks = new Map();
  for (const name of normalizeList(state.health.symptomFoods)) {
    const f = foodByName(name);
    if (f) symptomLinks.set(f.id, (state.health.digestiveConcerns || []).slice(0, 3));
  }

  const rulings = {};
  const reconciliations = [];

  for (const food of FOODS) {
    const related = symptomLinks.get(food.id) || [];
    const base = {
      food: food.name,
      foodId: food.id,
      category: food.category,
      substitutes: (food.substitutes || []).map((id) => (getFood(id) ? getFood(id).name : id)),
      prepNotes: food.prepNotes,
      relatedSymptoms: related,
      protocolStatus: {},
      personalizationNote: '',
      generated: 'rules-engine',
    };
    for (const p of protocols) base.protocolStatus[p.id] = protocolRuling(p, food);

    let ruling = null;

    // 1 — medical allergy (hard, permanent)
    const allergy = allergens.get(food.id);
    if (allergy) {
      ruling = {
        ...base,
        status: 'Avoid',
        precedence: 1,
        reason: allergy.direct
          ? `You reported a medical allergy to ${allergy.label}. This is a permanent, hard exclusion — it is removed from every recipe, meal, and grocery list in this book.`
          : `Shares the ${allergy.family} family with your reported allergy to ${allergy.label}, so LifePrint excludes it as a cross-contact precaution. Confirm the specifics with your allergist.`,
        sourceType: 'Medical allergy',
        sourceReference: allergy.entry && allergy.entry.note ? allergy.entry.note : 'Profile — allergy entry',
        confidence: 'high',
        temporary: false,
        reintroducible: false,
        hardExclusion: true,
      };
    }

    // 2 — clinician instruction
    if (!ruling && clinicianMap.has(food.id)) {
      const c = clinicianMap.get(food.id);
      ruling = {
        ...base,
        status: 'Avoid',
        precedence: 2,
        reason: 'Your clinician instructed you to avoid this. Clinician instructions override every other rule in LifePrint.',
        sourceType: 'Clinician instruction',
        sourceReference: c.reference,
        confidence: 'high',
        temporary: true,
        reintroducible: false,
        clinician: true,
      };
    }

    // 3 — diagnosed intolerance
    if (!ruling && intoleranceMap.has(food.id)) {
      const r = intoleranceMap.get(food.id);
      ruling = {
        ...base,
        status: 'Avoid',
        precedence: 3,
        reason: r.implied
          ? `Excluded because you reported a diagnosed intolerance to ${r.impliedFrom}, and this food carries the same ${r.marker} component.`
          : 'You reported a diagnosed intolerance to this food.',
        sourceType: 'Diagnosed intolerance',
        sourceReference: r.note || 'Profile — intolerance entry',
        confidence: 'high',
        temporary: false,
        reintroducible: false,
      };
    }

    // 4 — confirmed food-sensitivity finding
    if (!ruling && sensitivityMap.has(food.id)) {
      const f = sensitivityMap.get(food.id);
      ruling = {
        ...base,
        status: 'Avoid',
        precedence: 4,
        reason: `A confirmed food-sensitivity result (${f.level || 'elevated'}) is on file for this food, so it is paused during your current phase. A sensitivity panel result is not proof of a true allergy — it is a starting point for a structured trial.`,
        sourceType: f.sourceType || 'Uploaded report',
        sourceReference: f.sourceReference || 'Uploaded report',
        confidence: f.confidence || 'moderate',
        temporary: true,
        reintroducible: true,
        notAnAllergy: true,
      };
    }

    // 5 — framework / protocol exclusion
    if (!ruling) {
      const excluders = protocols.filter((p) => !p.userDefined && protocolRuling(p, food) === 'no');
      const manual = protocolExclusionMap.get(food.id);
      if (excluders.length || manual) {
        const names = excluders.map((p) => p.name);
        ruling = {
          ...base,
          status: 'Avoid',
          precedence: 5,
          reason: manual && !names.length
            ? 'Excluded as part of the protocol you are following.'
            : `Excluded during this phase by ${names.join(' and ')}. This is a framework choice, not a medical finding, so it can be reintroduced when the phase ends.`,
          sourceType: 'Protocol-based exclusion',
          sourceReference: names.length ? `Framework: ${names.join(', ')}` : (manual && manual.note) || 'Protocol entry',
          confidence: 'high',
          temporary: true,
          reintroducible: true,
          protocolNames: names,
        };
      }
    }

    // 6 — user-observed trigger
    if (!ruling && triggerMap.has(food.id)) {
      const t = triggerMap.get(food.id);
      const avoid = (t.action || 'moderate') === 'avoid';
      ruling = {
        ...base,
        status: avoid ? 'Avoid' : 'Eat in moderation',
        precedence: 6,
        reason: avoid
          ? 'You have observed a consistent reaction to this food, so it is paused and flagged for tracking. Self-observed reactions are useful signals, not diagnoses.'
          : 'You have linked this food to symptoms, so it stays in the plan in smaller portions with a tracking prompt. Log how you feel 1-3 hours after eating it.',
        sourceType: 'User-observed trigger',
        sourceReference: t.note || 'Profile — observed trigger',
        confidence: 'low',
        temporary: true,
        reintroducible: true,
        track: true,
      };
    }

    // 7 — personal dislike / refusal / ethical restriction
    if (!ruling && preferenceIds.has(food.id)) {
      ruling = {
        ...base,
        status: 'Avoid',
        precedence: 7,
        reason: 'Left out because you told us you would rather not eat it. This is a preference, not a medical restriction, and nothing in this book treats it as one.',
        sourceType: 'Personal preference',
        sourceReference: 'Profile — preferences',
        confidence: 'high',
        temporary: true,
        reintroducible: true,
        preferenceOnly: true,
      };
    }

    // 8 — framework default
    if (!ruling) {
      const limiters = protocols.filter((p) => !p.userDefined && protocolRuling(p, food) === 'limit');
      const treat = food.tags.includes('treat') || food.markers.addedSugar || food.markers.alcohol || food.markers.ultraProcessed;
      let status = 'Eat freely';
      let reason = 'Nothing in your profile restricts this food, and it fits the frameworks you selected.';
      if (limiters.length) {
        status = 'Eat in moderation';
        reason = `${limiters.map((p) => p.name).join(' and ')} suggests keeping this to smaller or less frequent portions rather than removing it.`;
      }
      if (treat) {
        status = 'Occasional';
        reason = 'Fine to enjoy deliberately and occasionally; it is not a staple of your plan.';
      }
      ruling = {
        ...base,
        status,
        precedence: 8,
        reason,
        sourceType: limiters.length ? 'Framework guidance' : 'General guidance',
        sourceReference: limiters.length ? `Framework: ${limiters.map((p) => p.name).join(', ')}` : 'LifePrint default guidance',
        confidence: limiters.length ? 'moderate' : 'moderate',
        temporary: false,
        reintroducible: false,
        heuristic: true,
      };
    }

    // "refuses to eliminate" reconciliation — never silently overridden
    if (refuseIds.has(food.id) && ruling.status === 'Avoid') {
      if (ruling.precedence <= 3) {
        ruling.personalizationNote = `You listed ${food.name} as something you do not want to eliminate. LifePrint cannot recommend keeping it: the exclusion comes from ${ruling.sourceType.toLowerCase()}, which is a safety-level rule. Talk to your clinician if you want to revisit it.`;
        reconciliations.push({
          food: food.name, kept: false, sourceType: ruling.sourceType,
          note: ruling.personalizationNote,
        });
      } else {
        ruling.status = 'Eat in moderation';
        ruling.personalizationNote = `You asked to keep ${food.name}. It stays in your plan in a smaller, deliberate portion instead of being removed, even though ${ruling.sourceType.toLowerCase()} would otherwise exclude it. Track how you feel and revisit in two weeks.`;
        ruling.reason = `${ruling.reason} You chose to keep this food, so it is limited rather than removed.`;
        ruling.userOverride = true;
        reconciliations.push({
          food: food.name, kept: true, sourceType: ruling.sourceType,
          note: ruling.personalizationNote,
        });
      }
    }

    rulings[food.id] = ruling;
  }

  const list = Object.values(rulings);
  const byStatus = {};
  for (const s of STATUSES) byStatus[s] = list.filter((r) => r.status === s).sort((a, b) => a.food.localeCompare(b.food));

  return {
    rulings,
    list,
    byStatus,
    reconciliations,
    protocolIds,
    protocols,
    clinicianInstructions: clinician,
    allergenFamilies: [...new Set([...allergens.values()].filter((a) => a.family).map((a) => a.family))],
    allergenFoodIds: [...allergens.keys()],
    counts: Object.fromEntries(STATUSES.map((s) => [s, byStatus[s].length])),
  };
}

export function rulingFor(rules, foodId) {
  return rules.rulings[foodId] || null;
}

/** Foods allowed in plans, ordered by fit for the selected frameworks and stated favorites. */
export function allowedFoods(rules, state, filter = () => true) {
  const favorites = new Set(
    [...(state.food.favProteins || []), ...(state.food.favVeg || []), ...(state.food.favFruit || []), ...(state.food.commonlyEaten || [])]
      .map((n) => (foodByName(n) ? foodByName(n).id : null))
      .filter(Boolean)
  );
  const emphasize = new Set();
  for (const p of rules.protocols) for (const t of p.emphasize || []) emphasize.add(t);
  return FOODS.filter((f) => {
    const r = rules.rulings[f.id];
    if (!r || r.status === 'Avoid') return false;
    return filter(f, r);
  })
    .map((f) => {
      let score = 0;
      if (favorites.has(f.id)) score += 40;
      if (rules.rulings[f.id].status === 'Eat freely') score += 20;
      if (rules.rulings[f.id].status === 'Eat in moderation') score += 6;
      for (const t of f.tags) if (emphasize.has(t)) score += 4;
      score += Math.min(10, f.protein / 3);
      return { food: f, score };
    })
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .map((x) => x.food);
}

export const ALL_PROTOCOLS = PROTOCOLS;
