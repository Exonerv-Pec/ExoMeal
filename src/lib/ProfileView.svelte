<script lang="ts">
  import { MEAL_ORDER, type Activity, type Diet, type Exclusion, type Goal } from '../core/types';
  import { app } from './app.svelte';
  import { fmtInt } from './format';
  import Icon from './Icon.svelte';
  import { ACTIVITY_LABEL, DIET_LABEL, EXCLUSION_LABEL, GOAL_LABEL, MEAL_LABEL } from './labels';

  const activities = Object.keys(ACTIVITY_LABEL) as Activity[];
  const goals = Object.keys(GOAL_LABEL) as Goal[];
  const diets = Object.keys(DIET_LABEL) as Diet[];
  const exclusions = Object.keys(EXCLUSION_LABEL) as Exclusion[];

  const t = $derived(app.targets);
  const minor = $derived(app.safeProfile.age < 18);

  let banned = $state('');
  let message = $state('');
  let importInput: HTMLInputElement;

  const byName = $derived(new Map([...app.foods.values()].map((f) => [f.name.toLowerCase(), f.id])));

  function ban() {
    const id = byName.get(banned.trim().toLowerCase());
    if (!id) {
      message = 'Такого продукта нет в списке. Выберите его из подсказок.';
      return;
    }
    if (!app.profile.excludedFoods.includes(id)) app.profile.excludedFoods.push(id);
    banned = '';
    message = '';
  }

  function unban(id: string) {
    app.profile.excludedFoods = app.profile.excludedFoods.filter((x) => x !== id);
  }

  function exportData() {
    const blob = new Blob([app.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exomeal-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    message = 'Резервная копия скачана.';
  }

  async function importData(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      app.importJson(await file.text());
      message = 'Данные загружены.';
    } catch {
      message = 'Не удалось прочитать файл. Нужна резервная копия ExoMeal в формате JSON.';
    }
    importInput.value = '';
  }

  function resetAll() {
    if (confirm('Удалить профиль, план недели и ваши рецепты с этого устройства? Это нельзя отменить.')) {
      app.resetAll();
      message = 'Данные удалены.';
    }
  }
</script>

<section class="profile">
  <div class="head">
    <h1>Профиль</h1>
    <p class="muted">Все данные хранятся только в этом браузере и никуда не отправляются.</p>
  </div>

  <div class="columns">
    <div class="col">
      <section class="panel">
        <h2>О вас</h2>
        <div class="grid2">
          <label class="field">
            <span>Пол</span>
            <select bind:value={app.profile.sex}>
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </label>
          <label class="field">
            <span>Возраст, лет</span>
            <input type="number" min="10" max="100" bind:value={app.profile.age} />
          </label>
          <label class="field">
            <span>Рост, см</span>
            <input type="number" min="100" max="230" bind:value={app.profile.heightCm} />
          </label>
          <label class="field">
            <span>Вес, кг</span>
            <input type="number" min="30" max="300" step="0.5" bind:value={app.profile.weightKg} />
          </label>
        </div>
        <label class="field">
          <span>Активность</span>
          <select bind:value={app.profile.activity}>
            {#each activities as a}<option value={a}>{ACTIVITY_LABEL[a]}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Цель</span>
          <select bind:value={app.profile.goal}>
            {#each goals as g}<option value={g}>{GOAL_LABEL[g]}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Свои калории в день</span>
          <input type="number" min="0" step="10" placeholder={`Рассчитано: ${fmtInt(t.kcal)}`} bind:value={app.profile.kcalOverride} />
          <span class="hint">Оставьте пустым, чтобы использовать расчёт.</span>
        </label>
      </section>

      <section class="panel result" aria-live="polite">
        <h2>Ваша норма</h2>
        <p class="big"><strong>{fmtInt(t.kcal)}</strong> ккал в день</p>
        <dl>
          <div><dt>Белки</dt><dd>{t.protein} г</dd></div>
          <div><dt>Жиры</dt><dd>{t.fat} г</dd></div>
          <div><dt>Углеводы</dt><dd>{t.carbs} г</dd></div>
        </dl>
        <p class="muted small">
          Основной обмен {fmtInt(t.bmr)} ккал, с учётом активности {fmtInt(t.tdee)} ккал (формула Миффлина — Сан Жеора).
        </p>
        {#each t.warnings as w}<p class="notice">{w}</p>{/each}
        {#if minor}
          <p class="notice">Расчёт рассчитан на взрослых. Для подростков ориентируйтесь на рекомендации врача.</p>
        {/if}
      </section>
    </div>

    <div class="col">
      <section class="panel">
        <h2>Питание</h2>
        <label class="field">
          <span>Тип питания</span>
          <select bind:value={app.profile.diet}>
            {#each diets as d}<option value={d}>{DIET_LABEL[d]}</option>{/each}
          </select>
        </label>

        <fieldset class="field">
          <legend>Исключить из меню</legend>
          <div class="chips">
            {#each exclusions as e}
              <label class="chip"><input type="checkbox" value={e} bind:group={app.profile.exclusions} />{EXCLUSION_LABEL[e]}</label>
            {/each}
          </div>
        </fieldset>

        <div class="field">
          <label for="banned"><span>Не люблю или не ем</span></label>
          <datalist id="banned-list">
            {#each [...app.foods.values()] as f (f.id)}<option value={f.name}></option>{/each}
          </datalist>
          <form
            class="add"
            onsubmit={(e) => {
              e.preventDefault();
              ban();
            }}
          >
            <input id="banned" type="text" list="banned-list" placeholder="Начните вводить продукт" bind:value={banned} />
            <button class="btn" type="submit">Исключить</button>
          </form>
          {#if app.profile.excludedFoods.length}
            <ul class="banned">
              {#each app.profile.excludedFoods as id (id)}
                <li>
                  {app.foods.get(id)?.name ?? id}
                  <button class="btn btn-quiet btn-icon" type="button" aria-label="Вернуть в меню" onclick={() => unban(id)}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <fieldset class="field">
          <legend>Приёмы пищи</legend>
          <div class="chips">
            {#each MEAL_ORDER as m}
              <label class="chip"><input type="checkbox" value={m} bind:group={app.profile.meals} />{MEAL_LABEL[m]}</label>
            {/each}
          </div>
        </fieldset>

        <label class="field">
          <span>Время готовки одного блюда</span>
          <select bind:value={() => app.profile.maxTime ?? 0, (v) => (app.profile.maxTime = v === 0 ? null : Number(v))}>
            <option value={0}>Без ограничений</option>
            <option value={20}>До 20 минут</option>
            <option value={30}>До 30 минут</option>
            <option value={45}>До 45 минут</option>
            <option value={60}>До часа</option>
          </select>
        </label>

        <label class="check">
          <input type="checkbox" bind:checked={app.profile.cookForTwoDays} />
          <span>
            Готовить обед и ужин сразу на два дня
            <small class="muted">Блюда повторяются парами: меньше готовки и покупок.</small>
          </span>
        </label>
      </section>

      <section class="panel">
        <h2>Данные</h2>
        <p class="muted small">
          Сделайте резервную копию, чтобы перенести план и свои рецепты на другое устройство.
        </p>
        <div class="buttons">
          <button class="btn" type="button" onclick={exportData}><Icon name="download" size={14} /> Скачать копию</button>
          <button class="btn" type="button" onclick={() => importInput.click()}>Загрузить копию</button>
          <button class="btn btn-danger" type="button" onclick={resetAll}>Удалить всё</button>
          <input bind:this={importInput} type="file" accept="application/json,.json" hidden onchange={importData} />
        </div>
        {#if message}<p class="status" role="status">{message}</p>{/if}
      </section>
    </div>
  </div>

  <p class="disclaimer muted small">
    ExoMeal даёт ориентировочные расчёты для здоровых взрослых людей и не заменяет консультацию врача или диетолога.
    При беременности, хронических заболеваниях и расстройствах пищевого поведения составляйте рацион вместе со специалистом.
  </p>
</section>

<style>
  .profile {
    display: grid;
    gap: 1rem;
  }

  .head p {
    margin-top: 0.35rem;
    font-size: 0.95rem;
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
    gap: 1rem;
    align-items: start;
  }

  .col {
    display: grid;
    gap: 1rem;
  }

  .panel {
    display: grid;
    gap: 0.9rem;
    padding: 1.1rem 1.2rem 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--paper);
  }

  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }

  .hint {
    font-size: 0.82rem;
    font-weight: 400;
  }

  fieldset {
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

  .result .big {
    font-size: 1rem;
  }

  .result .big strong {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    border: 1px solid var(--line);
    border-radius: var(--r-s);
  }

  dl div {
    padding: 0.5rem 0.7rem;
    border-left: 1px solid var(--line);
  }

  dl div:first-child {
    border-left: 0;
  }

  dt {
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  dd {
    margin: 0;
    font-weight: 650;
  }

  .small {
    font-size: 0.86rem;
  }

  .add {
    display: flex;
    gap: 0.4rem;
  }

  .banned {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.2rem 0 0;
    padding: 0;
    list-style: none;
  }

  .banned li {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    padding: 0.1rem 0.2rem 0.1rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    font-size: 0.9rem;
  }

  .banned .btn-icon {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 999px;
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

  .check small {
    display: block;
    font-size: 0.84rem;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .status {
    font-size: 0.9rem;
    color: var(--moss-ink);
  }

  .disclaimer {
    max-width: 52rem;
  }
</style>
