import { describe, expect, it } from 'vitest';
import { isAllowed, recipeTags } from '../src/core/diet';
import { recipePerServing } from '../src/core/nutrition';
import { defaultProfile } from '../src/core/storage';
import { MEAL_ORDER, type Diet, type Exclusion, type MealType } from '../src/core/types';
import { toGrams } from '../src/core/units';
import { BUILTIN_FOOD_INDEX as foods, BUILTIN_RECIPES as recipes, FOODS } from '../src/data';

describe('built-in food database', () => {
  it('has unique ids', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
  });

  it('has macros that agree with the calories (4 / 9 / 4 rule)', () => {
    // Fibre is not fully digested, so vegetables and spices sit below the rule.
    // The tolerance is 20 %, or 15 kcal for light foods; it catches typos, not rounding.
    const off: string[] = [];
    for (const f of FOODS) {
      if (f.category === 'spices') continue;
      const est = 4 * f.protein + 9 * f.fat + 4 * f.carbs;
      if (f.kcal === 0 && est === 0) continue;
      if (Math.abs(est - f.kcal) > Math.max(f.kcal * 0.2, 15)) off.push(`${f.id}: ${f.kcal} vs ${est.toFixed(0)}`);
    }
    expect(off).toEqual([]);
  });

  it('gives every food with a piece shop mode a weight per piece', () => {
    for (const f of FOODS) if (f.shop === 'pcs') expect(f.gPerPiece, f.id).toBeGreaterThan(0);
  });
});

describe('built-in recipes', () => {
  it('has unique ids and enough recipes', () => {
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
    expect(recipes.length).toBeGreaterThanOrEqual(50);
  });

  it('only uses known foods and units that can be converted', () => {
    for (const r of recipes) {
      expect(r.steps.length, r.id).toBeGreaterThan(0);
      expect(r.servings, r.id).toBeGreaterThanOrEqual(1);
      expect(r.time, r.id).toBeGreaterThan(0);
      for (const ing of r.ingredients) {
        const food = foods.get(ing.food);
        expect(food, `${r.id}: unknown food "${ing.food}"`).toBeDefined();
        expect(ing.qty, `${r.id}/${ing.food}`).toBeGreaterThan(0);
        expect(() => toGrams(food!, ing.qty, ing.unit), `${r.id}/${ing.food}`).not.toThrow();
      }
    }
  });

  it('has sensible calories per serving', () => {
    const range: Record<MealType, [number, number]> = {
      breakfast: [250, 650],
      lunch: [350, 800],
      dinner: [250, 800],
      snack: [120, 400],
    };
    const bad: string[] = [];
    for (const r of recipes) {
      const kcal = recipePerServing(r, foods).kcal;
      // A recipe must fit at least one of its meals.
      const fits = r.meals.some((m) => kcal >= range[m][0] && kcal <= range[m][1]);
      if (!fits) bad.push(`${r.id} (${r.meals.join('/')}): ${Math.round(kcal)} kcal`);
    }
    expect(bad).toEqual([]);
  });

  it('derives diet tags from ingredients', () => {
    const tofu = recipes.find((r) => r.id === 'tofu-scramble')!;
    expect(recipeTags(tofu, foods)).toEqual(expect.arrayContaining(['vegan', 'vegetarian', 'gluten-free', 'dairy-free']));
    const soup = recipes.find((r) => r.id === 'chicken-veg-soup')!;
    expect(recipeTags(soup, foods)).not.toContain('vegetarian');
    expect(recipeTags(soup, foods)).not.toContain('gluten-free');
  });
});

describe('coverage: every profile can get a full week', () => {
  const cases: { name: string; diet: Diet; exclusions: Exclusion[]; min: Record<MealType, number> }[] = [
    { name: 'omnivore', diet: 'omnivore', exclusions: [], min: { breakfast: 8, lunch: 20, dinner: 20, snack: 6 } },
    { name: 'pescatarian', diet: 'pescatarian', exclusions: [], min: { breakfast: 7, lunch: 15, dinner: 15, snack: 5 } },
    { name: 'vegetarian', diet: 'vegetarian', exclusions: [], min: { breakfast: 6, lunch: 10, dinner: 10, snack: 5 } },
    { name: 'vegan', diet: 'vegan', exclusions: [], min: { breakfast: 4, lunch: 9, dinner: 9, snack: 4 } },
    { name: 'gluten-free', diet: 'omnivore', exclusions: ['gluten'], min: { breakfast: 5, lunch: 12, dinner: 12, snack: 5 } },
    { name: 'dairy-free', diet: 'omnivore', exclusions: ['dairy'], min: { breakfast: 5, lunch: 15, dinner: 15, snack: 5 } },
    { name: 'vegan + gluten-free', diet: 'vegan', exclusions: ['gluten'], min: { breakfast: 3, lunch: 4, dinner: 4, snack: 4 } },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const profile = { ...defaultProfile(), diet: c.diet, exclusions: c.exclusions };
      for (const slot of MEAL_ORDER) {
        const n = recipes.filter((r) => r.meals.includes(slot) && isAllowed(r, profile, foods)).length;
        expect(n, `${c.name}: ${slot}`).toBeGreaterThanOrEqual(c.min[slot]);
      }
    });
  }
});
