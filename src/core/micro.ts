import { ingredientGrams } from './units';
import {
  MICRO_KEYS,
  type Body,
  type FoodIndex,
  type MealType,
  type Micro,
  type MicroValues,
  type Plan,
  type Recipe,
  type RecipeIndex,
} from './types';

// ---------------------------------------------------------------------------
// Daily needs
// ---------------------------------------------------------------------------

/**
 * Daily needs by sex and age: the US National Academies' dietary reference
 * intakes (RDA, or AI where there is no RDA), the same figures the NIH Office
 * of Dietary Supplements publishes. Fibre follows their rule of 14 g per
 * 1000 kcal, so it scales with each person's calories.
 * A guide for healthy people, not a prescription.
 */
export function microNorms(p: Pick<Body, 'sex' | 'age'>, kcal: number): MicroValues {
  const m = p.sex === 'male';
  const a = p.age;
  const band = a < 14 ? 'child' : a < 19 ? 'teen' : a < 31 ? 'young' : a < 51 ? 'adult' : a < 71 ? 'older' : 'old';
  const kid = band === 'child';
  const teen = band === 'teen';
  return {
    fiber: Math.round((kcal / 1000) * 14),
    vitC: kid ? 45 : teen ? (m ? 75 : 65) : m ? 90 : 75,
    vitA: kid ? 600 : m ? 900 : 700,
    vitD: band === 'old' ? 20 : 15,
    b12: kid ? 1.8 : 2.4,
    folate: kid ? 300 : 400,
    calcium: kid || teen ? 1300 : band === 'old' || (!m && band === 'older') ? 1200 : 1000,
    iron: kid ? 8 : teen ? (m ? 11 : 15) : m ? 8 : band === 'young' || band === 'adult' ? 18 : 8,
    magnesium: kid ? 240 : teen ? (m ? 410 : 360) : band === 'young' ? (m ? 400 : 310) : m ? 420 : 320,
    potassium: kid ? (m ? 2500 : 2300) : teen ? (m ? 3000 : 2300) : m ? 3400 : 2600,
    zinc: kid ? 8 : teen ? (m ? 11 : 9) : m ? 11 : 8,
  };
}

/**
 * Nutrients the week is not tuned for. Vitamin D comes mostly from sunlight
 * and supplements; food alone rarely covers it, so chasing it would only
 * push the same few fish dishes. It is still shown.
 */
export const NOT_PLANNED: ReadonlySet<Micro> = new Set<Micro>(['vitD']);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export function zeroMicro(): MicroValues {
  return Object.fromEntries(MICRO_KEYS.map((k) => [k, 0])) as MicroValues;
}

export interface RecipeMicro {
  /** Per serving. */
  values: MicroValues;
  /** Grams of vegetables per serving. */
  vegGrams: number;
  /** Some ingredients have no vitamin data (usually the person's own foods). */
  incomplete: boolean;
}

export function recipeMicro(recipe: Recipe, foods: FoodIndex): RecipeMicro {
  const values = zeroMicro();
  let vegGrams = 0;
  let incomplete = false;
  const k = 1 / Math.max(1, recipe.servings);
  for (const ing of recipe.ingredients) {
    const food = foods.get(ing.food);
    if (!food) continue;
    const g = ingredientGrams(food, ing) * k;
    if (food.veg) vegGrams += g;
    if (!food.micro) {
      if (g > 5) incomplete = true;
      continue;
    }
    for (const key of MICRO_KEYS) values[key] += ((food.micro[key] ?? 0) * g) / 100;
  }
  return { values, vegGrams, incomplete };
}

// ---------------------------------------------------------------------------
// "Protein and vegetables in every meal"
// ---------------------------------------------------------------------------

/** Main meals the rule applies to; snacks are free. */
export const BALANCED_MEALS: ReadonlySet<MealType> = new Set<MealType>(['breakfast', 'lunch', 'dinner']);
/** Grams of protein in one meal (at the planned portion) that count as "has protein". */
export const MEAL_PROTEIN_MIN: Record<MealType, number> = { breakfast: 12, lunch: 15, dinner: 15, snack: 0 };
/** Grams of vegetables in one meal that count as "has vegetables". */
export const MEAL_VEG_MIN = 40;

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

/**
 * What the plan provides over the week, at the first person's portions.
 * Multiply by a person's share to get their intake.
 */
export function weekMicro(plan: Plan, recipes: RecipeIndex, foods: FoodIndex, cache = new Map<string, RecipeMicro>()): {
  total: MicroValues;
  incomplete: boolean;
} {
  const total = zeroMicro();
  let incomplete = false;
  for (const day of plan.days) {
    for (const meal of Object.values(day)) {
      const recipe = meal && recipes.get(meal.recipeId);
      if (!meal || !recipe) continue;
      let rm = cache.get(recipe.id);
      if (!rm) {
        rm = recipeMicro(recipe, foods);
        cache.set(recipe.id, rm);
      }
      if (rm.incomplete) incomplete = true;
      for (const k of MICRO_KEYS) total[k] += rm.values[k] * meal.portions;
    }
  }
  return { total, incomplete };
}

/** Share of the weekly need covered, per nutrient (1 = 100 %). */
export function coverage(weekTotal: MicroValues, share: number, daily: MicroValues, days = 7): MicroValues {
  const out = zeroMicro();
  for (const k of MICRO_KEYS) out[k] = daily[k] > 0 ? (weekTotal[k] * share) / (daily[k] * days) : 1;
  return out;
}
