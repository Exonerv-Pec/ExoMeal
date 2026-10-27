<script lang="ts">
  import { recipeTags } from '../core/diet';
  import { MEAL_VEG_MIN, recipeMicro } from '../core/micro';
  import { recipePerServing } from '../core/nutrition';
  import { MEAL_ORDER, MICRO_KEYS, type MealType } from '../core/types';
  import { fmtIngredient, fmtNum } from '../core/units';
  import { app } from './app.svelte';
  import { fmtInt, fmtMinutes, fmtPortions, portionsWord, round1 } from './format';
  import { DAY_NAMES, MEAL_LABEL, MICRO_LABEL, MICRO_UNIT, TAG_LABEL } from './labels';
  import Modal from './Modal.svelte';

  const recipe = $derived(app.openRecipeId ? app.recipeIndex.get(app.openRecipeId) : undefined);

  let servings = $state(1);
  let day = $state(0);
  let slot = $state<MealType>('lunch');
  let added = $state('');

  // Start from the recipe's own number of servings; pick a slot the recipe fits.
  $effect(() => {
    if (!recipe) return;
    servings = recipe.servings;
    slot = recipe.meals.find((m) => app.safeProfile.meals.includes(m)) ?? recipe.meals[0];
    added = '';
  });

  const hidden = $derived(recipe ? app.hiddenSet.has(recipe.id) : false);
  const per = $derived(recipe ? recipePerServing(recipe, app.foods) : null);
  const tags = $derived(recipe ? recipeTags(recipe, app.foods) : []);
  const micro = $derived(recipe ? recipeMicro(recipe, app.foods) : null);
  const hasProtein = $derived((per?.protein ?? 0) >= 12);
  const hasVeg = $derived((micro?.vegGrams ?? 0) >= MEAL_VEG_MIN);
  const k = $derived(recipe ? servings / recipe.servings : 1);
  const slots = $derived(MEAL_ORDER.filter((m) => app.safeProfile.meals.includes(m)));

  function close() {
    app.openRecipeId = null;
  }

  function addToPlan() {
    if (!recipe) return;
    app.place(day, slot, recipe.id);
    added = `Добавлено: ${DAY_NAMES[day]}, ${MEAL_LABEL[slot].toLowerCase()}.`;
  }

  function edit() {
    if (!recipe) return;
    const r = recipe;
    close();
    app.editing = r;
  }

  function remove() {
    if (!recipe) return;
    if (confirm(`Удалить рецепт «${recipe.title}»? Он также пропадёт из плана недели.`)) {
      app.deleteRecipe(recipe.id);
      close();
    }
  }
</script>

{#if recipe && per}
  <Modal title={recipe.title} onclose={close}>
    <div class="recipe">
      <p class="meta muted">
        <span>{fmtMinutes(recipe.time)}</span>
        <span>{recipe.meals.map((m) => MEAL_LABEL[m]).join(', ')}</span>
      </p>
      {#if tags.length || hasProtein || hasVeg}
        <p class="tags">
          {#if hasProtein}<span class="tag">Есть белок</span>{/if}
          {#if hasVeg}<span class="tag">Есть овощи</span>{/if}
          {#each tags as t}<span class="tag">{TAG_LABEL[t]}</span>{/each}
        </p>
      {/if}

      <dl class="nutrition" aria-label="На одну порцию">
        <div><dt>Калории</dt><dd>{fmtInt(per.kcal)}</dd></div>
        <div><dt>Белки, г</dt><dd>{round1(per.protein)}</dd></div>
        <div><dt>Жиры, г</dt><dd>{round1(per.fat)}</dd></div>
        <div><dt>Углеводы, г</dt><dd>{round1(per.carbs)}</dd></div>
      </dl>
      <p class="hint muted">На одну порцию. Значения ориентировочные.</p>

      {#if micro}
        <details class="micro">
          <summary>Витамины и минералы на порцию</summary>
          <table>
            <tbody>
              {#each MICRO_KEYS as k (k)}
                {@const v = micro.values[k]}
                <tr>
                  <th scope="row">{MICRO_LABEL[k]}</th>
                  <td>{fmtNum(v >= 100 ? Math.round(v) : Math.round(v * 10) / 10, 1)} {MICRO_UNIT[k]}</td>
                  <td class="muted">{Math.round((v / app.viewNorms[k]) * 100)}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="muted small">
            Проценты от дневной нормы{app.household.members.length > 1 ? `: ${app.viewMember.person.name}` : ''}.
            {#if micro.incomplete}Для части продуктов нет данных.{/if}
          </p>
        </details>
      {/if}

      <div class="servings">
        <h3>Ингредиенты</h3>
        <label class="inline">
          <span>Приготовить</span>
          <input type="number" min="1" max="20" step="1" bind:value={servings} />
          <span>{portionsWord(servings)}</span>
        </label>
      </div>
      <ul class="ingredients">
        {#each recipe.ingredients as ing}
          {@const food = app.foods.get(ing.food)}
          <li>
            <span>{food?.name ?? ing.food}</span>
            <span class="amount">{fmtIngredient(ing.qty * k, ing.unit)}</span>
          </li>
        {/each}
      </ul>

      <h3>Приготовление</h3>
      {#if recipe.note}<p class="notice">{recipe.note}</p>{/if}
      <ol class="steps">
        {#each recipe.steps as step}<li>{step}</li>{/each}
      </ol>

      <div class="plan no-print">
        <h3>Добавить в неделю</h3>
        <div class="row">
          <select aria-label="День" bind:value={day}>
            {#each DAY_NAMES as name, i}<option value={i}>{name}</option>{/each}
          </select>
          <select aria-label="Приём пищи" bind:value={slot}>
            {#each slots as m}<option value={m}>{MEAL_LABEL[m]}</option>{/each}
          </select>
          <button class="btn btn-primary" type="button" onclick={addToPlan}>Добавить</button>
        </div>
        {#if added}
          <p class="added" role="status">{added} Порция подобрана под норму дня: {fmtPortions(app.plan.days[day][slot]?.portions ?? 1)}.</p>
        {/if}
      </div>

      <div class="visibility no-print">
        <button class="btn" type="button" aria-pressed={hidden} onclick={() => recipe && app.toggleHidden(recipe.id)}>
          {hidden ? 'Вернуть в меню' : 'Скрыть из меню'}
        </button>
        <p class="muted small">
          {hidden
            ? 'Рецепт скрыт: при составлении недели он не попадёт в план. Добавить его вручную всё равно можно.'
            : 'Скрытый рецепт не попадает в случайный план, но остаётся в списке.'}
        </p>
      </div>

      {#if recipe.custom}
        <div class="owner no-print">
          <button class="btn" type="button" onclick={edit}>Редактировать</button>
          <button class="btn btn-danger" type="button" onclick={remove}>Удалить</button>
        </div>
      {/if}
    </div>
  </Modal>
{/if}

<style>
  .recipe {
    display: grid;
    gap: 0.9rem;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    font-size: 0.92rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .nutrition {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-s);
    overflow: hidden;
  }

  .nutrition div {
    padding: 0.55rem 0.7rem;
    border-left: 1px solid var(--line);
  }

  .nutrition div:first-child {
    border-left: 0;
  }

  dt {
    font-size: 0.78rem;
    color: var(--ink-soft);
  }

  dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 600;
  }

  .hint {
    margin-top: -0.5rem;
    font-size: 0.82rem;
  }

  .micro summary {
    cursor: pointer;
    font-weight: 600;
  }

  .micro table {
    width: 100%;
    margin: 0.5rem 0;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .micro th,
  .micro td {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--line);
    text-align: right;
  }

  .micro th {
    text-align: left;
    font-weight: 400;
  }

  .micro td.muted {
    width: 3.5rem;
  }

  .servings {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }

  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.92rem;
  }

  .inline input {
    width: 4.5rem;
  }

  .ingredients {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }

  .ingredients li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--line);
  }

  .amount {
    white-space: nowrap;
    font-weight: 600;
  }

  .steps {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding-left: 1.3rem;
  }

  .steps li::marker {
    font-weight: 700;
    color: var(--moss-ink);
  }

  .plan {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--line);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .row select {
    width: auto;
    flex: 1 1 9rem;
  }

  .added {
    font-size: 0.9rem;
    color: var(--moss-ink);
  }

  .owner {
    display: flex;
    gap: 0.5rem;
  }

  .visibility {
    display: grid;
    justify-items: start;
    gap: 0.4rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--line);
  }

  .small {
    font-size: 0.86rem;
  }

  @media (max-width: 520px) {
    .nutrition {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .nutrition div:nth-child(3) {
      border-left: 0;
    }
    .nutrition div:nth-child(n + 3) {
      border-top: 1px solid var(--line);
    }
  }
</style>
