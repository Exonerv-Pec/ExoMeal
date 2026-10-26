# Contributing to ExoMeal

Thanks for helping. Issues and pull requests are welcome.

## Ground rules

- **Write it yourself.** Code, recipes and texts must be your own work or under a license compatible with AGPL-3.0. Do not copy recipe texts from cookbooks or websites; a short list of ingredients and your own wording of the steps is fine.
- **Keep the app private.** No network requests, analytics or third-party scripts. The page ships a Content Security Policy that forbids them, and tests rely on it.
- **Keep the core pure.** `src/core/` has no UI and no browser APIs except in `storage.ts`. New logic goes there with a test.

## Setup

```
npm install
npm run dev      # development server
npm run check    # type check
npm test         # tests
```

Run `npm run check && npm test` before opening a pull request. CI runs the same.

## Adding a recipe

Recipes live in `src/data/recipes/` (files by type of dish, such as `breakfasts-more.ts`, `soups-salads.ts`, `fish-veg.ts`, `snacks-more.ts`). Each one is a call like:

```ts
r('oatmeal-banana', 'Овсянка с бананом и орехами', ['breakfast'], 1, 10,
  [['oats', 60], ['milk', 200, 'ml'], ['banana', 1, 'pcs']],
  ['Step one.', 'Step two.']),
```

Arguments: id (unique, kebab-case), title, meals, servings the ingredient list makes, minutes, ingredients, steps, optional note.

- Ingredients are `[food id, amount, unit]`. Units: `g` (default), `ml`, `pcs`, `tbsp`, `tsp`. Use `pcs` only for foods that have `gPerPiece`.
- Diet labels (vegan, gluten-free and so on) are computed from the ingredients. Do not write them by hand; set the right `flags` on foods instead.
- Aim for 350–700 kcal per serving for lunch and dinner, 250–650 for breakfast, 120–400 for a snack. A test enforces these ranges.

## Adding or correcting a food

Foods live in `src/data/foods.ts`: calories, protein, fat and carbohydrates **per 100 g**, a shop category, and optional `flags`, `density` (g per ml), `gPerPiece`. A test checks that calories agree with macros (4 / 9 / 4); keep to that when correcting values and mention your source in the pull request.

## Code style

TypeScript strict mode, Svelte 5 runes, no UI libraries. Interface text is Russian; user-visible strings live next to their components or in `src/lib/labels.ts`.
