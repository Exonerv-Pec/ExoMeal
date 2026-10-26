import type { MealType, Recipe, Unit } from '../../core/types';

/** [food id, amount, unit (default grams)] */
export type Row = [food: string, qty: number, unit?: Unit];

export function recipe(
  id: string,
  title: string,
  meals: MealType[],
  servings: number,
  time: number,
  rows: Row[],
  steps: string[],
  note?: string,
): Recipe {
  return {
    id,
    title,
    meals,
    servings,
    time,
    ingredients: rows.map(([food, qty, unit]) => ({ food, qty, unit: unit ?? 'g' })),
    steps,
    ...(note ? { note } : {}),
  };
}
