<script lang="ts">
  import { dayNutrition, makeCtx, slotsOf } from '../core/planner';
  import { app } from './app.svelte';
  import { fmtInt } from './format';
  import MealCell from './MealCell.svelte';
  import { DAY_NAMES, DAY_SHORT, MEAL_LABEL } from './labels';

  const slots = $derived(slotsOf(app.safeProfile));
  const ctx = $derived(makeCtx(app.safeProfile, app.targets, app.recipes, app.foods));
  const days = $derived(app.plan.days.map((d) => dayNutrition(ctx, d)));
  const rows = $derived(slots.length + 2);

  function progress(kcal: number): number {
    return Math.min(100, Math.round((kcal / app.targets.kcal) * 100));
  }
</script>

<section class="plan">
  <div class="top">
    <div>
      <h1>Неделя</h1>
      <p class="targets muted">
        Цель на день: <strong>{fmtInt(app.targets.kcal)} ккал</strong>,
        белки {app.targets.protein} г, жиры {app.targets.fat} г, углеводы {app.targets.carbs} г.
        <a href="#/profile">Изменить</a>
      </p>
    </div>
    <div class="actions no-print">
      <button class="btn btn-primary" type="button" onclick={() => app.generate()}>
        {app.hasPlan ? 'Собрать неделю заново' : 'Собрать неделю'}
      </button>
      {#if app.lockedCount > 0}
        <button class="btn" type="button" onclick={() => app.unlockAll()}>
          Открепить всё ({app.lockedCount})
        </button>
      {/if}
    </div>
  </div>

  {#each app.targets.warnings as w}
    <p class="notice">{w}</p>
  {/each}
  {#if app.missingSlots.length}
    <p class="notice">
      Для приёмов пищи «{app.missingSlots.map((s) => MEAL_LABEL[s]).join('», «')}» не осталось рецептов.
      Ослабьте ограничения в <a href="#/profile">профиле</a> или добавьте свои рецепты.
    </p>
  {/if}

  {#if !app.hasPlan}
    <div class="welcome">
      <h2>Составим меню на неделю</h2>
      <p>
        ExoMeal подберёт случайные блюда так, чтобы каждый день попадал в вашу норму калорий и белка,
        а затем посчитает, что купить. Расчёт идёт по параметрам из профиля: сейчас там значения по умолчанию.
      </p>
      <div class="row">
        <button class="btn btn-primary" type="button" onclick={() => app.generate()}>Собрать неделю</button>
        <a class="btn" href="#/profile">Сначала настроить профиль</a>
      </div>
    </div>
  {:else}
    <div class="week" style="--rows: {rows}">
      <div class="gutter" aria-hidden="true">
        <div class="gutter-head"></div>
        {#each slots as s}
          <div class="gutter-cell meal-{s}"><span>{MEAL_LABEL[s]}</span></div>
        {/each}
        <div class="gutter-foot"></div>
      </div>

      {#each app.plan.days as _, d}
        {@const n = days[d]}
        <article class="day" aria-label={DAY_NAMES[d]}>
          <header>
            <h2>
              <span class="long">{DAY_NAMES[d]}</span>
              <span class="short" aria-hidden="true">{DAY_SHORT[d]}</span>
            </h2>
            <p class="kcal">
              <strong>{fmtInt(n.kcal)}</strong>
              <span class="muted">из {fmtInt(app.targets.kcal)} ккал</span>
            </p>
            <div
              class="bar"
              role="progressbar"
              aria-label="Калории за день"
              aria-valuenow={Math.round(n.kcal)}
              aria-valuemin={0}
              aria-valuemax={app.targets.kcal}
            >
              <div style="width: {progress(n.kcal)}%"></div>
            </div>
          </header>

          {#each slots as s}
            <MealCell day={d} slot={s} />
          {/each}

          <footer>
            <span>Б {Math.round(n.protein)}</span>
            <span>Ж {Math.round(n.fat)}</span>
            <span>У {Math.round(n.carbs)}</span>
          </footer>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .plan {
    display: grid;
    gap: 1.1rem;
  }

  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 0.8rem 1.5rem;
  }

  .targets {
    margin-top: 0.35rem;
    font-size: 0.95rem;
    max-width: 48rem;
  }

  .targets strong {
    color: var(--ink);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .welcome {
    display: grid;
    gap: 0.9rem;
    max-width: 38rem;
    padding: 1.4rem 1.5rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--paper);
  }

  .welcome .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* --- Week: stacked days on small screens, a timetable on wide ones --- */

  .week {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 0.9rem;
  }

  .gutter {
    display: none;
  }

  .day {
    display: flex;
    flex-direction: column;
    gap: 2px;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--line);
    overflow: hidden;
  }

  .day header,
  .day footer {
    background: var(--paper);
  }

  .day header {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem 0.85rem 0.6rem;
  }

  .short {
    display: none;
  }

  .kcal {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    font-size: 0.85rem;
  }

  .kcal strong {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
  }

  .bar {
    height: 4px;
    border-radius: 2px;
    background: var(--line);
  }

  .bar div {
    height: 100%;
    border-radius: 2px;
    background: var(--moss);
    transition: width 0.25s ease;
  }

  .day footer {
    display: flex;
    gap: 0.9rem;
    padding: 0.45rem 0.85rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }

  @media (min-width: 1280px) {
    .week {
      grid-template-columns: 5.5rem repeat(7, minmax(0, 1fr));
      grid-template-rows: repeat(var(--rows), auto);
      gap: 0;
      border: 1px solid var(--line-strong);
      border-radius: var(--r-m);
      background: var(--line);
      overflow: hidden;
    }

    .gutter {
      display: grid;
      grid-template-rows: subgrid;
      grid-row: 1 / span var(--rows);
      gap: 2px;
      background: var(--paper);
    }

    .gutter-head,
    .gutter-foot {
      background: var(--paper);
    }

    .gutter-cell {
      display: flex;
      align-items: center;
      padding: 0 0.6rem;
      border-left: 5px solid var(--c);
      background: color-mix(in oklab, var(--c) 11%, var(--paper));
      font-size: 0.88rem;
      font-weight: 600;
    }

    .day {
      display: grid;
      grid-template-rows: subgrid;
      grid-row: 1 / span var(--rows);
      border: 0;
      border-left: 2px solid var(--line);
      border-radius: 0;
    }

    .day header {
      gap: 0.25rem;
    }

    .long {
      display: none;
    }

    .short {
      display: inline;
    }
  }
</style>
