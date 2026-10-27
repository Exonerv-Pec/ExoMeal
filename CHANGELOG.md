# Changelog

## Unreleased

- Batch cooking: cook one dish for 1, 2, 3 or 4 days in a row (the week splits evenly: 4+3, 3+2+2, 2+2+2+1), choose which meals repeat, and optionally make dinner the same dish as lunch. Set it in the profile or right above the week. Cells show where a dish is cooked and where it is eaten from what is ready; swapping a batch dish swaps the whole batch; pinning one day pins the batch. Salads with leaves, avocado or banana are kept out of multi-day batches. The old "cook for two days" switch becomes two-day batches
- Vitamins and minerals: fibre, vitamins C, A, D, B12, folate, calcium, iron, magnesium, potassium and zinc for every food; daily needs per person by sex and age (US National Academies DRIs); the generator tunes the week to cover everyone's weekly needs and the week page shows the coverage. Vitamin D is shown but not chased, since it comes mostly from sunlight
- Macro split per person: standard, Mentzer (60 % carbohydrates, 25 % protein, 15 % fat) or custom percentages within safe limits
- Goals: losing weight takes 500 kcal off the estimate, gaining adds 200; the safety floor still applies
- Protein and vegetables in breakfast, lunch and dinner: the generator prefers such dishes; recipe cards show "has protein" and "has vegetables"; a filter in the recipe list
- A short local search polishes every generated week
- "Simple rules" panel: protein and vegetables, eat slowly, water, movement, sleep, 80/20
- 20 classic home dishes of Russian, French, British, Italian and Spanish cooking, written in our own words (181 recipes in total)
- Household: add up to 10 people, each with their own calorie and macro target. One shared menu; each person's portions are scaled to their target, the week shows portions and totals per person, and the shopping list and cooking batches cover everyone. An existing profile becomes the first person
- Hide a recipe from the menu: it never comes up when a week is built or a meal is swapped, stays in the list (marked, with a filter) and can still be added by hand. Hidden recipes are listed in the profile with a button to bring them back
- 100 new recipes (161 in total): soups, bowls and salads, poultry, beef and pork, fish and seafood, vegetarian and vegan dishes, breakfasts and snacks
- 41 new foods (135 in total)

## 0.1.0

First public version.

- Random week generator: calorie and protein targets, variety, pinned meals, swap one meal, pick by hand, portion sizes in quarters
- Daily targets from age, height, weight, activity and goal; manual override; safety floor; no deficit under 18
- Diets (vegan, vegetarian, pescatarian), exclusions, disliked foods, time limit, cook lunch and dinner for two days
- Shopping list: merged amounts, pieces and kilograms, shop aisles, "check at home" group, copy, download, print, ticks
- Cooking batches grouped by recipe
- Own recipes and foods; JSON backup and restore; data kept in the browser
- 61 recipes, 94 foods
- Light and dark theme, phone and desktop layouts
- GitHub Actions: type check, tests, build, deploy to GitHub Pages
