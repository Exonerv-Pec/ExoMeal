<script lang="ts">
  import { microNorms } from '../core/micro';
  import { MACRO_LIMITS } from '../core/nutrition';
  import { MAX_PEOPLE, MEAL_ORDER, MICRO_KEYS, type Activity, type Diet, type Exclusion, type Goal, type MacroSplit } from '../core/types';
  import { fmtNum } from '../core/units';
  import { app } from './app.svelte';
  import { fmtInt, fmtPortions } from './format';
  import Icon from './Icon.svelte';
  import { ACTIVITY_LABEL, DIET_LABEL, EXCLUSION_LABEL, GOAL_LABEL, MACRO_PRESET_LABEL, MEAL_LABEL, MICRO_LABEL, MICRO_UNIT } from './labels';

  const activities = Object.keys(ACTIVITY_LABEL) as Activity[];
  const goals = Object.keys(GOAL_LABEL) as Goal[];
  const diets = Object.keys(DIET_LABEL) as Diet[];
  const exclusions = Object.keys(EXCLUSION_LABEL) as Exclusion[];

  let sel = $state(0);
  const idx = $derived(Math.min(sel, app.profile.people.length - 1));
  const member = $derived(app.household.members[Math.min(idx, app.household.members.length - 1)]);
  const t = $derived(member.targets);
  const norms = $derived(microNorms(member.person, t.kcal));
  const presets = Object.keys(MACRO_PRESET_LABEL) as MacroSplit['preset'][];

  function addPerson() {
    const i = app.addPerson();
    if (i >= 0) sel = i;
  }

  function removePerson() {
    const name = app.profile.people[idx]?.name ?? '';
    if (confirm(`Убрать «${name}» из семьи?`)) {
      app.removePerson(idx);
      sel = 0;
    }
  }

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

  const hiddenRecipes = $derived(
    app.safeProfile.hiddenRecipes.flatMap((id) => {
      const r = app.recipeIndex.get(id);
      return r ? [r] : [];
    }),
  );

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
        <div class="panel-head">
          <h2>{app.profile.people.length > 1 ? 'Семья' : 'О вас'}</h2>
          <button class="btn btn-small" type="button" onclick={addPerson} disabled={app.profile.people.length >= MAX_PEOPLE}>
            <Icon name="plus" size={14} /> Добавить человека
          </button>
        </div>
        {#if app.profile.people.length > 1}
          <div class="people" role="group" aria-label="Чьи данные показать">
            {#each app.household.members as m, i (m.person.id)}
              <button class="chip person" type="button" aria-pressed={i === idx} onclick={() => (sel = i)}>
                {m.person.name}
                <span class="muted">{fmtInt(m.targets.kcal)}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="muted small">Готовите на семью? Добавьте людей: у каждого будет своя норма, меню общее, а покупки посчитаются на всех.</p>
        {/if}

        <label class="field">
          <span>Имя</span>
          <input type="text" maxlength="40" bind:value={app.profile.people[idx].name} />
        </label>
        <div class="grid2">
          <label class="field">
            <span>Пол</span>
            <select bind:value={app.profile.people[idx].sex}>
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </label>
          <label class="field">
            <span>Возраст, лет</span>
            <input type="number" min="10" max="100" bind:value={app.profile.people[idx].age} />
          </label>
          <label class="field">
            <span>Рост, см</span>
            <input type="number" min="100" max="230" bind:value={app.profile.people[idx].heightCm} />
          </label>
          <label class="field">
            <span>Вес, кг</span>
            <input type="number" min="30" max="300" step="0.5" bind:value={app.profile.people[idx].weightKg} />
          </label>
        </div>
        <label class="field">
          <span>Активность</span>
          <select bind:value={app.profile.people[idx].activity}>
            {#each activities as a}<option value={a}>{ACTIVITY_LABEL[a]}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Цель</span>
          <select bind:value={app.profile.people[idx].goal}>
            {#each goals as g}<option value={g}>{GOAL_LABEL[g]}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Свои калории в день</span>
          <input type="number" min="0" step="10" placeholder={`Рассчитано: ${fmtInt(t.kcal)}`} bind:value={app.profile.people[idx].kcalOverride} />
          <span class="hint">Оставьте пустым, чтобы использовать расчёт.</span>
        </label>
        <label class="field">
          <span>Белки, жиры, углеводы</span>
          <select bind:value={app.profile.people[idx].macros.preset}>
            {#each presets as m}<option value={m}>{MACRO_PRESET_LABEL[m]}</option>{/each}
          </select>
        </label>
        {#if app.profile.people[idx].macros.preset === 'custom'}
          <div class="grid3">
            <label class="field">
              <span>Белки, %</span>
              <input type="number" min={MACRO_LIMITS.protein[0]} max={MACRO_LIMITS.protein[1]} bind:value={app.profile.people[idx].macros.protein} />
            </label>
            <label class="field">
              <span>Жиры, %</span>
              <input type="number" min={MACRO_LIMITS.fat[0]} max={MACRO_LIMITS.fat[1]} bind:value={app.profile.people[idx].macros.fat} />
            </label>
            <div class="field">
              <span>Углеводы, %</span>
              <output class="carbs">{t.split.carbs}</output>
            </div>
          </div>
          <span class="hint">
            Белки {MACRO_LIMITS.protein[0]}–{MACRO_LIMITS.protein[1]}%, жиры {MACRO_LIMITS.fat[0]}–{MACRO_LIMITS.fat[1]}%,
            углеводы получают остаток.
          </span>
        {/if}
        {#if idx > 0}
          <button class="btn btn-quiet btn-small remove" type="button" onclick={removePerson}>
            <Icon name="trash" size={14} /> Убрать из семьи
          </button>
        {/if}
      </section>

      <section class="panel result" aria-live="polite">
        <h2>{app.profile.people.length > 1 ? `Норма: ${member.person.name}` : 'Ваша норма'}</h2>
        <p class="big"><strong>{fmtInt(t.kcal)}</strong> ккал в день</p>
        <dl>
          <div><dt>Белки</dt><dd>{t.protein} г</dd></div>
          <div><dt>Жиры</dt><dd>{t.fat} г</dd></div>
          <div><dt>Углеводы</dt><dd>{t.carbs} г</dd></div>
        </dl>
        <p class="split muted small">
          Белки {t.split.protein}% · жиры {t.split.fat}% · углеводы {t.split.carbs}% калорий
        </p>
        {#if t.split.fat < 20}
          <p class="muted small">Жиров меньше 20% калорий: это ниже, чем обычно советуют ВОЗ и EFSA (20–35%).</p>
        {/if}
        <p class="muted small">
          Основной обмен {fmtInt(t.bmr)} ккал, с учётом активности {fmtInt(t.tdee)} ккал (формула Миффлина — Сан Жеора).
        </p>
        <details class="norms">
          <summary>Витамины и минералы в день</summary>
          <table>
            <tbody>
              {#each MICRO_KEYS as k (k)}
                <tr><th scope="row">{MICRO_LABEL[k]}</th><td>{fmtNum(norms[k], 1)} {MICRO_UNIT[k]}</td></tr>
              {/each}
            </tbody>
          </table>
          <p class="muted small">Справочные нормы Национальных академий США по полу и возрасту; клетчатка 14 г на 1000 ккал.</p>
        </details>
        {#each t.warnings as w}<p class="notice">{w}</p>{/each}

        {#if app.profile.people.length > 1}
          <h3>Вся семья</h3>
          <table class="family">
            <thead>
              <tr><th scope="col">Кто</th><th scope="col">Ккал</th><th scope="col">Б</th><th scope="col">Ж</th><th scope="col">У</th><th scope="col">Порция</th></tr>
            </thead>
            <tbody>
              {#each app.household.members as m (m.person.id)}
                <tr>
                  <th scope="row">{m.person.name}</th>
                  <td>{fmtInt(m.targets.kcal)}</td>
                  <td>{m.targets.protein}</td>
                  <td>{m.targets.fat}</td>
                  <td>{m.targets.carbs}</td>
                  <td>×{fmtPortions(Math.round(m.share * 100) / 100)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="muted small">
            Меню общее: блюда и порции подбираются под первого в списке ({app.household.members[0].person.name}),
            остальные едят те же блюда, а размер порции меняется по их норме. Покупки и готовка считаются на всех.
          </p>
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

        <div class="field">
          <span class="label">Скрытые рецепты</span>
          {#if hiddenRecipes.length}
            <ul class="banned">
              {#each hiddenRecipes as r (r.id)}
                <li>
                  {r.title}
                  <button class="btn btn-quiet btn-icon" type="button" aria-label="Вернуть в меню: {r.title}" onclick={() => app.toggleHidden(r.id)}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="muted small">Нет скрытых рецептов. Скрыть рецепт можно в его карточке.</p>
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

  .panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .people {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .person {
    gap: 0.45rem;
    cursor: pointer;
  }

  .person[aria-pressed='true'] {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--chalk);
  }

  .person[aria-pressed='true'] .muted {
    color: inherit;
    opacity: 0.75;
  }

  .remove {
    justify-self: start;
  }

  .family {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }

  .family th,
  .family td {
    padding: 0.35rem 0.4rem;
    border-bottom: 1px solid var(--line);
    text-align: right;
  }

  .family th:first-child {
    text-align: left;
    font-weight: 600;
  }

  .family thead th {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-soft);
  }

  .grid3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.7rem;
  }

  .carbs {
    display: flex;
    align-items: center;
    min-height: 2.6rem;
    font-weight: 650;
  }

  .norms summary {
    cursor: pointer;
    font-weight: 600;
  }

  .norms table {
    width: 100%;
    margin: 0.5rem 0;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .norms th,
  .norms td {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--line);
    text-align: left;
    font-weight: 400;
  }

  .norms td {
    text-align: right;
    font-variant-numeric: tabular-nums;
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

  .label {
    font-weight: 600;
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
