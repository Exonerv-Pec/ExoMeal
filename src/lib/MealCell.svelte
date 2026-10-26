<script lang="ts">
  import { MAX_PORTION, MIN_PORTION, PORTION_STEP } from '../core/planner';
  import { recipePerServing } from '../core/nutrition';
  import type { MealType } from '../core/types';
  import { app } from './app.svelte';
  import { fmtInt, fmtPortions } from './format';
  import Icon from './Icon.svelte';
  import { MEAL_LABEL } from './labels';

  let { day, slot }: { day: number; slot: MealType } = $props();

  const meal = $derived(app.plan.days[day][slot]);
  const recipe = $derived(meal ? app.recipeIndex.get(meal.recipeId) : undefined);
  const kcal = $derived(recipe && meal ? recipePerServing(recipe, app.foods).kcal * meal.portions : 0);
</script>

<div class="cell meal-{slot}" class:locked={meal?.locked}>
  <span class="slot-label">{MEAL_LABEL[slot]}</span>

  {#if meal && recipe}
    <button class="title" type="button" onclick={() => (app.openRecipeId = recipe.id)}>{recipe.title}</button>
    <p class="figures">
      <span>{fmtPortions(meal.portions)}&nbsp;порц.</span>
      <strong>{fmtInt(kcal)}&nbsp;ккал</strong>
    </p>
    <div class="tools">
      <div class="stepper" role="group" aria-label="Размер порции">
        <button
          class="btn btn-quiet btn-icon"
          type="button"
          aria-label="Меньше"
          disabled={meal.portions <= MIN_PORTION}
          onclick={() => app.setPortions(day, slot, meal.portions - PORTION_STEP)}
        >
          <Icon name="minus" size={14} />
        </button>
        <button
          class="btn btn-quiet btn-icon"
          type="button"
          aria-label="Больше"
          disabled={meal.portions >= MAX_PORTION}
          onclick={() => app.setPortions(day, slot, meal.portions + PORTION_STEP)}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
      <button
        class="btn btn-quiet btn-icon"
        class:on={meal.locked}
        type="button"
        aria-pressed={meal.locked ?? false}
        aria-label={meal.locked ? 'Открепить блюдо' : 'Закрепить блюдо: оно не изменится при пересборке недели'}
        title={meal.locked ? 'Закреплено' : 'Закрепить'}
        onclick={() => app.toggleLock(day, slot)}
      >
        <Icon name="pin" size={15} />
      </button>
      <button
        class="btn btn-quiet btn-icon"
        type="button"
        aria-label="Заменить блюдо случайным"
        title="Заменить"
        onclick={() => app.swap(day, slot)}
      >
        <Icon name="shuffle" size={15} />
      </button>
      <button
        class="btn btn-quiet btn-icon"
        type="button"
        aria-label="Убрать блюдо"
        title="Убрать"
        onclick={() => app.remove(day, slot)}
      >
        <Icon name="trash" size={15} />
      </button>
    </div>
  {:else}
    <button class="empty" type="button" onclick={() => (app.picking = { day, slot })}>
      <Icon name="plus" size={14} /> Выбрать блюдо
    </button>
  {/if}
</div>

<style>
  .cell {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    padding: 0.6rem 0.65rem 0.45rem 0.85rem;
    background: color-mix(in oklab, var(--c) 11%, var(--paper));
    border-left: 5px solid var(--c);
  }

  .cell.locked {
    background: color-mix(in oklab, var(--c) 20%, var(--paper));
  }

  .slot-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-soft);
  }

  .title {
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    font-weight: 600;
    font-size: 0.92rem;
    line-height: 1.3;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .title:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .figures {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }

  .figures strong {
    color: var(--ink);
    font-weight: 600;
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.1rem;
    margin: auto -0.3rem -0.1rem -0.3rem;
    padding-top: 0.2rem;
  }

  .stepper {
    display: flex;
    margin-right: auto;
  }

  .tools .btn-icon {
    width: 1.75rem;
    height: 1.75rem;
  }

  .tools .on {
    background: var(--ink);
    color: var(--chalk);
  }

  .empty {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.15rem;
    padding: 0.55rem 0.6rem;
    border: 1px dashed var(--line-strong);
    border-radius: var(--r-s);
    background: transparent;
    color: var(--ink-soft);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .empty:hover {
    border-color: var(--ink);
    color: var(--ink);
  }

  @media (min-width: 1280px) {
    .slot-label {
      display: none;
    }
  }
</style>
