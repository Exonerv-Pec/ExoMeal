import type { FoodIndex, MealType, Plan, Recipe, RecipeIndex, ShoppingItem, Category } from './types';
import { MEAL_ORDER } from './types';
import { ingredientGrams, shoppingLabel } from './units';

export const CATEGORY_ORDER: Category[] = [
  'produce',
  'meat',
  'fish',
  'dairy',
  'grains',
  'bakery',
  'pantry',
  'nuts',
  'oils',
  'spices',
  'other',
];

export const CATEGORY_LABEL: Record<Category, string> = {
  produce: 'Овощи, фрукты, зелень',
  meat: 'Мясо и птица',
  fish: 'Рыба и морепродукты',
  dairy: 'Молочное и яйца',
  grains: 'Крупы и макароны',
  bakery: 'Хлеб',
  pantry: 'Консервы и бакалея',
  nuts: 'Орехи, семена, сухофрукты',
  oils: 'Масла и соусы',
  spices: 'Специи',
  other: 'Прочее',
};

export function indexRecipes(recipes: Recipe[]): RecipeIndex {
  return new Map(recipes.map((r) => [r.id, r]));
}

/**
 * Adds up the ingredients of every planned meal: portions / servings × amount.
 * The same product from several recipes becomes one line.
 */
export function buildShoppingList(plan: Plan, recipes: RecipeIndex, foods: FoodIndex): ShoppingItem[] {
  const grams = new Map<string, number>();
  const usedIn = new Map<string, Set<string>>();

  for (const day of plan.days) {
    for (const meal of Object.values(day)) {
      if (!meal) continue;
      const recipe = recipes.get(meal.recipeId);
      if (!recipe) continue;
      const k = meal.portions / Math.max(1, recipe.servings);
      for (const ing of recipe.ingredients) {
        const food = foods.get(ing.food);
        if (!food) continue;
        grams.set(food.id, (grams.get(food.id) ?? 0) + ingredientGrams(food, ing) * k);
        if (!usedIn.has(food.id)) usedIn.set(food.id, new Set());
        usedIn.get(food.id)!.add(recipe.title);
      }
    }
  }

  const items: ShoppingItem[] = [];
  for (const [id, g] of grams) {
    const food = foods.get(id)!;
    items.push({
      foodId: id,
      name: food.name,
      category: food.category,
      grams: g,
      label: shoppingLabel(food, g),
      staple: !!food.staple,
      usedIn: [...(usedIn.get(id) ?? [])].sort((a, b) => a.localeCompare(b, 'ru')),
    });
  }
  const rank = (c: Category) => CATEGORY_ORDER.indexOf(c);
  // Fixed order: category, then name. The list never reshuffles between renders.
  items.sort((a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name, 'ru'));
  return items;
}

export interface ShoppingGroup {
  category: Category;
  title: string;
  items: ShoppingItem[];
}

/** Groups the list by shop aisle; "check at home" staples go last as their own group. */
export function groupShoppingList(items: ShoppingItem[]): { buy: ShoppingGroup[]; staples: ShoppingItem[] } {
  const buy: ShoppingGroup[] = [];
  const staples: ShoppingItem[] = [];
  for (const item of items) {
    if (item.staple) {
      staples.push(item);
      continue;
    }
    let group = buy.find((g) => g.category === item.category);
    if (!group) {
      group = { category: item.category, title: CATEGORY_LABEL[item.category], items: [] };
      buy.push(group);
    }
    group.items.push(item);
  }
  return { buy, staples };
}

/** Plain text for copying into a notes app or messenger. */
export function shoppingToText(items: ShoppingItem[]): string {
  const { buy, staples } = groupShoppingList(items);
  const lines: string[] = ['Список покупок на неделю', ''];
  for (const g of buy) {
    lines.push(g.title.toUpperCase());
    for (const i of g.items) lines.push(`- ${i.name} — ${i.label}`);
    lines.push('');
  }
  if (staples.length) {
    lines.push('ПРОВЕРЬТЕ, ЕСТЬ ЛИ ДОМА');
    for (const i of staples) lines.push(`- ${i.name} — ${i.label}`);
  }
  return lines.join('\n').trim() + '\n';
}

// ---------------------------------------------------------------------------
// Cooking batches
// ---------------------------------------------------------------------------

export interface PrepUse {
  day: number;
  slot: MealType;
  portions: number;
}

export interface PrepBatch {
  recipe: Recipe;
  portions: number;
  uses: PrepUse[];
}

/**
 * What to cook for the week: one batch per recipe with the total number of
 * portions and the meals it is for. Batches are ordered by first use.
 */
export function buildPrepList(plan: Plan, recipes: RecipeIndex): PrepBatch[] {
  const batches = new Map<string, PrepBatch>();
  plan.days.forEach((day, d) => {
    for (const slot of MEAL_ORDER) {
      const meal = day[slot];
      const recipe = meal && recipes.get(meal.recipeId);
      if (!meal || !recipe) continue;
      let batch = batches.get(recipe.id);
      if (!batch) {
        batch = { recipe, portions: 0, uses: [] };
        batches.set(recipe.id, batch);
      }
      batch.portions += meal.portions;
      batch.uses.push({ day: d, slot, portions: meal.portions });
    }
  });
  return [...batches.values()];
}
