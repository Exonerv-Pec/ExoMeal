import { isAllowed } from './diet';
import { BALANCED_MEALS, MEAL_PROTEIN_MIN, MEAL_VEG_MIN, NOT_PLANNED, recipeMicro, type RecipeMicro } from './micro';
import { add, recipePerServing, scale, ZERO } from './nutrition';
import { makeRng, randomSeed, weightedPick, type Rng } from './rng';
import {
  MEAL_ORDER,
  type FoodIndex,
  MICRO_KEYS,
  type MealType,
  type MicroValues,
  type Nutrition,
  type Plan,
  type PlanDay,
  type Profile,
  type Recipe,
  type Targets,
} from './types';

export const MIN_PORTION = 0.5;
export const MAX_PORTION = 2;
export const PORTION_STEP = 0.25;
export const DAYS = 7;

/** Share of the day's calories each meal gets (normalised over the chosen meals). */
const BASE_SHARE: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

export function slotsOf(profile: Profile): MealType[] {
  const slots = MEAL_ORDER.filter((m) => profile.meals.includes(m));
  return slots.length ? slots : ['breakfast', 'lunch', 'dinner'];
}

export function emptyPlan(): Plan {
  return { seed: 0, days: Array.from({ length: DAYS }, () => ({})) };
}

export function clonePlan(plan: Plan): Plan {
  // JSON instead of structuredClone: the UI keeps the plan in a reactive proxy.
  return JSON.parse(JSON.stringify(plan)) as Plan;
}

// ---------------------------------------------------------------------------
// Context shared by all planner functions
// ---------------------------------------------------------------------------

export interface Ctx {
  profile: Profile;
  targets: Targets;
  slots: MealType[];
  slotKcal: Partial<Record<MealType, number>>;
  pool: Record<MealType, Recipe[]>;
  recipes: Map<string, Recipe>;
  per: Map<string, Nutrition>;
  micro: Map<string, RecipeMicro>;
}

/** A person the week's vitamins and minerals are checked for. */
export interface MicroGoal {
  /** Portion size relative to the first person. */
  share: number;
  /** Daily needs. */
  norms: MicroValues;
}

export function makeCtx(profile: Profile, targets: Targets, recipes: Recipe[], foods: FoodIndex): Ctx {
  const slots = slotsOf(profile);
  const shareSum = slots.reduce((s, m) => s + BASE_SHARE[m], 0);
  const slotKcal: Partial<Record<MealType, number>> = {};
  for (const m of slots) slotKcal[m] = (targets.kcal * BASE_SHARE[m]) / shareSum;

  const pool: Record<MealType, Recipe[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  const per = new Map<string, Nutrition>();
  const micro = new Map<string, RecipeMicro>();
  const byId = new Map<string, Recipe>();
  for (const r of recipes) {
    byId.set(r.id, r);
    per.set(r.id, recipePerServing(r, foods));
    micro.set(r.id, recipeMicro(r, foods));
    if (!isAllowed(r, profile, foods)) continue;
    for (const m of r.meals) pool[m].push(r);
  }
  return { profile, targets, slots, slotKcal, pool, recipes: byId, per, micro };
}

/** Meals for which the profile leaves no recipe at all (the UI warns about these). */
export function emptySlots(profile: Profile, recipes: Recipe[], foods: FoodIndex): MealType[] {
  const ctx = makeCtx(profile, { kcal: 2000 } as Targets, recipes, foods);
  return ctx.slots.filter((m) => ctx.pool[m].length === 0);
}

// ---------------------------------------------------------------------------
// Portions
// ---------------------------------------------------------------------------

function snap(portions: number): number {
  const p = Math.round(portions / PORTION_STEP) * PORTION_STEP;
  return Math.min(MAX_PORTION, Math.max(MIN_PORTION, p));
}

function kcalPer(ctx: Ctx, recipeId: string): number {
  return Math.max(1, ctx.per.get(recipeId)?.kcal ?? 1);
}

export function dayNutrition(ctx: Ctx, day: PlanDay): Nutrition {
  let total = ZERO;
  for (const m of Object.values(day)) {
    const per = m && ctx.per.get(m.recipeId);
    if (per) total = add(total, scale(per, m.portions));
  }
  return total;
}

/** Sets the portions of the unlocked meals of one day so that the day's calories are close to the target. */
function fitDay(ctx: Ctx, day: PlanDay): void {
  const present = ctx.slots.filter((s) => day[s]);
  for (const s of present) {
    const m = day[s]!;
    if (m.locked) continue;
    m.portions = snap((ctx.slotKcal[s] ?? 0) / kcalPer(ctx, m.recipeId));
  }
  const target = ctx.targets.kcal;
  for (let i = 0; i < 16; i++) {
    const total = dayNutrition(ctx, day).kcal;
    const diff = target - total;
    if (Math.abs(diff) < target * 0.03) break;
    let best: { slot: MealType; next: number; err: number } | null = null;
    for (const s of present) {
      const m = day[s]!;
      if (m.locked) continue;
      const next = m.portions + Math.sign(diff) * PORTION_STEP;
      if (next < MIN_PORTION - 1e-9 || next > MAX_PORTION + 1e-9) continue;
      const err = Math.abs(target - (total + Math.sign(diff) * PORTION_STEP * kcalPer(ctx, m.recipeId)));
      if (err < Math.abs(diff) && (!best || err < best.err)) best = { slot: s, next, err };
    }
    if (!best) break;
    day[best.slot]!.portions = best.next;
  }
}

// ---------------------------------------------------------------------------
// Picking recipes
// ---------------------------------------------------------------------------

function pickRecipe(
  ctx: Ctx,
  rng: Rng,
  slot: MealType,
  dayIndex: number,
  days: PlanDay[],
  used: Map<string, number>,
  exclude?: Set<string>,
): Recipe | undefined {
  const pool = ctx.pool[slot].filter((r) => !exclude?.has(r.id));
  const target = ctx.slotKcal[slot] ?? 0;
  const today = Object.values(days[dayIndex]).map((m) => m?.recipeId);
  const yesterday = dayIndex > 0 ? days[dayIndex - 1][slot]?.recipeId : undefined;

  const weights = pool.map((r) => {
    let penalty = 0;
    penalty += (used.get(r.id) ?? 0) * 3.5; // repeats during the week
    if (today.includes(r.id)) penalty += 6; // same dish twice in a day
    if (yesterday === r.id) penalty += 5; // same dish two days in a row
    const need = target / kcalPer(ctx, r.id);
    penalty += Math.abs(Math.log(need)) * 2.2; // how far the serving is from the slot
    if (need < MIN_PORTION || need > MAX_PORTION) penalty += 4;
    return Math.exp(-penalty);
  });
  return weightedPick(pool, weights, rng);
}

function bump(used: Map<string, number>, id: string): void {
  used.set(id, (used.get(id) ?? 0) + 1);
}

function buildCandidate(ctx: Ctx, rng: Rng, base: Plan | null): PlanDay[] {
  const days: PlanDay[] = Array.from({ length: DAYS }, () => ({}));
  const used = new Map<string, number>();

  if (base) {
    for (let d = 0; d < DAYS; d++) {
      for (const slot of ctx.slots) {
        const m = base.days[d]?.[slot];
        if (m?.locked && ctx.recipes.has(m.recipeId)) {
          days[d][slot] = { ...m };
          bump(used, m.recipeId);
        }
      }
    }
  }

  for (let d = 0; d < DAYS; d++) {
    for (const slot of ctx.slots) {
      if (days[d][slot]) continue;
      if (ctx.profile.cookForTwoDays && (slot === 'lunch' || slot === 'dinner') && d % 2 === 1) {
        const prev = days[d - 1][slot];
        if (prev) {
          days[d][slot] = { recipeId: prev.recipeId, portions: 1 };
          bump(used, prev.recipeId);
          continue;
        }
      }
      const recipe = pickRecipe(ctx, rng, slot, d, days, used);
      if (!recipe) continue;
      days[d][slot] = { recipeId: recipe.id, portions: 1 };
      bump(used, recipe.id);
    }
    fitDay(ctx, days[d]);
  }
  return days;
}

/** Lower is better. */
function cost(ctx: Ctx, days: PlanDay[], goals: MicroGoal[] = []): number {
  let c = 0;
  const counts = new Map<string, number>();
  const week: Record<string, number> = {};
  for (const day of days) {
    const n = dayNutrition(ctx, day);
    const e = (n.kcal - ctx.targets.kcal) / ctx.targets.kcal;
    c += 400 * e * e;
    const shortfall = Math.max(0, (ctx.targets.protein - n.protein) / Math.max(1, ctx.targets.protein));
    c += 100 * shortfall * shortfall;
    for (const [slot, m] of Object.entries(day) as [MealType, PlanDay[MealType]][]) {
      if (!m) continue;
      c += Math.abs(Math.log(m.portions)) * 0.8;
      counts.set(m.recipeId, (counts.get(m.recipeId) ?? 0) + 1);
      const rm = ctx.micro.get(m.recipeId);
      // Protein and vegetables in every main meal: a nudge, not a ban.
      if (BALANCED_MEALS.has(slot)) {
        if ((ctx.per.get(m.recipeId)?.protein ?? 0) * m.portions < MEAL_PROTEIN_MIN[slot]) c += 1;
        if ((rm?.vegGrams ?? 0) * m.portions < MEAL_VEG_MIN) c += slot === 'breakfast' ? 0.5 : 1;
      }
      if (goals.length && rm) for (const k of MICRO_KEYS) week[k] = (week[k] ?? 0) + rm.values[k] * m.portions;
    }
  }
  for (const n of counts.values()) c += Math.max(0, n - 1) * 0.7;

  // Weekly vitamins and minerals for every person; anything above 100 % earns nothing.
  if (goals.length) {
    const w = 8 / goals.length;
    for (const g of goals) {
      for (const k of MICRO_KEYS) {
        if (NOT_PLANNED.has(k) || g.norms[k] <= 0) continue;
        const cov = Math.min(1, ((week[k] ?? 0) * g.share) / (g.norms[k] * DAYS));
        c += w * (1 - cov) * (1 - cov);
      }
    }
  }
  return c;
}

/**
 * Local search on the chosen week: tries a few other dishes in each unlocked
 * meal and keeps a swap when the week gets better. Deterministic for a seed.
 */
function improve(ctx: Ctx, days: PlanDay[], rng: Rng, goals: MicroGoal[], passes = 2, tries = 6): void {
  let best = cost(ctx, days, goals);
  for (let pass = 0; pass < passes; pass++) {
    let changed = false;
    for (let d = 0; d < DAYS; d++) {
      for (const slot of ctx.slots) {
        const cur = days[d][slot];
        if (!cur || cur.locked) continue;
        const paired = ctx.profile.cookForTwoDays && (slot === 'lunch' || slot === 'dinner');
        // A dish cooked for two days is swapped as a pair, from its first day.
        if (paired && d % 2 === 1 && days[d - 1][slot]?.recipeId === cur.recipeId) continue;
        const group = paired
          ? [d, d + 1].filter((x) => x < DAYS && days[x][slot]?.recipeId === cur.recipeId && !days[x][slot]!.locked)
          : [d];

        const used = new Map<string, number>();
        for (const day of days) for (const m of Object.values(day)) if (m) bump(used, m.recipeId);
        const tried = new Set([cur.recipeId]);
        for (let t = 0; t < tries; t++) {
          const recipe = pickRecipe(ctx, rng, slot, d, days, used, tried);
          if (!recipe) break;
          tried.add(recipe.id);
          const backup = group.map((x) => JSON.parse(JSON.stringify(days[x])) as PlanDay);
          for (const x of group) {
            days[x][slot] = { recipeId: recipe.id, portions: 1 };
            fitDay(ctx, days[x]);
          }
          const c = cost(ctx, days, goals);
          if (c < best - 1e-9) {
            best = c;
            changed = true;
            break;
          }
          group.forEach((x, i) => (days[x] = backup[i]));
        }
      }
    }
    if (!changed) break;
  }
}

export interface GenerateOptions {
  seed?: number;
  /** How many random weeks to compare. */
  candidates?: number;
  /** Existing plan: its locked meals are kept. */
  base?: Plan | null;
  /** People whose weekly vitamins and minerals the week should cover. */
  micro?: MicroGoal[];
}

/**
 * Builds a week: draws many random candidates, keeps the one that best fits
 * the calorie and protein targets with the least repetition, protein and
 * vegetables in the main meals and (when asked) the weekly vitamin and mineral
 * needs, then polishes it with a short local search.
 * The same seed always gives the same plan.
 */
export function generatePlan(
  profile: Profile,
  targets: Targets,
  recipes: Recipe[],
  foods: FoodIndex,
  opts: GenerateOptions = {},
): Plan {
  const ctx = makeCtx(profile, targets, recipes, foods);
  const seed = opts.seed ?? randomSeed();
  const rng = makeRng(seed);
  const tries = Math.max(1, opts.candidates ?? 40);
  const goals = opts.micro ?? [];

  let best: PlanDay[] | null = null;
  let bestCost = Infinity;
  for (let i = 0; i < tries; i++) {
    const days = buildCandidate(ctx, makeRng(Math.floor(rng() * 2 ** 31)), opts.base ?? null);
    const c = cost(ctx, days, goals);
    if (c < bestCost) {
      bestCost = c;
      best = days;
    }
  }
  if (!best) return { seed, days: emptyPlan().days };
  improve(ctx, best, rng, goals);
  return { seed, days: best };
}

// ---------------------------------------------------------------------------
// Editing one meal
// ---------------------------------------------------------------------------

/** Puts a recipe into a slot and picks portions that bring the day close to the target. */
export function placeRecipe(
  plan: Plan,
  dayIndex: number,
  slot: MealType,
  recipeId: string,
  profile: Profile,
  targets: Targets,
  recipes: Recipe[],
  foods: FoodIndex,
): Plan {
  const ctx = makeCtx(profile, targets, recipes, foods);
  const next = clonePlan(plan);
  const day = next.days[dayIndex];
  const others = Object.entries(day).filter(([s]) => s !== slot);
  const othersKcal = others.reduce((sum, [, m]) => sum + (m ? (ctx.per.get(m.recipeId)?.kcal ?? 0) * m.portions : 0), 0);
  const slotTarget = ctx.slotKcal[slot] ?? targets.kcal * 0.25;
  // Aim at what is left of the day, but stay within a sensible range of the slot's own share.
  const wanted = Math.min(slotTarget * 1.5, Math.max(slotTarget * 0.6, targets.kcal - othersKcal));
  day[slot] = { recipeId, portions: snap(wanted / kcalPer(ctx, recipeId)) };
  return next;
}

/** Replaces one meal with a different random recipe. */
export function rerollSlot(
  plan: Plan,
  dayIndex: number,
  slot: MealType,
  profile: Profile,
  targets: Targets,
  recipes: Recipe[],
  foods: FoodIndex,
  rng: Rng = Math.random,
): Plan {
  const ctx = makeCtx(profile, targets, recipes, foods);
  const used = new Map<string, number>();
  for (const day of plan.days) for (const m of Object.values(day)) if (m) bump(used, m.recipeId);

  const exclude = new Set<string>();
  const current = plan.days[dayIndex][slot];
  if (current) exclude.add(current.recipeId);
  for (const m of Object.values(plan.days[dayIndex])) if (m) exclude.add(m.recipeId);

  let recipe = pickRecipe(ctx, rng, slot, dayIndex, plan.days, used, exclude);
  if (!recipe && current) {
    // Small pools: allow anything except the dish that is already there.
    recipe = pickRecipe(ctx, rng, slot, dayIndex, plan.days, used, new Set([current.recipeId]));
  }
  if (!recipe) return plan;
  return placeRecipe(plan, dayIndex, slot, recipe.id, profile, targets, recipes, foods);
}
