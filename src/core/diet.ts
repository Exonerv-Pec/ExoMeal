import type { Diet, Exclusion, Flag, FoodIndex, Profile, Recipe } from './types';

/** Flags a diet rules out. */
const DIET_BLOCKS: Record<Diet, Flag[]> = {
  omnivore: [],
  pescatarian: ['meat'],
  vegetarian: ['meat', 'fish', 'shellfish'],
  vegan: ['meat', 'fish', 'shellfish', 'egg', 'dairy', 'honey'],
};

/** Exclusion → flag it maps to. */
const EXCLUSION_FLAG: Record<Exclusion, Flag> = {
  gluten: 'gluten',
  dairy: 'dairy',
  egg: 'egg',
  nuts: 'nuts',
  peanut: 'peanut',
  fish: 'fish',
  shellfish: 'shellfish',
  soy: 'soy',
  sesame: 'sesame',
};

/** Every flag of every ingredient of a recipe. Unknown foods are ignored. */
export function recipeFlags(recipe: Recipe, foods: FoodIndex): Set<Flag> {
  const flags = new Set<Flag>();
  for (const ing of recipe.ingredients) {
    for (const f of foods.get(ing.food)?.flags ?? []) flags.add(f);
  }
  return flags;
}

export type DerivedTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'dairy-free';

/** Labels computed from the ingredients, so they cannot go out of sync. */
export function recipeTags(recipe: Recipe, foods: FoodIndex): DerivedTag[] {
  const flags = recipeFlags(recipe, foods);
  const tags: DerivedTag[] = [];
  const blocked = (diet: Diet) => DIET_BLOCKS[diet].some((f) => flags.has(f));
  if (!blocked('vegan')) tags.push('vegan');
  if (!blocked('vegetarian')) tags.push('vegetarian');
  if (!flags.has('gluten')) tags.push('gluten-free');
  if (!flags.has('dairy')) tags.push('dairy-free');
  return tags;
}

/** True when the profile lets this recipe into the plan. */
export function isAllowed(recipe: Recipe, profile: Profile, foods: FoodIndex): boolean {
  if (profile.hiddenRecipes?.includes(recipe.id)) return false;
  const flags = recipeFlags(recipe, foods);
  for (const f of DIET_BLOCKS[profile.diet]) if (flags.has(f)) return false;
  for (const e of profile.exclusions) if (flags.has(EXCLUSION_FLAG[e])) return false;
  if (profile.excludedFoods.length) {
    const banned = new Set(profile.excludedFoods);
    if (recipe.ingredients.some((i) => banned.has(i.food))) return false;
  }
  if (profile.maxTime != null && recipe.time > profile.maxTime) return false;
  return true;
}
