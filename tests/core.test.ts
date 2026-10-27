import { describe, expect, it } from 'vitest';
import { isAllowed, recipeTags } from '../src/core/diet';
import { BALANCED_MEALS, coverage, MEAL_PROTEIN_MIN, MEAL_VEG_MIN, microNorms, NOT_PLANNED, recipeMicro, weekMicro } from '../src/core/micro';
import { calcHousehold, calcTargets, clampSplit, recipePerServing } from '../src/core/nutrition';
import {
  DAYS,
  dayNutrition,
  emptyPlan,
  emptySlots,
  generatePlan,
  makeCtx,
  placeRecipe,
  rerollSlot,
  batchBlocks,
  clonePlan,
  cookGroup,
} from '../src/core/planner';
import { makeRng } from '../src/core/rng';
import { buildPrepList, buildShoppingList, groupShoppingList, indexRecipes, shoppingToText } from '../src/core/shopping';
import { defaultPerson, defaultProfile, loadState, parseState, saveState, STORAGE_KEY } from '../src/core/storage';
import { MICRO_KEYS, type Food, type FoodIndex, type MealType, type Person, type Plan, type Profile, type Recipe } from '../src/core/types';
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
  const base: Person = { ...defaultPerson(), sex: 'female', age: 30, heightCm: 168, weightKg: 65, activity: 'light', goal: 'maintain' };

  it('uses the Mifflin–St Jeor formula', () => {
    const t = calcTargets(base);
    expect(t.bmr).toBe(1389);
    expect(t.tdee).toBe(1910);
    expect(t.kcal).toBe(1910);
    expect(calcTargets({ ...base, sex: 'male' }).bmr).toBe(1389 + 166);
  });

  it('takes 500 kcal off to lose weight and adds 200 to gain', () => {
    expect(calcTargets({ ...base, goal: 'lose' }).kcal).toBe(1410);
    expect(calcTargets({ ...base, goal: 'gain' }).kcal).toBe(2110);
  });

  it('splits calories by the chosen preset', () => {
    const std = calcTargets(base);
    expect(std.fat).toBe(Math.round((1910 * 0.3) / 9));
    const m = calcTargets({ ...base, macros: { preset: 'mentzer', protein: 0, fat: 0 } });
    expect(m.split).toEqual({ protein: 25, fat: 15, carbs: 60 });
    expect(m.protein).toBe(Math.round((1910 * 0.25) / 4));
    expect(m.fat).toBe(Math.round((1910 * 0.15) / 9));
    const c = calcTargets({ ...base, macros: { preset: 'custom', protein: 30, fat: 25 } });
    expect(c.split).toEqual({ protein: 30, fat: 25, carbs: 45 });
    for (const t of [std, m, c]) expect(Math.abs(t.protein * 4 + t.fat * 9 + t.carbs * 4 - t.kcal)).toBeLessThan(10);
  });

  it('keeps a custom split inside safe limits', () => {
    expect(clampSplit({ protein: 60, fat: 5 })).toEqual({ protein: 40, fat: 15, carbs: 45 });
    expect(clampSplit({ protein: 40, fat: 45 })).toEqual({ protein: 40, fat: 40, carbs: 20 });
    expect(clampSplit({ protein: NaN, fat: 30 })).toEqual({ protein: 10, fat: 30, carbs: 60 });
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
describe('vitamins and minerals', () => {
  it('sets daily needs by sex and age', () => {
    const woman = microNorms({ sex: 'female', age: 30 }, 2000);
    const man = microNorms({ sex: 'male', age: 30 }, 2500);
    expect(woman.iron).toBe(18);
    expect(man.iron).toBe(8);
    expect(microNorms({ sex: 'female', age: 55 }, 1800).iron).toBe(8);
    expect(microNorms({ sex: 'male', age: 15 }, 2600).calcium).toBe(1300);
    expect(woman.fiber).toBe(28);
    expect(man.fiber).toBe(35);
    expect(man.vitC).toBeGreaterThan(woman.vitC);
  });

  it('sums a recipe per serving and counts vegetables', () => {
    const mini: FoodIndex = new Map([
      ['k', { id: 'k', name: 'Капуста', category: 'produce', kcal: 25, protein: 1, fat: 0, carbs: 5, veg: true, micro: { vitC: 40, calcium: 40 } }],
      ['x', { id: 'x', name: 'Своё', category: 'other', kcal: 100, protein: 0, fat: 0, carbs: 25 }],
    ]);
    const r: Recipe = { id: 'r', title: 'Т', meals: ['lunch'], servings: 2, time: 5, steps: ['.'], ingredients: [{ food: 'k', qty: 300, unit: 'g' }, { food: 'x', qty: 40, unit: 'g' }] };
    const m = recipeMicro(r, mini);
    expect(m.values.vitC).toBeCloseTo(60);
    expect(m.values.calcium).toBeCloseTo(60);
    expect(m.vegGrams).toBeCloseTo(150);
    expect(m.incomplete).toBe(true);
  });

  it('computes weekly coverage for a person by their share', () => {
    const idx = indexRecipes(recipes);
    const plan = generatePlan(defaultProfile(), calcTargets(defaultPerson()), recipes, foods, { seed: 6 });
    const { total } = weekMicro(plan, idx, foods);
    const norms = microNorms({ sex: 'female', age: 30 }, 1910);
    const full = coverage(total, 1, norms);
    const half = coverage(total, 0.5, norms);
    for (const k of MICRO_KEYS) expect(half[k]).toBeCloseTo(full[k] / 2);
    expect(full.vitC).toBeGreaterThan(1);
  });

  it('builds weeks that cover more of the weekly needs when asked', () => {
    const people = [defaultPerson(), { ...defaultPerson('b', 'Б'), sex: 'male' as const, age: 40 }];
    const profile: Profile = { ...defaultProfile(), people };
    const h = calcHousehold(people);
    const goals = h.members.map((m) => ({ share: m.share, norms: microNorms(m.person, m.targets.kcal) }));
    const idx = indexRecipes(recipes);
    const gap = (plan: Plan) => {
      const { total } = weekMicro(plan, idx, foods);
      let s = 0;
      for (const g of goals) {
        const c = coverage(total, g.share, g.norms);
        for (const k of MICRO_KEYS) if (!NOT_PLANNED.has(k)) s += (1 - Math.min(1, c[k])) ** 2;
      }
      return s;
    };
    let plain = 0;
    let tuned = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      plain += gap(generatePlan(profile, h.ref, recipes, foods, { seed }));
      tuned += gap(generatePlan(profile, h.ref, recipes, foods, { seed, micro: goals }));
    }
    expect(tuned).toBeLessThan(plain);
  });

  it('puts protein and vegetables in almost every main meal', () => {
    const profile = defaultProfile();
    const t = calcTargets(profile.people[0]);
    const ctx = makeCtx(profile, t, recipes, foods);
    const idx = indexRecipes(recipes);
    let main = 0;
    let ok = 0;
    for (const seed of [1, 2, 3]) {
      const plan = generatePlan(profile, t, recipes, foods, { seed });
      for (const day of plan.days) {
        for (const [slot, m] of Object.entries(day) as [MealType, { recipeId: string; portions: number }][]) {
          if (!BALANCED_MEALS.has(slot)) continue;
          main++;
          const protein = ctx.per.get(m.recipeId)!.protein * m.portions;
          const veg = recipeMicro(idx.get(m.recipeId)!, foods).vegGrams * m.portions;
          if (protein >= MEAL_PROTEIN_MIN[slot] && veg >= MEAL_VEG_MIN) ok++;
        }
      }
    }
    expect(ok / main).toBeGreaterThan(0.9);
  });
});

// ---------------------------------------------------------------------------
describe('household', () => {
  const adult: Person = { ...defaultPerson('a', 'Аня'), kcalOverride: 2000 };
  const partner: Person = { ...defaultPerson('b', 'Миша'), sex: 'male', kcalOverride: 2500 };
  const teen: Person = { ...defaultPerson('c', 'Лиза'), age: 15, kcalOverride: 1600 };

  it('gives each person their own target and a portion share', () => {
    const h = calcHousehold([adult, partner, teen]);
    expect(h.members.map((m) => m.targets.kcal)).toEqual([2000, 2500, 1600]);
    expect(h.members.map((m) => m.share)).toEqual([1, 1.25, 0.8]);
    expect(h.factor).toBeCloseTo(3.05);
    expect(h.ref.kcal).toBe(2000);
  });

  it('keeps everyone above the safety floor', () => {
    const h = calcHousehold([adult, { ...partner, kcalOverride: 900 }]);
    expect(h.members[1].targets.kcal).toBe(1500);
  });

  it('is a plain single person when alone', () => {
    const h = calcHousehold([adult]);
    expect(h.factor).toBe(1);
    expect(h.members[0].share).toBe(1);
  });

  it('puts every person on their own calorie target with the shared menu', () => {
    const h = calcHousehold([adult, partner, teen]);
    const profile: Profile = { ...defaultProfile(), people: [adult, partner, teen] };
    const plan = generatePlan(profile, h.ref, recipes, foods, { seed: 11 });
    const ctx = makeCtx(profile, h.ref, recipes, foods);
    for (const m of h.members) {
      for (const day of plan.days) {
        const kcal = dayNutrition(ctx, day).kcal * m.share;
        expect(Math.abs(kcal - m.targets.kcal) / m.targets.kcal, m.person.name).toBeLessThan(0.12);
      }
    }
  });

  it('buys and cooks for the whole household', () => {
    const profile: Profile = { ...defaultProfile(), people: [adult, partner] };
    const h = calcHousehold(profile.people);
    const plan = generatePlan(profile, h.ref, recipes, foods, { seed: 4 });
    const idx = indexRecipes(recipes);
    const one = buildShoppingList(plan, idx, foods);
    const both = buildShoppingList(plan, idx, foods, h.factor);
    expect(both.map((i) => i.foodId)).toEqual(one.map((i) => i.foodId));
    for (let i = 0; i < one.length; i++) expect(both[i].grams).toBeCloseTo(one[i].grams * 2.25);

    const prepOne = buildPrepList(plan, idx);
    const prepBoth = buildPrepList(plan, idx, h.factor);
    const total = (b: ReturnType<typeof buildPrepList>) => b.reduce((s, x) => s + x.portions, 0);
    expect(total(prepBoth)).toBeGreaterThan(total(prepOne) * 2);
    for (const b of prepBoth) for (const u of b.uses) expect((u.portions * 4) % 1).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('planner', () => {
  const profile = defaultProfile();
  const targets = calcTargets(profile.people[0]);
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
    const plan = generatePlan(vegan, calcTargets(vegan.people[0]), recipes, foods, { seed: 5 });
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
    const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed: 9 });
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
    const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed: 5 });
    for (const day of plan.days) for (const m of Object.values(day)) expect(used.has(m!.recipeId)).toBe(false);
    const again = rerollSlot(plan, 0, 'lunch', p, calcTargets(p.people[0]), recipes, foods, makeRng(77));
    expect(used.has(again.days[0].lunch!.recipeId)).toBe(false);
  });

  it('still lets a hidden recipe be placed by hand', () => {
    const p: Profile = { ...profile, hiddenRecipes: ['tofu-scramble'] };
    expect(isAllowed(idx.get('tofu-scramble')!, p, foods)).toBe(false);
    const plan = placeRecipe(emptyPlan(), 0, 'breakfast', 'tofu-scramble', p, calcTargets(p.people[0]), recipes, foods);
    expect(plan.days[0].breakfast?.recipeId).toBe('tofu-scramble');
  });

  it('supports three meals a day', () => {
    const p: Profile = { ...profile, meals: ['breakfast', 'lunch', 'dinner'] };
    const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed: 3 });
    for (const day of plan.days) expect(Object.keys(day).sort()).toEqual(['breakfast', 'dinner', 'lunch']);
  });

  it('splits the week into even cooking blocks', () => {
    const sizes = (n: number) => batchBlocks(n).map((b) => b.length);
    expect(sizes(1)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(sizes(2)).toEqual([2, 2, 2, 1]);
    expect(sizes(3)).toEqual([3, 2, 2]);
    expect(sizes(4)).toEqual([4, 3]);
    expect(batchBlocks(4).flat()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('knows which meals share one cooked dish', () => {
    const p: Profile = { ...profile, batchDays: 4, batchMeals: ['lunch'], sameLunchDinner: true };
    expect(cookGroup(p, 5, 'dinner')).toHaveLength(6);
    expect(cookGroup(p, 5, 'dinner')[0]).toEqual({ day: 4, slot: 'lunch' });
    expect(cookGroup(p, 2, 'breakfast')).toEqual([{ day: 2, slot: 'breakfast' }]);
    expect(cookGroup(profile, 3, 'lunch')).toEqual([{ day: 3, slot: 'lunch' }]);
  });

  it('cooks every meal for four days: two dishes per meal a week, days still on target', () => {
    const p: Profile = { ...profile, batchDays: 4, batchMeals: ['breakfast', 'lunch', 'dinner', 'snack'] };
    const t = calcTargets(p.people[0]);
    const plan = generatePlan(p, t, recipes, foods, { seed: 31 });
    const ctx = makeCtx(p, t, recipes, foods);
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snack'] as const) {
      const ids = plan.days.map((d) => d[slot]!.recipeId);
      expect(new Set(ids.slice(0, 4)).size, slot).toBe(1);
      expect(new Set(ids.slice(4)).size, slot).toBe(1);
      expect(ids[4], slot).not.toBe(ids[3]);
    }
    for (const day of plan.days) expect(Math.abs(dayNutrition(ctx, day).kcal / t.kcal - 1)).toBeLessThan(0.1);
  });

  it('does not batch salads with leaves or avocado over several days', () => {
    const p: Profile = { ...profile, batchDays: 4, batchMeals: ['breakfast', 'lunch', 'dinner', 'snack'] };
    const ctx = makeCtx(p, calcTargets(p.people[0]), recipes, foods);
    expect(ctx.fresh.has('greek-salad-bread') || ctx.fresh.has('chicken-caesar-light')).toBe(true);
    let fresh = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed });
      for (const d of [1, 2, 3, 5, 6]) for (const m of Object.values(plan.days[d])) if (ctx.fresh.has(m!.recipeId)) fresh++;
    }
    expect(fresh).toBe(0);
  });

  it('can make dinner the same dish as lunch', () => {
    const p: Profile = { ...profile, batchDays: 3, sameLunchDinner: true };
    const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed: 8 });
    for (const day of plan.days) expect(day.dinner!.recipeId).toBe(day.lunch!.recipeId);
    const distinct = new Set(plan.days.flatMap((d) => [d.lunch!.recipeId, d.dinner!.recipeId]));
    expect(distinct.size).toBe(3);
    // Breakfast is not batched here: it still changes.
    expect(new Set(plan.days.map((d) => d.breakfast!.recipeId)).size).toBeGreaterThan(3);
  });

  it('swaps a whole batch at once and keeps a pinned batch dish', () => {
    const p: Profile = { ...profile, batchDays: 4 };
    const t = calcTargets(p.people[0]);
    const plan = generatePlan(p, t, recipes, foods, { seed: 12 });
    const next = rerollSlot(plan, 1, 'lunch', p, t, recipes, foods, makeRng(3));
    const ids = next.days.slice(0, 4).map((d) => d.lunch!.recipeId);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).not.toBe(plan.days[0].lunch!.recipeId);
    expect(next.days[4].lunch!.recipeId).toBe(plan.days[4].lunch!.recipeId);

    const pinned = clonePlan(next);
    pinned.days[2].dinner!.locked = true;
    const again = generatePlan(p, t, recipes, foods, { seed: 99, base: pinned });
    for (const d of [0, 1, 2, 3]) expect(again.days[d].dinner!.recipeId).toBe(pinned.days[2].dinner!.recipeId);
  });

  it('cooks lunch and dinner once for two days when asked', () => {
    const p: Profile = { ...profile, batchDays: 2 };
    const plan = generatePlan(p, calcTargets(p.people[0]), recipes, foods, { seed: 21 });
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
    const plan = generatePlan(profile, calcTargets(profile.people[0]), recipes, foods, { seed: 8 });
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
    const s = parseState({ profile: { people: [{ age: 500, weightKg: -3, heightCm: 20 }] } });
    expect(s.profile.people[0].age).toBe(100);
    expect(s.profile.people[0].weightKg).toBe(30);
    expect(s.profile.people[0].heightCm).toBe(100);
  });

  it('turns the old two-day switch into two-day batches and keeps batches in range', () => {
    expect(parseState({ profile: { cookForTwoDays: true } }).profile.batchDays).toBe(2);
    expect(parseState({ profile: {} }).profile.batchDays).toBe(1);
    expect(parseState({ profile: { batchDays: 9 } }).profile.batchDays).toBe(4);
    expect(parseState({ profile: { batchDays: 0 } }).profile.batchDays).toBe(1);
    expect(parseState({ profile: {} }).profile.batchMeals).toEqual(['lunch', 'dinner']);
    expect(parseState({ profile: { batchMeals: ['snack', 'x'] } }).profile.batchMeals).toEqual(['snack']);
  });

  it('gives old people a standard macro split and repairs a bad one', () => {
    expect(parseState({ profile: { people: [{ name: 'А' }] } }).profile.people[0].macros.preset).toBe('standard');
    const s = parseState({ profile: { people: [{ macros: { preset: 'mentzer', protein: 'x', fat: 900 } }] } });
    expect(s.profile.people[0].macros).toEqual({ preset: 'mentzer', protein: 25, fat: 100 });
  });

  it('turns an old single-person profile into the first person', () => {
    const s = parseState({ profile: { sex: 'male', age: 41, heightCm: 182, weightKg: 90, goal: 'lose', kcalOverride: 2100, diet: 'vegan' } });
    expect(s.profile.people).toHaveLength(1);
    expect(s.profile.people[0]).toMatchObject({ name: 'Я', sex: 'male', age: 41, heightCm: 182, weightKg: 90, goal: 'lose', kcalOverride: 2100 });
    expect(s.profile.diet).toBe('vegan');
  });

  it('keeps a household, fixes names and duplicate ids, and caps its size', () => {
    const s = parseState({
      profile: { people: [{ id: 'a', name: ' Аня ' }, { id: 'a', name: '' }, 'junk', ...Array.from({ length: 20 }, () => ({}))] },
    });
    expect(s.profile.people.length).toBe(10);
    expect(s.profile.people[0].name).toBe('Аня');
    expect(s.profile.people[1].name).toBe('Человек 2');
    expect(new Set(s.profile.people.map((x) => x.id)).size).toBe(10);
    expect(parseState({ profile: { people: [] } }).profile.people).toHaveLength(1);
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
