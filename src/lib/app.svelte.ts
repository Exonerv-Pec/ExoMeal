import { coverage, microNorms, weekMicro } from '../core/micro';
import { calcHousehold } from '../core/nutrition';
import {
  clonePlan,
  emptyPlan,
  emptySlots,
  generatePlan,
  placeRecipe,
  rerollSlot,
  MAX_PORTION,
  MIN_PORTION,
} from '../core/planner';
import { buildPrepList, buildShoppingList, indexRecipes } from '../core/shopping';
import { defaultPerson, defaultProfile, loadState, parseState, saveState, type SavedState } from '../core/storage';
import { MAX_PEOPLE, type Food, type FoodIndex, type MealType, type Plan, type Profile, type Recipe } from '../core/types';
import { BUILTIN_RECIPES, FOODS } from '../data';

export type Route = 'plan' | 'recipes' | 'shopping' | 'cook' | 'profile';
export const ROUTES: Route[] = ['plan', 'recipes', 'shopping', 'cook', 'profile'];

function routeFromHash(): Route {
  const name = location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(name) ? name : 'plan';
}

class AppState {
  profile = $state<Profile>(defaultProfile());
  plan = $state<Plan>(emptyPlan());
  customRecipes = $state<Recipe[]>([]);
  customFoods = $state<Food[]>([]);
  checked = $state<Record<string, boolean>>({});

  route = $state<Route>('plan');
  /** Recipe shown in the details window. */
  openRecipeId = $state<string | null>(null);
  /** Slot waiting for a recipe from the picker. */
  picking = $state<{ day: number; slot: MealType } | null>(null);
  /** Recipe being edited; "new" = a blank form. */
  editing = $state<Recipe | 'new' | null>(null);

  /** Profile with numbers kept inside sane bounds, even while a field is half-typed. */
  safeProfile = $derived(parseState({ profile: $state.snapshot(this.profile) }).profile);
  household = $derived(calcHousehold(this.safeProfile.people));
  /** The first person's targets: the menu is fitted to them, the others scale. */
  targets = $derived(this.household.ref);
  /** Whose portions and totals the week shows (index into people). Not saved. */
  viewPerson = $state(0);
  viewMember = $derived(this.household.members[Math.min(this.viewPerson, this.household.members.length - 1)]);
  /** Everyone's daily vitamin and mineral needs, with their portion share. */
  microGoals = $derived(this.household.members.map((m) => ({ share: m.share, norms: microNorms(m.person, m.targets.kcal) })));
  foods: FoodIndex = $derived(new Map([...FOODS, ...this.customFoods].map((f) => [f.id, f])));
  recipes = $derived([...BUILTIN_RECIPES, ...this.customRecipes]);
  recipeIndex = $derived(indexRecipes(this.recipes));
  shopping = $derived(buildShoppingList(this.plan, this.recipeIndex, this.foods, this.household.factor));
  prep = $derived(buildPrepList(this.plan, this.recipeIndex, this.household.factor));
  /** Different dishes in the week. */
  dishCount = $derived(new Set(this.plan.days.flatMap((d) => Object.values(d).map((m) => m?.recipeId))).size);
  hasPlan = $derived(this.plan.days.some((d) => Object.keys(d).length > 0));
  lockedCount = $derived(this.plan.days.reduce((n, d) => n + Object.values(d).filter((m) => m?.locked).length, 0));
  missingSlots = $derived(emptySlots(this.safeProfile, this.recipes, this.foods));
  hiddenSet = $derived(new Set(this.safeProfile.hiddenRecipes));
  /** Vitamins and minerals the week gives, at the first person's portions. */
  microWeek = $derived(weekMicro(this.plan, this.recipeIndex, this.foods));
  /** Weekly coverage for the person on screen (1 = 100 %). */
  viewNorms = $derived(microNorms(this.viewMember.person, this.viewMember.targets.kcal));
  viewCoverage = $derived(coverage(this.microWeek.total, this.viewMember.share, this.viewNorms));

  constructor() {
    if (typeof localStorage === 'undefined') return;
    this.apply(loadState());
    this.route = routeFromHash();
    window.addEventListener('hashchange', () => (this.route = routeFromHash()));

    $effect.root(() => {
      $effect(() => {
        saveState($state.snapshot(this.snapshot()) as SavedState);
      });
    });
  }

  private snapshot(): SavedState {
    return {
      version: 1,
      profile: this.profile,
      plan: this.plan,
      customRecipes: this.customRecipes,
      customFoods: this.customFoods,
      checked: this.checked,
    };
  }

  private apply(s: SavedState): void {
    this.profile = s.profile;
    this.plan = s.plan;
    this.customRecipes = s.customRecipes;
    this.customFoods = s.customFoods;
    this.checked = s.checked;
  }

  go(route: Route): void {
    location.hash = `#/${route}`;
  }

  // --- Week ---------------------------------------------------------------

  /** Builds a new week. Locked meals stay where they are. */
  generate(): void {
    this.plan = generatePlan(this.safeProfile, this.targets, this.recipes, this.foods, {
      base: this.hasPlan ? $state.snapshot(this.plan) as Plan : null,
      micro: $state.snapshot(this.microGoals),
    });
    this.checked = {};
  }

  unlockAll(): void {
    const next = clonePlan($state.snapshot(this.plan) as Plan);
    for (const d of next.days) for (const m of Object.values(d)) if (m) delete m.locked;
    this.plan = next;
  }

  toggleLock(day: number, slot: MealType): void {
    const m = this.plan.days[day][slot];
    if (m) m.locked = !m.locked;
  }

  setPortions(day: number, slot: MealType, portions: number): void {
    const m = this.plan.days[day][slot];
    if (m) m.portions = Math.min(MAX_PORTION, Math.max(MIN_PORTION, portions));
  }

  swap(day: number, slot: MealType): void {
    this.plan = rerollSlot(
      $state.snapshot(this.plan) as Plan,
      day,
      slot,
      this.safeProfile,
      this.targets,
      this.recipes,
      this.foods,
    );
  }

  remove(day: number, slot: MealType): void {
    delete this.plan.days[day][slot];
  }

  place(day: number, slot: MealType, recipeId: string): void {
    this.plan = placeRecipe(
      $state.snapshot(this.plan) as Plan,
      day,
      slot,
      recipeId,
      this.safeProfile,
      this.targets,
      this.recipes,
      this.foods,
    );
  }

  // --- Recipes and foods ------------------------------------------------------

  saveRecipe(recipe: Recipe): void {
    const i = this.customRecipes.findIndex((r) => r.id === recipe.id);
    if (i >= 0) this.customRecipes[i] = recipe;
    else this.customRecipes.push(recipe);
  }

  deleteRecipe(id: string): void {
    this.customRecipes = this.customRecipes.filter((r) => r.id !== id);
    this.profile.hiddenRecipes = this.profile.hiddenRecipes.filter((x) => x !== id);
    for (const day of this.plan.days) {
      for (const slot of Object.keys(day) as MealType[]) if (day[slot]?.recipeId === id) delete day[slot];
    }
  }

  // --- Household ------------------------------------------------------------

  /** Adds a person and returns their index, or -1 when the household is full. */
  addPerson(): number {
    const people = this.profile.people;
    if (people.length >= MAX_PEOPLE) return -1;
    let n = people.length + 1;
    const ids = new Set(people.map((x) => x.id));
    while (ids.has(`p${n}`)) n++;
    people.push(defaultPerson(`p${n}`, `Человек ${people.length + 1}`));
    return people.length - 1;
  }

  /** Removes a person. The first person stays: the menu is fitted to them. */
  removePerson(index: number): void {
    if (index <= 0 || index >= this.profile.people.length) return;
    this.profile.people.splice(index, 1);
    if (this.viewPerson >= this.profile.people.length) this.viewPerson = 0;
  }

  /** Hides a recipe from week generation, or brings it back. */
  toggleHidden(id: string): void {
    const list = this.profile.hiddenRecipes;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
  }

  addFood(food: Food): void {
    this.customFoods.push({ ...food, custom: true });
  }

  // --- Data ------------------------------------------------------------------

  exportJson(): string {
    return JSON.stringify($state.snapshot(this.snapshot()), null, 2);
  }

  importJson(text: string): void {
    this.apply(parseState(JSON.parse(text)));
  }

  resetAll(): void {
    this.apply(parseState(null));
  }

  // --- Shopping ticks ----------------------------------------------------------

  toggleChecked(key: string): void {
    this.checked[key] = !this.checked[key];
  }
}

export const app = new AppState();
