import type { FoodIndex, Nutrition, Profile, Recipe, Targets } from './types';
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

const GOAL_FACTOR = { lose: 0.85, maintain: 1, gain: 1.1 } as const;

/** Never suggest less than this, whatever the goal. */
const FLOOR = { female: 1200, male: 1500 } as const;

/**
 * Mifflin–St Jeor estimate. This is a rough guide for healthy adults, not
 * medical advice; the UI says so and the numbers can be overridden.
 */
export function calcTargets(p: Profile): Targets {
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

  let kcal = Math.round((tdee * GOAL_FACTOR[goal]) / 10) * 10;
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

  // Protein by body weight, fat 30 % of calories, the rest carbohydrates.
  const proteinPerKg = p.goal === 'maintain' ? 1.4 : 1.6;
  const protein = Math.round(Math.min(p.weightKg * proteinPerKg, (kcal * 0.35) / 4));
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { kcal, protein, fat, carbs, bmr: Math.round(bmr), tdee: Math.round(tdee), warnings };
}
