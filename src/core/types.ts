// Core domain types. Pure TypeScript: no UI, no browser APIs.

export type Unit = 'g' | 'ml' | 'pcs' | 'tbsp' | 'tsp';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** What a food contains. Used to derive diets and allergen filters automatically. */
export type Flag =
  | 'meat'
  | 'fish'
  | 'shellfish'
  | 'egg'
  | 'dairy'
  | 'honey'
  | 'gluten'
  | 'nuts'
  | 'peanut'
  | 'soy'
  | 'sesame';

export type Category =
  | 'produce'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'grains'
  | 'bakery'
  | 'pantry'
  | 'oils'
  | 'nuts'
  | 'spices'
  | 'other';

export interface Food {
  id: string;
  name: string;
  category: Category;
  /** Per 100 g. */
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** Grams per millilitre (default 1). Needed for ml, tbsp and tsp. */
  density?: number;
  /** Grams per piece (needed for the `pcs` unit). */
  gPerPiece?: number;
  /** How the amount is shown in the shopping list (default g). */
  shop?: 'g' | 'ml' | 'pcs';
  /** Things most kitchens already have: shown in a separate "check at home" group. */
  staple?: boolean;
  flags?: Flag[];
  /** Added by the user. */
  custom?: boolean;
}

export type Ingredient = {
  food: string;
  qty: number;
  unit: Unit;
};

export interface Recipe {
  id: string;
  title: string;
  /** Meals the recipe fits. */
  meals: MealType[];
  /** How many servings the ingredient list makes. */
  servings: number;
  /** Total time in minutes. */
  time: number;
  ingredients: Ingredient[];
  steps: string[];
  /** Short hint such as "prepare the night before". */
  note?: string;
  custom?: boolean;
}

export type Diet = 'omnivore' | 'pescatarian' | 'vegetarian' | 'vegan';
export type Sex = 'female' | 'male';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete';
export type Goal = 'lose' | 'maintain' | 'gain';

/** Things a person may want to avoid on top of the diet. */
export type Exclusion = 'gluten' | 'dairy' | 'egg' | 'nuts' | 'peanut' | 'fish' | 'shellfish' | 'soy' | 'sesame';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  /** Overrides the calculated calories when set. */
  kcalOverride: number | null;
  diet: Diet;
  exclusions: Exclusion[];
  excludedFoods: string[];
  meals: MealType[];
  /** Skip recipes that take longer, in minutes. null = no limit. */
  maxTime: number | null;
  /** Cook lunch and dinner once for two days in a row. */
  cookForTwoDays: boolean;
}

export interface Targets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  bmr: number;
  tdee: number;
  warnings: string[];
}

export interface PlannedMeal {
  recipeId: string;
  /** Multiplier of one recipe serving (0.5 ... 2). */
  portions: number;
  /** Locked meals are kept when the week is regenerated. */
  locked?: boolean;
}

export type PlanDay = Partial<Record<MealType, PlannedMeal>>;

export interface Plan {
  seed: number;
  /** Always 7 days, Monday first. */
  days: PlanDay[];
}

export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export type FoodIndex = Map<string, Food>;
export type RecipeIndex = Map<string, Recipe>;

export interface ShoppingItem {
  foodId: string;
  name: string;
  category: Category;
  grams: number;
  /** Ready-to-show amount such as "1,2 кг" or "4 шт". */
  label: string;
  staple: boolean;
  /** Titles of the recipes that use it. */
  usedIn: string[];
}
