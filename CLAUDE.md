# ExoMeal: notes for Claude

Weekly meal planner: random healthy week, calories and macros, shopping list. Private, offline-first, AGPL-3.0. Standalone project (not related to Exomyth).

## Commands

```
npm run dev      # dev server
npm run check    # svelte-check (TypeScript 6; svelte-check does not support TS 7)
npm test         # vitest: core, data validation, jsdom smoke test of the whole UI
npm run build    # static site in dist/
```

Run `check`, `test` and `build` before every commit.

## Layout

- `src/core/` pure TypeScript: `types`, `units` (grams conversion, shopping labels), `nutrition` (per-serving, daily targets, macro split, household shares), `micro` (vitamins/minerals per recipe, daily norms by sex/age, weekly coverage, protein+veg rule), `diet` (flags → diets, exclusions), `planner` (seeded generator, cooking batches and `cookGroup`, fit portions, local search, reroll, place), `shopping` (list and cooking batches), `storage` (load/save/sanitize)
- `src/data/` foods and recipes as typed TypeScript. Diet tags are derived from food `flags`; never hand-write them. Every food needs a row in `micro.ts`; vegetables are listed in `VEGETABLES` in `foods.ts`.
- Recipes are written in our own words. Never copy texts from cookbooks, chefs or sites, and never name them as a source.
- `src/lib/` Svelte 5 UI (runes). Shared state is `app.svelte.ts` (one `AppState` class, persisted to localStorage).
- `tests/` data checks fail on: unknown food ids, bad units, calories out of range per meal, macros disagreeing with calories (4/9/4), too few recipes for any diet.

## Rules

- No network requests, analytics or external fonts. The page has a CSP that forbids them; fonts are bundled via fontsource.
- The planner is deterministic for a given seed. Keep it that way; do not use `Math.random` inside candidate building.
- Plan state is proxied by Svelte: use `$state.snapshot` or JSON cloning before passing it to core functions that clone.
- UI text is Russian, sentence case, plain verbs. No calorie-shaming copy; targets never go below the safety floor.
- Design: meal colours (yolk, leaf, berry, tangerine) carry meaning in the week grid. Do not use them decoratively.
