<script lang="ts">
  import { MAX_BATCH_DAYS, MEAL_ORDER } from '../core/types';
  import { app } from './app.svelte';
  import { plural } from './format';
  import { MEAL_LABEL } from './labels';

  /** compact: one line for the week page; changing it rebuilds the week. */
  let { compact = false }: { compact?: boolean } = $props();

  const options = Array.from({ length: MAX_BATCH_DAYS }, (_, i) => i + 1);
  const label = (n: number) => (n === 1 ? 'Каждый день новое' : `На ${n} ${plural(n, ['день', 'дня', 'дней'])}`);
  const meals = $derived(MEAL_ORDER.filter((m) => app.profile.meals.includes(m)));
  const hasPair = $derived(app.profile.meals.includes('lunch') && app.profile.meals.includes('dinner'));

  function setDays(v: number) {
    app.profile.batchDays = v;
    if (compact && app.hasPlan) app.generate();
  }
</script>

{#if compact}
  <div class="compact no-print">
    <label>
      <span class="muted">Готовить одно блюдо</span>
      <select value={app.profile.batchDays} onchange={(e) => setDays(Number(e.currentTarget.value))}>
        {#each options as n}<option value={n}>{label(n).toLowerCase()}</option>{/each}
      </select>
    </label>
    {#if hasPair}
      <label class="inline">
        <input
          type="checkbox"
          checked={app.profile.sameLunchDinner}
          onchange={(e) => {
            app.profile.sameLunchDinner = e.currentTarget.checked;
            if (app.hasPlan) app.generate();
          }}
        />
        <span>Ужин тем же, что и обед</span>
      </label>
    {/if}
    {#if app.hasPlan}
      <span class="muted">{app.dishCount} {plural(app.dishCount, ['разное блюдо', 'разных блюда', 'разных блюд'])} за неделю</span>
    {/if}
  </div>
{:else}
  <fieldset class="field batch">
    <legend>Готовка впрок</legend>
    <label class="field">
      <span>Готовить одно блюдо</span>
      <select value={app.profile.batchDays} onchange={(e) => setDays(Number(e.currentTarget.value))}>
        {#each options as n}<option value={n}>{label(n)}</option>{/each}
      </select>
    </label>
    {#if app.profile.batchDays > 1}
      <div class="chips" role="group" aria-label="Что повторять">
        {#each meals as m}
          <label class="chip"><input type="checkbox" value={m} bind:group={app.profile.batchMeals} />{MEAL_LABEL[m]}</label>
        {/each}
      </div>
      <small class="muted">
        Отмеченные приёмы пищи повторяются до {app.profile.batchDays} {plural(app.profile.batchDays, ['дня', 'дней', 'дней'])} подряд. Готовое блюдо хранится в холодильнике
        3–4 дня.
      </small>
    {/if}
    {#if hasPair}
      <label class="check">
        <input type="checkbox" bind:checked={app.profile.sameLunchDinner} />
        <span>
          Ужин тем же блюдом, что и обед
          <small class="muted">Одна кастрюля на день вместо двух.</small>
        </span>
      </label>
    {/if}
  </fieldset>
{/if}

<style>
  .compact {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.2rem;
    font-size: 0.92rem;
  }

  .compact label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .compact select {
    width: auto;
    padding-block: 0.3rem;
  }

  .inline {
    cursor: pointer;
  }

  .batch {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.4rem;
    font-weight: 600;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  small {
    display: block;
    font-size: 0.84rem;
  }

  .check {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    align-items: start;
    cursor: pointer;
  }

  .check input {
    margin-top: 0.2rem;
  }
</style>
