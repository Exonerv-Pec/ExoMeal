import { describe, expect, it } from 'vitest';
import { isAllowed, recipeTags } from '../src/core/diet';
import { calcTargets, recipePerServing } from '../src/core/nutrition';
import {
  DAYS,
  dayNutrition,
  emptyPlan,
  emptySlots,
  generatePlan,
  makeCtx,
  placeRecipe,
  rerollSlot,
} from '../src/core/planner';
import { makeRng } from '../src/core/rng';
import { buildPrepList, buildShoppingList, groupShoppingList, indexRecipes, shoppingToText } from '../src/core/shopping';
import { defaultProfile, loadState, parseState, saveState, STORAGE_KEY } from '../src/core/storage';
import type { Food, FoodIndex, Plan, Profile, Recipe } from '../src/core/types';
import { fmtIngredient, shoppingLabel, toGrams } from '../src/core/units';
import { BUILTIN_FOOD_INDEX as foods, BUILTIN_RECIPES as recipes } from '../src/data';

// ---------------------------------------------------------------------------
describe('units', () => {
  const milk: Food = { id: 'm', name: 'Молоко', category: 'dairy', kcal: 52, protein: 3, fat: 2, carbs: 5, density: 1.03, shop: 'ml' };
  const egg: Food = { id: 'e', name: 'Яйца', category: 'dairy', kcal: 143, protein: 12, fat: 9, carbs: 1, gPerPiece: 55, shop: 'pcs' };
  const flour: Food = { id: 'f', name: 'Мука', category: 'grains', kcal: 364, protein: 10, fat: 1, carbs: 76, density: 0.55 };

  it('converts units to grams', () => {
    expect(toGrams(milk, 200, 'ml')).toBeCloseTo(206);
    expect(toGrams(egg, 3, 'pcs')).toBe(165);
    expect(toGrams(flour, 2, 'tbsp')).toBeCloseTo(16.5);
    expect(toGrams(flour, 1, 'tsp')).toBeCloseTo(2.75);
    expect(() => toGrams(flour, 1, 'pcs')).toThrow();
  });

  it('formats shopping amounts the way people buy them', () => {
    expect(shoppingLabel(egg, 330)).toBe('6 шт');
    expect(shoppingLabel(egg, 60)).toBe('2 шт'); // 1.09 pieces: you cannot buy 1.09 eggs
    expect(shoppingLabel(milk, 515)).toBe('500 мл');
    expect(shoppingLabel(flour, 1234)).toBe('1,24 кг');
    expect(shoppingLabel(flour, 42)).toBe('45 г');
  });

  it('formats recipe amounts with a decimal comma', () => {
    expect(fmtIngredient(1.5, 'tbsp')).toBe('1,5 ст. л.');
    expect(fmtIngredient(0.25, 'tsp')).toBe('0,25 ч. л.');
    expect(fmtIngredient(333, 'g')).toBe('335 г');
  });
});

// ---------------------------------------------------------------------------
describe('targets', () => {
  const base: Profile = { ...defaultProfile(), sex: 'female', age: 30, heightCm: 168, weightKg: 65, activity: 'light', goal: 'maintain' };

  it('uses the Mifflin–St Jeor formula', () => {
    const t = calcTargets(base);
    expect(t.bmr).toBe(1389);
    expect(t.tdee).toBe(1910);
    expect(t.kcal).toBe(1910);
    expect(calcTargets({ ...base, sex: 'male' }).bmr).toBe(1389 + 166);
  });

  it('applies the goal and keeps macros consistent with the calories', () => {
    const lose = calcTargets({ ...base, goal: 'lose' });
    expect(lose.kcal).toBeLessThan(1910);
    expect(lose.kcal).toBeGreaterThanOrEqual(1200);
    const gain = calcTargets({ ...base, goal: 'gain' });
    expect(gain.kcal).toBeGreaterThan(1910);
    for (const t of [lose, gain]) {
      const sum = t.protein * 4 + t.fat * 9 + t.carbs * 4;
      expect(Math.abs(sum - t.kcal)).toBeLessThan(30);
    }
  });

  it('never goes below a safe minimum and says so', () => {
    const t = calcTargets({ ...base, kcalOverride: 800 });
    expect(t.kcal).toBe(1200);
    expect(t.warnings.length).toBeGreaterThan(0);
  });

  it('does not build a deficit for teenagers', () => {
    const teen = calcTargets({ ...base, age: 15, goal: 'lose' });
    const same = calcTargets({ ...base, age: 15, goal: 'maintain' });
    expect(teen.kcal).toBe(same.kcal);
    expect(teen.warnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe('planner', () => {
  const profile = defaultProfile();
  const targets = calcTargets(profile);
  const idx = indexRecipes(recipes);

  it('is deterministic for a seed', () => {
    const a = generatePlan(profile, targets, recipes, foods, { seed: 42 });
    const b = generatePlan(profile, targets, recipes, foods, { seed: 42 });
    expect(a).toEqual(b);
    const c = generatePlan(profile, targets, recipes, foods, { seed: 43 });
    expect(c).not.toEqual(a);
  });

  it('fills every meal of every day', () => {
    const plan = generatePlan(profile, targets, recipes, foods, { seed: 1 });
    expect(plan.days).toHaveLength(DAYS);
    for (const day of plan.days) {
      for (const slot of profile.meals) {
        const m = day[slot];
        expect(m, slot).toBeDefined();
        expect(idx.has(m!.recipeId)).toBe(true);
        expect(idx.get(m!.recipeId)!.meals).toContain(slot);
        expect(m!.portions).toBeGreaterThanOrEqual(0.5);
        expect(m!.portions).toBeLessThanOrEqual(2);
      }
    }
  });

  it('keeps every day close to the calorie target', () => {
    const ctx = makeCtx(profile, targets, recipes, foods);
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const plan = generatePlan(profile, targets, recipes, foods, { seed });
      for (const day of plan.days) {
        const kcal = dayNutrition(ctx, day).kcal;
        expect(Math.abs(kcal - targets.kcal) / targets.kcal, `seed ${seed}`).toBeLessThan(0.12);
      }
    }
  });

  it('reaches the protein target on average', () => {
    const ctx = makeCtx(profile, targets, recipes, foods);
    const plan = generatePlan(profile, targets, recipes, foods, { seed: 7 });
    const avg = plan.days.reduce((s, d) => s + dayNutrition(ctx, d).protein, 0) / DAYS;
    expect(avg).toBeGreaterThan(targets.protein * 0.8);
  });

  it('does not repeat a dish too often', () => {
    const plan = generatePlan(profile, targets, recipes, foods, { seed: 11 });
    const counts = new Map<string, number>();
    for (const day of plan.days) for (const m of Object.values(day)) counts.set(m!.recipeId, (counts.get(m!.recipeId) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('obeys diets and exclusions', () => {
    const vegan: Profile = { ...profile, diet: 'vegan', exclusions: ['gluten'] };
    const plan = generatePlan(vegan, calcTargets(vegan), recipes, foods, { seed: 5 });
    for (const day of plan.days) {
      for (const m of Object.values(day)) {
        const tags = recipeTags(idx.get(m!.recipeId)!, foods);
        expect(tags).toContain('vegan');
        expect(tags).toContain('gluten-free');
      }
    }
  });

  it('respects excluded foods and the time limit', () => {
    const p: Profile = { ...profile, excludedFoods: ['chicken-breast', 'salmon'], maxTime: 30 };
    const plan = generatePlan(p, calcTargets(p), recipes, foods, { seed: 9 });
    for (const day of plan.days) {
      for (const m of Object.values(day)) {
        const r = idx.get(m!.recipeId)!;
        expect(isAllowed(r, p, foods), r.id).toBe(true);
        expect(r.time).toBeLessThanOrEqual(30);
      }
    }
  });

  it('never picks a hidden recipe, for the week or for a reroll', () => {
    const base = generatePlan(profile, targets, recipes, foods, { seed: 5 });
    const used = new Set(base.days.flatMap((d) => Object.values(d).map((m) => m!.recipeId)));
    const p: Profile = { ...profile, hiddenRecipes: [...used] };
    const plan = generatePlan(p, calcTargets(p), recipes, foods, { seed: 5 });
    for (const day of plan.days) for (const m of Object.values(day)) expect(used.has(m!.recipeId)).toBe(false);
    const again = rerollSlot(plan, 0, 'lunch', p, calcTargets(p), recipes, foods, makeRng(77));
    expect(used.has(again.days[0].lunch!.recipeId)).toBe(false);
  });

  it('still lets a hidden recipe be placed by hand', () => {
    const p: Profile = { ...profile, hiddenRecipes: ['tofu-scramble'] };
    expect(isAllowed(idx.get('tofu-scramble')!, p, foods)).toBe(false);
    const plan = placeRecipe(emptyPlan(), 0, 'breakfast', 'tofu-scramble', p, calcTargets(p), recipes, foods);
    expect(plan.days[0].breakfast?.recipeId).toBe('tofu-scramble');
  });

  it('supports three meals a day', () => {
    const p: Profile = { ...profile, meals: ['breakfast', 'lunch', 'dinner'] };
    const plan = generatePlan(p, calcTargets(p), recipes, foods, { seed: 3 });
    for (const day of plan.days) expect(Object.keys(day).sort()).toEqual(['breakfast', 'dinner', 'lunch']);
  });

  it('cooks lunch and dinner once for two days when asked', () => {
    const p: Profile = { ...profile, cookForTwoDays: true };
    const plan = generatePlan(p, calcTargets(p), recipes, foods, { seed: 21 });
    for (const d of [1, 3, 5]) {
      expect(plan.days[d].lunch!.recipeId).toBe(plan.days[d - 1].lunch!.recipeId);
      expect(plan.days[d].dinner!.recipeId).toBe(plan.days[d - 1].dinner!.recipeId);
    }
  });

  it('keeps locked meals when the week is regenerated', () => {
    const first = generatePlan(profile, targets, recipes, foods, { seed: 1 });
    first.days[2].dinner = { ...first.days[2].dinner!, locked: true };
    first.days[4].breakfast = { ...first.days[4].breakfast!, locked: true };
    const second = generatePlan(profile, targets, recipes, foods, { seed: 2, base: first });
    expect(second.days[2].dinner).toEqual(first.days[2].dinner);
    expect(second.days[4].breakfast).toEqual(first.days[4].breakfast);
    expect(second).not.toEqual(first);
  });

  it('rerolls a single meal and leaves the rest alone', () => {
    const plan = generatePlan(profile, targets, recipes, foods, { seed: 1 });
    const before = JSON.stringify(plan);
    const next = rerollSlot(plan, 3, 'lunch', profile, targets, recipes, foods, makeRng(5));
    expect(next.days[3].lunch!.recipeId).not.toBe(plan.days[3].lunch!.recipeId);
    expect(next.days[3].dinner).toEqual(plan.days[3].dinner);
    expect(next.days[0]).toEqual(plan.days[0]);
    expect(JSON.stringify(plan)).toBe(before); // the input plan is not mutated
  });

  it('places a chosen recipe with sensible portions', () => {
    const plan = emptyPlan();
    const next = placeRecipe(plan, 0, 'dinner', 'salmon-potato-broccoli', profile, targets, recipes, foods);
    const m = next.days[0].dinner!;
    expect(m.recipeId).toBe('salmon-potato-broccoli');
    expect(m.portions).toBeGreaterThanOrEqual(0.5);
    expect(m.portions).toBeLessThanOrEqual(2);
    expect(plan.days[0].dinner).toBeUndefined();
  });

  it('reports meals that have no recipe for the profile', () => {
    const impossible: Profile = { ...profile, diet: 'vegan', exclusions: ['gluten', 'soy', 'nuts', 'peanut', 'sesame'], maxTime: 5 };
    expect(emptySlots(impossible, recipes, foods).length).toBeGreaterThan(0);
    expect(emptySlots(profile, recipes, foods)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('shopping list', () => {
  const miniFoods: FoodIndex = new Map<string, Food>([
    ['chicken', { id: 'chicken', name: 'Курица', category: 'meat', kcal: 120, protein: 22, fat: 3, carbs: 0 }],
    ['onion', { id: 'onion', name: 'Лук', category: 'produce', kcal: 40, protein: 1, fat: 0, carbs: 9, gPerPiece: 90, shop: 'pcs' }],
    ['salt', { id: 'salt', name: 'Соль', category: 'spices', kcal: 0, protein: 0, fat: 0, carbs: 0, density: 1.2, staple: true }],
  ]);
  const a: Recipe = {
    id: 'a',
    title: 'Блюдо А',
    meals: ['lunch'],
    servings: 2,
    time: 10,
    ingredients: [
      { food: 'chicken', qty: 200, unit: 'g' },
      { food: 'onion', qty: 1, unit: 'pcs' },
      { food: 'salt', qty: 1, unit: 'tsp' },
    ],
    steps: ['x'],
  };
  const b: Recipe = { ...a, id: 'b', title: 'Блюдо Б', ingredients: [{ food: 'chicken', qty: 100, unit: 'g' }, { food: 'onion', qty: 1, unit: 'pcs' }] };
  const idx = indexRecipes([a, b]);

  const plan: Plan = {
    seed: 0,
    days: [
      { lunch: { recipeId: 'a', portions: 1 } }, // half of recipe A: 100 g chicken, 0.5 onion
      { lunch: { recipeId: 'a', portions: 2 } }, // all of recipe A: 200 g chicken, 1 onion
      { dinner: { recipeId: 'b', portions: 2 } }, // 2 of 2 servings of B (servings 2): 100 g, 1 onion
      {}, {}, {}, {},
    ],
  };

  it('scales by portions and merges the same product', () => {
    const list = buildShoppingList(plan, idx, miniFoods);
    const chicken = list.find((i) => i.foodId === 'chicken')!;
    // A: (1+2)/2 × 200 = 300 g; B: 2/2 × 100 = 100 g
    expect(chicken.grams).toBeCloseTo(400);
    expect(chicken.label).toBe('400 г');
    expect(chicken.usedIn).toEqual(['Блюдо А', 'Блюдо Б']);
    // onion: 1.5 × 1 + 1 × 1 = 2.5 pieces → 3
    expect(list.find((i) => i.foodId === 'onion')!.label).toBe('3 шт');
  });

  it('puts staples in their own group and the list order is stable', () => {
    const list = buildShoppingList(plan, idx, miniFoods);
    const { buy, staples } = groupShoppingList(list);
    expect(staples.map((s) => s.foodId)).toEqual(['salt']);
    expect(buy.map((g) => g.category)).toEqual(['produce', 'meat']);
    const reversed: Plan = { ...plan, days: [...plan.days].reverse() };
    expect(buildShoppingList(reversed, idx, miniFoods).map((i) => i.foodId)).toEqual(list.map((i) => i.foodId));
    expect(shoppingToText(list)).toContain('- Курица — 400 г');
  });

  it('ignores recipes that no longer exist', () => {
    const broken: Plan = { seed: 0, days: [{ lunch: { recipeId: 'gone', portions: 1 } }, {}, {}, {}, {}, {}, {}] };
    expect(buildShoppingList(broken, idx, miniFoods)).toEqual([]);
  });

  it('works for a real generated week', () => {
    const profile = defaultProfile();
    const plan = generatePlan(profile, calcTargets(profile), recipes, foods, { seed: 8 });
    const list = buildShoppingList(plan, indexRecipes(recipes), foods);
    expect(list.length).toBeGreaterThan(15);
    for (const item of list) {
      expect(item.grams).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/NaN|undefined/);
    }
  });

  it('builds cooking batches', () => {
    const batches = buildPrepList(plan, idx);
    expect(batches.map((x) => x.recipe.id)).toEqual(['a', 'b']);
    expect(batches[0].portions).toBe(3);
    expect(batches[0].uses).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
describe('storage', () => {
  it('survives garbage', () => {
    const s = parseState({ profile: { age: 'x', diet: 'carnivore', meals: [] }, plan: 5 });
    expect(s.profile.diet).toBe('omnivore');
    expect(s.profile.meals.length).toBeGreaterThan(0);
    expect(s.plan.days).toHaveLength(7);
    expect(parseState(null).customRecipes).toEqual([]);
  });

  it('keeps hidden recipes and repairs a bad list', () => {
    expect(parseState(null).profile.hiddenRecipes).toEqual([]);
    expect(parseState({ profile: { hiddenRecipes: 'x' } }).profile.hiddenRecipes).toEqual([]);
    expect(parseState({ profile: { hiddenRecipes: ['a', 3, 'b'] } }).profile.hiddenRecipes).toEqual(['a', 'b']);
  });

  it('clamps unrealistic numbers', () => {
    const s = parseState({ profile: { age: 500, weightKg: -3, heightCm: 20 } });
    expect(s.profile.age).toBe(100);
    expect(s.profile.weightKg).toBe(30);
    expect(s.profile.heightCm).toBe(100);
  });

  it('round-trips through a storage object', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const state = parseState(null);
    state.profile.diet = 'vegan';
    state.checked = { tomato: true };
    saveState(state, storage);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    const back = loadState(storage);
    expect(back.profile.diet).toBe('vegan');
    expect(back.checked).toEqual({ tomato: true });
  });

  it('falls back to defaults on broken JSON', () => {
    const storage = { getItem: () => '{not json' };
    expect(loadState(storage).profile.diet).toBe('omnivore');
  });
});

// ---------------------------------------------------------------------------
describe('recipe nutrition', () => {
  it('divides the total by servings', () => {
    const r = recipes.find((x) => x.id === 'baked-syrniki')!;
    const per = recipePerServing(r, foods);
    expect(per.kcal).toBeGreaterThan(300);
    expect(per.kcal).toBeLessThan(500);
  });
});
