import { MAX_PEOPLE, type Food, type Person, type Plan, type Profile, type Recipe } from './types';

export const STORAGE_KEY = 'exomeal:v1';

export interface SavedState {
  version: 1;
  profile: Profile;
  plan: Plan;
  customRecipes: Recipe[];
  customFoods: Food[];
  /** Shopping list ticks: food id → bought. */
  checked: Record<string, boolean>;
}

export function defaultPerson(id = 'p1', name = 'Я'): Person {
  return {
    id,
    name,
    sex: 'female',
    age: 30,
    heightCm: 168,
    weightKg: 65,
    activity: 'light',
    goal: 'maintain',
    kcalOverride: null,
  };
}

export function defaultProfile(): Profile {
  return {
    people: [defaultPerson()],
    diet: 'omnivore',
    exclusions: [],
    excludedFoods: [],
    hiddenRecipes: [],
    meals: ['breakfast', 'lunch', 'dinner', 'snack'],
    maxTime: null,
    cookForTwoDays: false,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Accepts anything that came out of localStorage or a backup file and returns
 * a safe state. Unknown or broken parts fall back to defaults.
 */
export function parseState(raw: unknown): SavedState {
  const base = defaultProfile();
  const o = isObject(raw) ? raw : {};
  const p = isObject(o.profile) ? o.profile : {};
  const num = (v: unknown, d: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
  const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T =>
    typeof v === 'string' && (all as readonly string[]).includes(v) ? (v as T) : d;
  const list = <T extends string>(v: unknown, all: readonly T[]): T[] =>
    Array.isArray(v) ? v.filter((x): x is T => typeof x === 'string' && (all as readonly string[]).includes(x)) : [];

  const person = (raw: Record<string, unknown>, i: number): Person => {
    const d = defaultPerson();
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) : '';
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : `p${i + 1}`,
      name: name || (i === 0 ? 'Я' : `Человек ${i + 1}`),
      sex: oneOf(raw.sex, ['female', 'male'] as const, d.sex),
      age: num(raw.age, d.age, 10, 100),
      heightCm: num(raw.heightCm, d.heightCm, 100, 230),
      weightKg: num(raw.weightKg, d.weightKg, 30, 300),
      activity: oneOf(raw.activity, ['sedentary', 'light', 'moderate', 'high', 'athlete'] as const, d.activity),
      goal: oneOf(raw.goal, ['lose', 'maintain', 'gain'] as const, d.goal),
      kcalOverride: typeof raw.kcalOverride === 'number' && raw.kcalOverride > 0 ? raw.kcalOverride : null,
    };
  };

  // Before households existed, the body fields sat on the profile itself:
  // that profile becomes the first person.
  const rawPeople = Array.isArray(p.people) ? p.people.filter(isObject) : [p];
  const people = (rawPeople.length ? rawPeople : [{}]).slice(0, MAX_PEOPLE).map(person);
  const seen = new Set<string>();
  for (const x of people) {
    while (seen.has(x.id)) x.id += '-2';
    seen.add(x.id);
  }

  const profile: Profile = {
    people,
    diet: oneOf(p.diet, ['omnivore', 'pescatarian', 'vegetarian', 'vegan'] as const, base.diet),
    exclusions: list(p.exclusions, ['gluten', 'dairy', 'egg', 'nuts', 'peanut', 'fish', 'shellfish', 'soy', 'sesame'] as const),
    excludedFoods: Array.isArray(p.excludedFoods) ? p.excludedFoods.filter((x): x is string => typeof x === 'string') : [],
    hiddenRecipes: Array.isArray(p.hiddenRecipes) ? p.hiddenRecipes.filter((x): x is string => typeof x === 'string') : [],
    meals: list(p.meals, ['breakfast', 'lunch', 'dinner', 'snack'] as const),
    maxTime: typeof p.maxTime === 'number' && p.maxTime > 0 ? p.maxTime : null,
    cookForTwoDays: p.cookForTwoDays === true,
  };
  if (profile.meals.length === 0) profile.meals = base.meals;

  const plan: Plan =
    isObject(o.plan) && Array.isArray(o.plan.days) && o.plan.days.length === 7
      ? (o.plan as unknown as Plan)
      : { seed: 0, days: Array.from({ length: 7 }, () => ({})) };

  return {
    version: 1,
    profile,
    plan,
    customRecipes: Array.isArray(o.customRecipes) ? (o.customRecipes as Recipe[]).filter((r) => isObject(r) && typeof r.id === 'string') : [],
    customFoods: Array.isArray(o.customFoods) ? (o.customFoods as Food[]).filter((f) => isObject(f) && typeof f.id === 'string') : [],
    checked: isObject(o.checked) ? (o.checked as Record<string, boolean>) : {},
  };
}

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): SavedState {
  try {
    const text = storage.getItem(STORAGE_KEY);
    return parseState(text ? JSON.parse(text) : null);
  } catch {
    return parseState(null);
  }
}

export function saveState(state: SavedState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working, it just will not remember.
  }
}
