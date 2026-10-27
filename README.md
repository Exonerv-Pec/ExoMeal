# ExoMeal

A weekly meal planner that works offline. Press one button and get a week of healthy meals that fits your daily calories and protein, plus a shopping list for the whole week and a list of what to cook.

[Русская версия](README.ru.md)

> **Status: early alpha (v0.1).** The core works: 61 recipes, 94 foods, a random week generator, a shopping list and cooking batches. See [ROADMAP.md](ROADMAP.md).

## What it does

- **Builds a week.** Four meals a day (breakfast, lunch, dinner, snack, each can be switched off). Every day lands within a few percent of your calorie target, and protein is kept near the goal. Dishes do not repeat day after day.
- **You stay in control.** Pin a dish and it survives "build again". Swap one meal for a random one, pick a dish yourself, or change the portion size in quarters.
- **Vitamins and minerals.** Daily needs per person for fibre, vitamins C, A, D, B12, folate, calcium, iron, magnesium, potassium and zinc. The week is tuned to cover the weekly needs, and the week page shows how much of each is covered.
- **Your macro split.** Standard, Mike Mentzer's 60 % carbs / 25 % protein / 15 % fat, or your own percentages. Losing weight takes 500 kcal off, gaining adds 200, never below the safety floor.
- **Simple rules.** The generator aims for protein and vegetables in breakfast, lunch and dinner, with short tips on water, sleep, movement and the 80/20 rule.
- **For the whole family.** Add people to the household: each gets their own calorie and macro target. The menu is shared, portions are sized for each person, and the shopping list and cooking batches cover everyone.
- **Calculates your target.** Mifflin–St Jeor from age, height, weight, activity and goal, with a safety floor. You can type your own calories instead.
- **Respects your diet.** Vegan, vegetarian, pescatarian, plus exclusions (gluten, dairy, eggs, nuts, peanuts, fish, shellfish, soy, sesame), foods you dislike, and a time limit per dish. Diet labels on recipes are computed from the ingredients, so they cannot drift out of date.
- **Shopping list for the week.** Amounts from all meals are added up (300 g + 200 g onion becomes one line), shown the way people buy them (pieces, kilograms), grouped by shop aisle. Oils and spices go to a separate "check at home" group. Copy it, download it, print it, tick items off.
- **Cooking batches.** The week's dishes grouped by recipe with the total number of portions and the meals they are for. Cook once for up to four days: pick which meals repeat (lunch and dinner by default, or breakfast and snacks too), and optionally make dinner the same dish as lunch. With everything on four days, a week is about 6–8 dishes instead of 28. Salads with leaves and avocado are kept out of multi-day batches.
- **Hide what you do not like.** Hide a recipe in its card and it will not come up in a random week. It stays in the list, and you can still add it by hand or bring it back from the profile.
- **Your own recipes and foods.** Add a recipe, add a product with nutrition per 100 g.
- **Private.** No account, no server, no tracking. The page forbids network requests (Content Security Policy). Everything lives in your browser; export a JSON backup to move it.

## Try it

Open **https://exonerv-pec.github.io/ExoMeal/** (after the first deploy, see below). Nothing to install.

### Run it yourself

Node.js 20 or newer:

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests and an interface smoke test
npm run check      # type check
npm run build      # static site in dist/
```

### Publish on GitHub Pages

The workflow in `.github/workflows/ci.yml` checks, tests and builds on every push and pull request, and deploys `main` to GitHub Pages. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Project layout

```
src/core/     Pure TypeScript, no UI: units, nutrition and targets, diets,
              planner, shopping list, storage
src/data/     Foods and recipes (plain TypeScript, easy to extend)
src/lib/      Svelte 5 interface
tests/        Vitest: core logic, data checks, interface smoke test
```

The planner is deterministic: the same seed gives the same week. It draws many random candidate weeks and keeps the one that fits the calorie and protein targets best with the least repetition.

## About the numbers

Nutrition values are approximate, compiled by hand from common reference tables, and meant as a guide, not laboratory data. A test checks that every food's calories agree with its macros. If you spot a wrong value, please open an issue or a pull request.

ExoMeal is not medical advice. It is built for healthy adults. Pregnancy, chronic conditions and eating disorders need a plan made with a doctor or dietitian. For people under 18 the app does not build a calorie deficit.

## License

AGPL-3.0. Free to use and modify; derivative works, including hosted services, must stay open under the same license. See [LICENSE](LICENSE). Fonts are bundled under the SIL Open Font License, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

Issues and pull requests are welcome, especially new recipes and corrections to food data. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.
