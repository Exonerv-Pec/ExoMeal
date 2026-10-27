import type { Body, FoodIndex, MacroSplit, Nutrition, Person, Recipe, Targets } from './types';
import { ingredientGrams } from './units';

export const ZERO: Nutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

export function add(a: Nutrition, b: Nutrition): Nutrition {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
  };
}

export function scale(n: Nutrition, k: number): Nutrition {
  return { kcal: n.kcal * k, protein: n.protein * k, fat: n.fat * k, carbs: n.carbs * k };
}

/** Nutrition of the whole ingredient list (all servings together). */
export function recipeTotal(recipe: Recipe, foods: FoodIndex): Nutrition {
  let total = ZERO;
  for (const ing of recipe.ingredients) {
    const food = foods.get(ing.food);
    if (!food) continue;
    const k = ingredientGrams(food, ing) / 100;
    total = add(total, {
      kcal: food.kcal * k,
      protein: food.protein * k,
      fat: food.fat * k,
      carbs: food.carbs * k,
    });
  }
  return total;
}

/** Nutrition of one serving. */
export function recipePerServing(recipe: Recipe, foods: FoodIndex): Nutrition {
  return scale(recipeTotal(recipe, foods), 1 / Math.max(1, recipe.servings));
}

// ---------------------------------------------------------------------------
// Daily targets
// ---------------------------------------------------------------------------

export const ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
} as const;

/** Daily calories added to the estimated need: a moderate deficit or surplus. */
export const GOAL_DELTA = { lose: -500, maintain: 0, gain: 200 } as const;

/** Limits for a custom split, in percent of calories. */
export const MACRO_LIMITS = {
  protein: [10, 40],
  fat: [15, 45],
  /** Carbohydrates get what is left, but never less than this. */
  carbsMin: 20,
} as const;

export const MENTZER = { protein: 25, fat: 15, carbs: 60 } as const;

/** Protein and fat percentages of a custom split, kept inside the limits. */
export function clampSplit(m: Pick<MacroSplit, 'protein' | 'fat'>): { protein: number; fat: number; carbs: number } {
  const clamp = (v: number, [lo, hi]: readonly [number, number]) =>
    Math.round(Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo)));
  const protein = clamp(m.protein, MACRO_LIMITS.protein);
  let fat = clamp(m.fat, MACRO_LIMITS.fat);
  if (protein + fat > 100 - MACRO_LIMITS.carbsMin) fat = Math.max(MACRO_LIMITS.fat[0], 100 - MACRO_LIMITS.carbsMin - protein);
  return { protein, fat, carbs: 100 - protein - fat };
}

/** Never suggest less than this, whatever the goal. */
const FLOOR = { female: 1200, male: 1500 } as const;

/**
 * Mifflin–St Jeor estimate. This is a rough guide for healthy adults, not
 * medical advice; the UI says so and the numbers can be overridden.
 */
export function calcTargets(p: Body): Targets {
  const warnings: string[] = [];
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];

  const minor = p.age < 18;
  const goal = minor && p.goal === 'lose' ? 'maintain' : p.goal;
  if (minor) {
    warnings.push(
      'Для подростков формулы неточны, а дефицит калорий не рассчитывается. Лучше обсудить питание с врачом.',
    );
  }

  let kcal = Math.round((tdee + GOAL_DELTA[goal]) / 10) * 10;
  if (p.kcalOverride && p.kcalOverride > 0) {
    kcal = Math.round(p.kcalOverride);
  }
  const floor = FLOOR[p.sex];
  if (kcal < floor) {
    warnings.push(
      `Меньше ${floor} ккал в день без наблюдения врача не рекомендуется. План строится по этому минимуму.`,
    );
    kcal = floor;
  }

  let protein: number;
  let fat: number;
  const preset = p.macros?.preset ?? 'standard';
  if (preset === 'standard') {
    // Protein by body weight, fat 30 % of calories, the rest carbohydrates.
    const proteinPerKg = p.goal === 'maintain' ? 1.4 : 1.6;
    protein = Math.round(Math.min(p.weightKg * proteinPerKg, (kcal * 0.35) / 4));
    fat = Math.round((kcal * 0.3) / 9);
  } else {
    const split = preset === 'mentzer' ? MENTZER : clampSplit(p.macros);
    protein = Math.round((kcal * split.protein) / 100 / 4);
    fat = Math.round((kcal * split.fat) / 100 / 9);
  }
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const pct = (g: number, k: number) => Math.round(((g * k) / kcal) * 100);
  const split = { protein: pct(protein, 4), fat: pct(fat, 9), carbs: 0 };
  split.carbs = 100 - split.protein - split.fat;

  return { kcal, protein, fat, carbs, split, bmr: Math.round(bmr), tdee: Math.round(tdee), warnings };
}

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export interface Member {
  person: Person;
  targets: Targets;
  /**
   * Size of this person's portion relative to the first person's:
   * their calorie target divided by the first person's.
   */
  share: number;
}

export interface Household {
  members: Member[];
  /** The first person's targets: the menu and its portions are fitted to them. */
  ref: Targets;
  /** Sum of shares: how many "first person" portions the household eats. */
  factor: number;
}

/**
 * One shared menu for everyone. The plan's portions are fitted to the first
 * person; everybody else eats the same dishes scaled by their own calories,
 * so each person lands on their own target.
 */
export function calcHousehold(people: Person[]): Household {
  if (people.length === 0) throw new Error('A household needs at least one person');
  const all = people.map((person) => ({ person, targets: calcTargets(person) }));
  const ref = all[0].targets;
  const members = all.map((m) => ({ ...m, share: m.targets.kcal / ref.kcal }));
  return { members, ref, factor: members.reduce((sum, m) => sum + m.share, 0) };
}
