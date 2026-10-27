import type { FoodIndex, Recipe } from '../core/types';
import { FOODS } from './foods';
import { MICRO } from './micro';
import { BREAKFASTS } from './recipes/breakfasts';
import { BREAKFASTS_MORE } from './recipes/breakfasts-more';
import { CLASSICS } from './recipes/classics';
import { FISH_VEG } from './recipes/fish-veg';
import { MAINS } from './recipes/mains';
import { POULTRY_MEAT } from './recipes/poultry-meat';
import { SNACKS } from './recipes/snacks';
import { SNACKS_MORE } from './recipes/snacks-more';
import { SOUPS_SALADS } from './recipes/soups-salads';

for (const food of FOODS) if (MICRO[food.id]) food.micro = MICRO[food.id];

export { FOODS };
export const BUILTIN_RECIPES: Recipe[] = [
  ...BREAKFASTS,
  ...BREAKFASTS_MORE,
  ...MAINS,
  ...SOUPS_SALADS,
  ...POULTRY_MEAT,
  ...FISH_VEG,
  ...CLASSICS,
  ...SNACKS,
  ...SNACKS_MORE,
];
export const BUILTIN_FOOD_INDEX: FoodIndex = new Map(FOODS.map((f) => [f.id, f]));
