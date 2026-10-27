<script lang="ts">
  // Simple everyday rules. Plain advice, no counting shame.
  const tips: { title: string; text: string }[] = [
    {
      title: 'Белок и овощи в каждом приёме пищи',
      text: 'Генератор старается ставить в завтрак, обед и ужин блюда, где есть и то и другое. Если блюдо без овощей, добавьте к нему салат или нарезку.',
    },
    { title: 'Ешьте медленно', text: 'Сытость приходит не сразу. Спокойная еда без экрана помогает почувствовать, когда хватит.' },
    {
      title: 'Пейте воду',
      text: 'Больше воды и напитков без сахара: чай, кофе без сиропов, минеральная вода. Меньше сладкой газировки, соков и калорийных кофейных напитков.',
    },
    { title: 'Двигайтесь', text: 'Силовые тренировки пару раз в неделю и больше ходьбы каждый день.' },
    { title: 'Высыпайтесь', text: 'Недосып усиливает голод и тягу к сладкому. Старайтесь спать 7–9 часов.' },
    {
      title: 'Правило 80/20',
      text: 'Около 80% рациона — простая полезная еда, 20% — то, что просто нравится, в том числе сладкое. Понемногу всего и ничего слишком много.',
    },
  ];
</script>

<details class="tips">
  <summary>
    <span class="title">Простые правила</span>
    <span class="muted">Шесть привычек, на которые опирается меню</span>
  </summary>
  <ul>
    {#each tips as t}
      <li>
        <strong>{t.title}</strong>
        <span>{t.text}</span>
      </li>
    {/each}
  </ul>
  <p class="muted small">
    Расчёт калорий: белки и углеводы дают 4 ккал на грамм, жиры 9 ккал. Для снижения веса из нормы вычитается
    500 ккал, для набора добавляется 200 ккал, но норма не опускается ниже безопасного минимума.
  </p>
</details>

<style>
  .tips {
    padding: 0.9rem 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--paper);
  }

  summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.8rem;
    cursor: pointer;
  }

  .title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.05rem;
  }

  summary .muted {
    font-size: 0.9rem;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: 0.8rem 1.4rem;
    margin: 1rem 0 0.8rem;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.2rem;
    padding-left: 0.8rem;
    border-left: 3px solid var(--moss);
    font-size: 0.92rem;
  }

  .small {
    font-size: 0.84rem;
  }
</style>
