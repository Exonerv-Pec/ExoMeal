<script lang="ts">
  import { fmtIngredient } from '../core/units';
  import { app } from './app.svelte';
  import { fmtMinutes, fmtPortions, portionsWord } from './format';
  import { DAY_SHORT, MEAL_LABEL } from './labels';

  const doneCount = $derived(app.prep.filter((b) => app.checked[`cook:${b.recipe.id}`]).length);
</script>

<section class="cook">
  <div class="head">
    <h1>Готовка</h1>
    {#if app.hasPlan}
      <p class="muted">
        Блюда недели собраны вместе: готовьте сразу на все приёмы пищи, где они нужны.
        {#if app.household.members.length > 1}Порции посчитаны на всю семью ({app.household.members.length} чел.).{/if}
        Сделано {doneCount} из {app.prep.length}.
      </p>
    {/if}
  </div>

  {#if !app.hasPlan}
    <div class="empty">
      <p>Здесь появится список блюд для готовки, когда вы составите меню на неделю.</p>
      <a class="btn btn-primary" href="#/plan">К плану недели</a>
    </div>
  {:else}
    <ul class="batches">
      {#each app.prep as batch (batch.recipe.id)}
        {@const key = `cook:${batch.recipe.id}`}
        {@const k = batch.portions / batch.recipe.servings}
        <li class:done={app.checked[key]}>
          <div class="top">
            <label class="done-box">
              <input type="checkbox" checked={!!app.checked[key]} onchange={() => app.toggleChecked(key)} />
              <span class="visually-hidden">Приготовлено: {batch.recipe.title}</span>
            </label>
            <div class="title">
              <h2>{batch.recipe.title}</h2>
              <p class="muted">
                Приготовить {fmtPortions(batch.portions)} {portionsWord(batch.portions)}, около
                {fmtMinutes(batch.recipe.time)}
              </p>
            </div>
            <button class="btn btn-small btn-quiet" type="button" onclick={() => (app.openRecipeId = batch.recipe.id)}>
              Рецепт
            </button>
          </div>

          <p class="uses">
            {#each batch.uses as u}
              <span class="use meal-{u.slot}">
                {DAY_SHORT[u.day]}, {MEAL_LABEL[u.slot].toLowerCase()}
                {#if u.portions !== 1}<b>×{fmtPortions(u.portions)}</b>{/if}
              </span>
            {/each}
          </p>

          <details>
            <summary>Ингредиенты и шаги</summary>
            <div class="detail">
              <ul class="ing">
                {#each batch.recipe.ingredients as ing}
                  <li>
                    <span>{app.foods.get(ing.food)?.name ?? ing.food}</span>
                    <span class="amount">{fmtIngredient(ing.qty * k, ing.unit)}</span>
                  </li>
                {/each}
              </ul>
              <ol class="steps">
                {#each batch.recipe.steps as s}<li>{s}</li>{/each}
              </ol>
            </div>
          </details>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .cook {
    display: grid;
    gap: 1rem;
  }

  .head p {
    margin-top: 0.35rem;
    max-width: 44rem;
    font-size: 0.95rem;
  }

  .empty {
    display: grid;
    gap: 0.8rem;
    justify-items: start;
    padding: 1.4rem 0;
  }

  .batches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(21rem, 1fr));
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
    align-items: start;
  }

  .batches > li {
    display: grid;
    gap: 0.7rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-s);
    background: var(--paper);
  }

  .batches > li.done h2 {
    color: var(--ink-soft);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  .top {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.7rem;
    align-items: start;
  }

  .done-box input {
    margin-top: 0.15rem;
    width: 1.3rem;
    height: 1.3rem;
  }

  .title p {
    font-size: 0.88rem;
  }

  .uses {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.82rem;
  }

  .use {
    padding: 0.1rem 0.55rem 0.1rem 0.5rem;
    border-left: 4px solid var(--c);
    background: color-mix(in oklab, var(--c) 12%, var(--paper));
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.92rem;
  }

  .detail {
    display: grid;
    gap: 0.8rem;
    margin-top: 0.7rem;
  }

  .ing {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--line);
  }

  .ing li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--line);
    font-size: 0.92rem;
  }

  .amount {
    font-weight: 600;
    white-space: nowrap;
  }

  .steps {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.93rem;
  }
</style>
