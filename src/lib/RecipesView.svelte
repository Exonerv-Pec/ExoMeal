<script lang="ts">
  import { isAllowed, recipeTags, type DerivedTag } from '../core/diet';
  import { recipePerServing } from '../core/nutrition';
  import type { MealType, Recipe } from '../core/types';
  import { MEAL_ORDER } from '../core/types';
  import { app } from './app.svelte';
  import { fmtInt, fmtMinutes } from './format';
  import { MEAL_LABEL, TAG_LABEL } from './labels';

  /** In picker mode a click chooses the recipe instead of opening it. */
  let {
    pick = null,
    onpick,
  }: { pick?: MealType | null; onpick?: (recipe: Recipe) => void } = $props();

  let query = $state('');
  // svelte-ignore state_referenced_locally
  let meal = $state<MealType | 'all'>(pick ?? 'all');
  let tags = $state<DerivedTag[]>([]);
  let maxTime = $state(0);
  // svelte-ignore state_referenced_locally
  let onlyMine = $state(pick !== null);
  let onlyCustom = $state(false);
  let onlyHidden = $state(false);

  const tagOptions: DerivedTag[] = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'];

  const rows = $derived(
    app.recipes.map((r) => ({
      recipe: r,
      tags: recipeTags(r, app.foods),
      per: recipePerServing(r, app.foods),
    })),
  );

  const shown = $derived(
    rows.filter(({ recipe, tags: t }) => {
      if (meal !== 'all' && !recipe.meals.includes(meal)) return false;
      if (query.trim() && !recipe.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      if (tags.some((x) => !t.includes(x))) return false;
      if (maxTime > 0 && recipe.time > maxTime) return false;
      if (onlyMine && !isAllowed(recipe, app.safeProfile, app.foods)) return false;
      if (onlyCustom && !recipe.custom) return false;
      if (onlyHidden && !app.hiddenSet.has(recipe.id)) return false;
      return true;
    }),
  );

  function choose(r: Recipe) {
    if (onpick) onpick(r);
    else app.openRecipeId = r.id;
  }

  function toggleTag(t: DerivedTag) {
    tags = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
  }
</script>

<section class="recipes">
  {#if !pick}
    <div class="head">
      <div>
        <h1>Рецепты</h1>
        <p class="muted">{app.recipes.length} рецептов. Значения КБЖУ ориентировочные и указаны на одну порцию.</p>
      </div>
      <button class="btn btn-primary" type="button" onclick={() => (app.editing = 'new')}>Добавить свой рецепт</button>
    </div>
  {/if}

  <div class="filters">
    <input type="search" placeholder="Найти рецепт" aria-label="Поиск по названию" bind:value={query} />
    <select aria-label="Приём пищи" bind:value={meal}>
      <option value="all">Любой приём пищи</option>
      {#each MEAL_ORDER as m}
        <option value={m}>{MEAL_LABEL[m]}</option>
      {/each}
    </select>
    <select aria-label="Время приготовления" bind:value={maxTime}>
      <option value={0}>Любое время</option>
      <option value={15}>До 15 минут</option>
      <option value={30}>До 30 минут</option>
      <option value={45}>До 45 минут</option>
      <option value={60}>До часа</option>
    </select>
  </div>

  <div class="chips" role="group" aria-label="Фильтры">
    {#each tagOptions as t}
      <label class="chip">
        <input type="checkbox" checked={tags.includes(t)} onchange={() => toggleTag(t)} />
        {TAG_LABEL[t]}
      </label>
    {/each}
    <label class="chip">
      <input type="checkbox" bind:checked={onlyMine} />
      Подходят мне по профилю
    </label>
    {#if app.hiddenSet.size}
      <label class="chip">
        <input type="checkbox" bind:checked={onlyHidden} />
        Скрытые ({app.hiddenSet.size})
      </label>
    {/if}
    {#if app.customRecipes.length}
      <label class="chip">
        <input type="checkbox" bind:checked={onlyCustom} />
        Мои рецепты
      </label>
    {/if}
  </div>

  {#if shown.length === 0}
    <p class="empty">Ничего не нашлось. Снимите часть фильтров или добавьте свой рецепт.</p>
  {:else}
    <ul class="grid">
      {#each shown as { recipe, tags: t, per } (recipe.id)}
        <li>
          <button type="button" class="card" class:hidden={app.hiddenSet.has(recipe.id)} onclick={() => choose(recipe)}>
            <span class="dots" aria-hidden="true">
              {#each recipe.meals as m}<i class="meal-{m}"></i>{/each}
            </span>
            <span class="name">{recipe.title}</span>
            <span class="facts">
              <span>{fmtInt(per.kcal)} ккал</span>
              <span>Б {Math.round(per.protein)}</span>
              <span>{fmtMinutes(recipe.time)}</span>
            </span>
            <span class="tags">
              {#if app.hiddenSet.has(recipe.id)}<span class="tag">Скрыт из меню</span>{/if}
              {#if recipe.custom}<span class="tag">Мой рецепт</span>{/if}
              {#each t as tag}<span class="tag">{TAG_LABEL[tag]}</span>{/each}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .recipes {
    display: grid;
    gap: 1rem;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 0.8rem 1.5rem;
  }

  .head p {
    margin-top: 0.35rem;
    font-size: 0.95rem;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    position: relative;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
    gap: 0.7rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .card {
    display: grid;
    align-content: start;
    gap: 0.4rem;
    width: 100%;
    height: 100%;
    padding: 0.8rem 0.9rem 0.85rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-s);
    background: var(--paper);
    text-align: left;
    cursor: pointer;
  }

  .card:hover {
    border-color: var(--ink);
  }

  .card.hidden .name,
  .card.hidden .facts {
    opacity: 0.55;
  }

  .dots {
    display: flex;
    gap: 4px;
  }

  .dots i {
    width: 1.4rem;
    height: 5px;
    border-radius: 2px;
    background: var(--c);
  }

  .name {
    font-weight: 650;
    line-height: 1.3;
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.8rem;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .empty {
    padding: 2rem 0;
    color: var(--ink-soft);
  }

  @media (max-width: 640px) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }
    .filters input {
      grid-column: 1 / -1;
    }
  }
</style>
