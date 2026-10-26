import type { Food, Ingredient, Unit } from './types';

const ML_PER_TBSP = 15;
const ML_PER_TSP = 5;

export class UnitError extends Error {}

/** Converts an amount of a food to grams. */
export function toGrams(food: Food, qty: number, unit: Unit): number {
  const density = food.density ?? 1;
  switch (unit) {
    case 'g':
      return qty;
    case 'ml':
      return qty * density;
    case 'tbsp':
      return qty * ML_PER_TBSP * density;
    case 'tsp':
      return qty * ML_PER_TSP * density;
    case 'pcs':
      if (!food.gPerPiece) throw new UnitError(`"${food.name}" has no weight per piece`);
      return qty * food.gPerPiece;
  }
}

export function ingredientGrams(food: Food, ing: Ingredient): number {
  return toGrams(food, ing.qty, ing.unit);
}

/** Russian decimal formatting: 1,5 (never 1.5), up to 2 digits, no trailing zeros. */
export function fmtNum(n: number, digits = 2): string {
  const rounded = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(rounded).replace('.', ',');
}

export const UNIT_LABEL: Record<Unit, string> = {
  g: 'г',
  ml: 'мл',
  pcs: 'шт',
  tbsp: 'ст. л.',
  tsp: 'ч. л.',
};

/** "1,5 ст. л." — used on recipe pages after scaling. */
export function fmtIngredient(qty: number, unit: Unit): string {
  if (unit === 'g' || unit === 'ml') {
    const v = qty >= 10 ? Math.round(qty / 5) * 5 : Math.round(qty * 10) / 10;
    return `${fmtNum(v, 1)} ${UNIT_LABEL[unit]}`;
  }
  // Spoons and pieces: quarters are readable ("0,25"), more digits are not.
  const q = Math.round(qty * 4) / 4;
  return `${fmtNum(q === 0 ? qty : q)} ${UNIT_LABEL[unit]}`;
}

const EPS = 1e-9;

/** Rounds a shopping amount up to something you can actually buy. */
function ceilTo(n: number, step: number): number {
  return Math.ceil(n / step - EPS) * step;
}

/** Shopping-list label: pieces for countable foods, ml for liquids, g/kg otherwise. */
export function shoppingLabel(food: Food, grams: number): string {
  const mode = food.shop ?? 'g';
  if (mode === 'pcs' && food.gPerPiece) {
    const pieces = Math.ceil(grams / food.gPerPiece - 0.05);
    return `${Math.max(1, pieces)} шт`;
  }
  if (mode === 'ml') {
    const ml = grams / (food.density ?? 1);
    const rounded = ml < 100 ? ceilTo(ml, 5) : ceilTo(ml, 10);
    return rounded >= 1000 ? `${fmtNum(rounded / 1000, 2)} л` : `${rounded} мл`;
  }
  const rounded = grams < 100 ? ceilTo(grams, 5) : ceilTo(grams, 10);
  return rounded >= 1000 ? `${fmtNum(rounded / 1000, 2)} кг` : `${rounded} г`;
}
