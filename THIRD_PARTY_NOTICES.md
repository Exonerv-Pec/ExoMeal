# Third-party notices

ExoMeal itself is licensed under AGPL-3.0 (see `LICENSE`). It bundles or uses the following open-source software.

## Bundled in the built site

| Package | License | Notes |
| --- | --- | --- |
| [svelte](https://github.com/sveltejs/svelte) | MIT | UI framework (compiled into the app) |
| [@fontsource-variable/onest](https://github.com/fontsource/font-files) | OFL-1.1 | Onest font, Copyright 2021 The Onest Project Authors (https://github.com/simpals/onest) |
| [@fontsource-variable/unbounded](https://github.com/fontsource/font-files) | OFL-1.1 | Unbounded font, Copyright 2022 The Unbounded Project Authors (https://github.com/googlefonts/unbounded) |

The fonts are served from the app's own files; the app makes no requests to font hosts. The full OFL-1.1 text is included with each package in `node_modules/@fontsource-variable/*/LICENSE`.

## Development tools (not shipped)

vite, @sveltejs/vite-plugin-svelte, vitest, jsdom, svelte-check (MIT); typescript (Apache-2.0).

## Content

All recipes and the food database in `src/data/` were written for this project. Nutrition figures are approximate values compiled by hand from common reference tables and are not copied from any single database.
