<script lang="ts">
  import { NOT_PLANNED } from '../core/micro';
  import { MICRO_KEYS, type Micro } from '../core/types';
  import { fmtNum } from '../core/units';
  import { app } from './app.svelte';
  import { MICRO_LABEL, MICRO_UNIT } from './labels';

  const many = $derived(app.household.members.length > 1);
  const cov = $derived(app.viewCoverage);
  const low = $derived(MICRO_KEYS.filter((k) => !NOT_PLANNED.has(k) && cov[k] < 0.8));
  const vegan = $derived(app.safeProfile.diet === 'vegan');

  /** What the person gets per day, on average over the week. */
  function perDay(k: Micro): string {
    const v = (app.microWeek.total[k] * app.viewMember.share) / 7;
    return fmtNum(v >= 100 ? Math.round(v) : Math.round(v * 10) / 10, 1);
  }
</script>

<section class="micro" aria-labelledby="micro-title">
  <div class="head">
    <h2 id="micro-title">Витамины и минералы за неделю</h2>
    <p class="muted">
      {many ? `${app.viewMember.person.name}: сколько` : 'Сколько'} недельной нормы даёт меню.
      {#if low.length === 0}Всё, что подбирается по меню, закрыто хотя бы на 80%.{/if}
    </p>
  </div>

  <ul class="bars">
    {#each MICRO_KEYS as k (k)}
      {@const pct = Math.round(cov[k] * 100)}
      <li class:low={cov[k] < 0.8}>
        <span class="name">{MICRO_LABEL[k]}</span>
        <span class="track" aria-hidden="true"><span style="width: {Math.min(100, pct)}%"></span></span>
        <span class="pct">{pct}%</span>
        <span class="day muted">{perDay(k)} из {fmtNum(app.viewNorms[k], 1)} {MICRO_UNIT[k]} в день</span>
      </li>
    {/each}
  </ul>

  <div class="notes">
    <p class="muted small">
      Витамин D в основном вырабатывается на солнце, из еды его мало, поэтому меню под него не подбирается.
      Если его не хватает, обсудите с врачом, нужна ли добавка.
    </p>
    {#if vegan && cov.b12 < 0.5}
      <p class="notice">В растительной еде почти нет витамина B12. Веганам обычно советуют принимать его отдельно. Уточните у врача.</p>
    {/if}
    {#if app.microWeek.incomplete}
      <p class="muted small">Для некоторых ваших продуктов нет данных о витаминах, они не учтены.</p>
    {/if}
    <p class="muted small">Нормы: справочные значения Национальных академий США (RDA и AI) по полу и возрасту. Цифры ориентировочные.</p>
  </div>
</section>

<style>
  .micro {
    display: grid;
    gap: 0.8rem;
    padding: 1.1rem 1.2rem 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--paper);
  }

  .head p {
    margin-top: 0.3rem;
    font-size: 0.92rem;
  }

  .bars {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
    gap: 0.45rem 1.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .bars li {
    display: grid;
    grid-template-columns: 7.5rem 1fr 3rem;
    grid-template-areas:
      'name track pct'
      'day day day';
    align-items: center;
    gap: 0.1rem 0.6rem;
    font-size: 0.9rem;
  }

  .name {
    grid-area: name;
    font-weight: 600;
  }

  .track {
    grid-area: track;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }

  .track span {
    display: block;
    height: 100%;
    background: var(--moss);
  }

  .low .track span {
    background: var(--ink-soft);
  }

  .pct {
    grid-area: pct;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .day {
    grid-area: day;
    font-size: 0.8rem;
  }

  .notes {
    display: grid;
    gap: 0.4rem;
  }

  .small {
    font-size: 0.84rem;
  }
</style>
