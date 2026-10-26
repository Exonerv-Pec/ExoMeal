import type { FoodIndex, Recipe } from '../core/types';
import { FOODS } from './foods';
import { BREAKFASTS } from './recipes/breakfasts';
import { MAINS } from './recipes/mains';
import { SNACKS } from './recipes/snacks';

export { FOODS };
export const BUILTIN_RECIPES: Recipe[] = [...BREAKFASTS, ...MAINS, ...SNACKS];
export const BUILTIN_FOOD_INDEX: FoodIndex = new Map(FOODS.map((f) => [f.id, f]));
