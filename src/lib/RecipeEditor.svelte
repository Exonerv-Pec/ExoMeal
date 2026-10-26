<script lang="ts">
  import { recipePerServing } from '../core/nutrition';
  import { MEAL_ORDER, type Category, type Food, type MealType, type Recipe, type Unit } from '../core/types';
  import { toGrams } from '../core/units';
  import { app } from './app.svelte';
  import { fmtInt, round1 } from './format';
  import Icon from './Icon.svelte';
  import { CATEGORY_NAME, MEAL_LABEL, UNIT_NAME } from './labels';
  import Modal from './Modal.svelte';

  interface Row {
    name: string;
    qty: number | null;
    unit: Unit;
  }

  const source = app.editing && app.editing !== 'new' ? app.editing : null;

  let title = $state(source?.title ?? '');
  let meals = $state<MealType[]>(source ? [...source.meals] : ['lunch', 'dinner']);
  let servings = $state(source?.servings ?? 2);
  let time = $state(source?.time ?? 30);
  let steps = $state(source ? source.steps.join('\n') : '');
  let note = $state(source?.note ?? '');
  let rows = $state<Row[]>(
    source
      ? source.ingredients.map((i) => ({ name: app.foods.get(i.food)?.name ?? i.food, qty: i.qty, unit: i.unit }))
      : [{ name: '', qty: null, unit: 'g' }],
  );
  let errors = $state<string[]>([]);

  // New product form
  let showFood = $state(false);
  let food = $state({ name: '', category: 'other' as Category, kcal: null as number | null, protein: 0, fat: 0, carbs: 0, piece: null as number | null });
  let foodError = $state('');

  const byName = $derived(new Map([...app.foods.values()].map((f) => [f.name.toLowerCase(), f])));
  const unitList: Unit[] = ['g', 'ml', 'pcs', 'tbsp', 'tsp'];
  const categories = Object.keys(CATEGORY_NAME) as Category[];

  function resolve(name: string): Food | undefined {
    return byName.get(name.trim().toLowerCase());
  }

  const draft = $derived.by(() => {
    const ingredients = rows.flatMap((r) => {
      const f = resolve(r.name);
      if (!f || !r.qty || r.qty <= 0) return [];
      try {
        toGrams(f, r.qty, r.unit);
      } catch {
        return [];
      }
      return [{ food: f.id, qty: r.qty, unit: r.unit }];
    });
    return { servings: Math.max(1, servings || 1), ingredients } as Recipe;
  });
  const per = $derived(recipePerServing(draft, app.foods));

  function uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addFood() {
    foodError = '';
    const name = food.name.trim();
    if (!name) return (foodError = 'Введите название продукта.');
    if (byName.has(name.toLowerCase())) return (foodError = 'Такой продукт уже есть в списке.');
    if (food.kcal === null || food.kcal < 0) return (foodError = 'Укажите калорийность на 100 г.');
    app.addFood({
      id: `custom-${uid()}`,
      name,
      category: food.category,
      kcal: food.kcal,
      protein: food.protein || 0,
      fat: food.fat || 0,
      carbs: food.carbs || 0,
      ...(food.piece ? { gPerPiece: food.piece, shop: 'pcs' as const } : {}),
    });
    const last = rows[rows.length - 1];
    if (last && !last.name) last.name = name;
    food = { name: '', category: 'other', kcal: null, protein: 0, fat: 0, carbs: 0, piece: null };
    showFood = false;
  }

  function close() {
    app.editing = null;
  }

  function save() {
    const found: string[] = [];
    if (!title.trim()) found.push('Напишите название рецепта.');
    if (meals.length === 0) found.push('Выберите хотя бы один приём пищи.');
    if (!servings || servings < 1) found.push('Укажите, сколько порций получится.');

    const ingredients: Recipe['ingredients'] = [];
    for (const r of rows) {
      if (!r.name.trim() && !r.qty) continue;
      const f = resolve(r.name);
      if (!f) {
        found.push(`Продукта «${r.name.trim()}» нет в списке. Выберите из подсказок или добавьте его ниже.`);
        continue;
      }
      if (!r.qty || r.qty <= 0) {
        found.push(`Укажите количество для «${f.name}».`);
        continue;
      }
      try {
        toGrams(f, r.qty, r.unit);
      } catch {
        found.push(`Для «${f.name}» не задан вес штуки. Укажите граммы или миллилитры.`);
        continue;
      }
      ingredients.push({ food: f.id, qty: r.qty, unit: r.unit });
    }
    if (ingredients.length === 0 && found.length === 0) found.push('Добавьте хотя бы один ингредиент.');
    const stepList = steps.split('\n').map((s) => s.trim()).filter(Boolean);
    if (stepList.length === 0) found.push('Опишите хотя бы один шаг приготовления.');

    errors = found;
    if (found.length) return;

    const recipe: Recipe = {
      id: source?.id ?? `custom-${uid()}`,
      title: title.trim(),
      meals: MEAL_ORDER.filter((m) => meals.includes(m)),
      servings,
      time: time && time > 0 ? time : 1,
      ingredients,
      steps: stepList,
      ...(note.trim() ? { note: note.trim() } : {}),
      custom: true,
    };
    app.saveRecipe(recipe);
    app.editing = null;
    app.openRecipeId = recipe.id;
  }
</script>

<Modal title={source ? 'Редактировать рецепт' : 'Новый рецепт'} onclose={close} wide>
  <form
    class="form"
    onsubmit={(e) => {
      e.preventDefault();
      save();
    }}
  >
    <label class="field">
      <span>Название</span>
      <input type="text" bind:value={title} placeholder="Например, запечённая курица с овощами" />
    </label>

    <div class="trio">
      <fieldset class="field">
        <legend>Приём пищи</legend>
        <div class="chips">
          {#each MEAL_ORDER as m}
            <label class="chip"><input type="checkbox" value={m} bind:group={meals} />{MEAL_LABEL[m]}</label>
          {/each}
        </div>
      </fieldset>
      <label class="field">
        <span>Сколько порций получится</span>
        <input type="number" min="1" max="20" step="1" bind:value={servings} />
      </label>
      <label class="field">
        <span>Время, минут</span>
        <input type="number" min="1" max="600" step="1" bind:value={time} />
      </label>
    </div>

    <div class="block">
      <h3>Ингредиенты</h3>
      <datalist id="food-names">
        {#each [...app.foods.values()] as f (f.id)}<option value={f.name}></option>{/each}
      </datalist>
      <div class="rows">
        {#each rows as row, i}
          <div class="row">
            <input type="text" list="food-names" placeholder="Продукт" aria-label="Продукт {i + 1}" bind:value={row.name} />
            <input type="number" min="0" step="any" placeholder="Кол-во" aria-label="Количество {i + 1}" bind:value={row.qty} />
            <select aria-label="Единица {i + 1}" bind:value={row.unit}>
              {#each unitList as u}<option value={u}>{UNIT_NAME[u]}</option>{/each}
            </select>
            <button
              class="btn btn-quiet btn-icon"
              type="button"
              aria-label="Убрать ингредиент {i + 1}"
              disabled={rows.length === 1}
              onclick={() => rows.splice(i, 1)}
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        {/each}
      </div>
      <div class="row-actions">
        <button class="btn btn-small" type="button" onclick={() => rows.push({ name: '', qty: null, unit: 'g' })}>
          <Icon name="plus" size={14} /> Ингредиент
        </button>
        <button class="btn btn-small btn-quiet" type="button" onclick={() => (showFood = !showFood)} aria-expanded={showFood}>
          Нет нужного продукта?
        </button>
      </div>

      {#if showFood}
        <div class="newfood">
          <p class="muted">Значения на 100 г продукта. Их можно взять с упаковки.</p>
          <div class="grid2">
            <label class="field"><span>Название</span><input type="text" bind:value={food.name} /></label>
            <label class="field">
              <span>Отдел магазина</span>
              <select bind:value={food.category}>
                {#each categories as c}<option value={c}>{CATEGORY_NAME[c]}</option>{/each}
              </select>
            </label>
          </div>
          <div class="grid4">
            <label class="field"><span>Ккал</span><input type="number" min="0" step="any" bind:value={food.kcal} /></label>
            <label class="field"><span>Белки, г</span><input type="number" min="0" step="any" bind:value={food.protein} /></label>
            <label class="field"><span>Жиры, г</span><input type="number" min="0" step="any" bind:value={food.fat} /></label>
            <label class="field"><span>Углеводы, г</span><input type="number" min="0" step="any" bind:value={food.carbs} /></label>
          </div>
          <label class="field">
            <span>Вес одной штуки, г (если считаете в штуках)</span>
            <input type="number" min="1" step="any" bind:value={food.piece} />
          </label>
          {#if foodError}<p class="error" role="alert">{foodError}</p>{/if}
          <button class="btn btn-small" type="button" onclick={addFood}>Добавить продукт</button>
        </div>
      {/if}

      <p class="live">
        На порцию: <strong>{fmtInt(per.kcal)} ккал</strong>, белки {round1(per.protein)} г, жиры {round1(per.fat)} г,
        углеводы {round1(per.carbs)} г.
      </p>
    </div>

    <label class="field">
      <span>Шаги приготовления, каждый с новой строки</span>
      <textarea bind:value={steps} rows="6"></textarea>
    </label>

    <label class="field">
      <span>Заметка (необязательно)</span>
      <input type="text" bind:value={note} placeholder="Например, приготовить с вечера" />
    </label>

    {#if errors.length}
      <ul class="errors" role="alert">
        {#each errors as e}<li>{e}</li>{/each}
      </ul>
    {/if}

    <div class="actions">
      <button class="btn btn-primary" type="submit">Сохранить рецепт</button>
      <button class="btn" type="button" onclick={close}>Отмена</button>
    </div>
  </form>
</Modal>

<style>
  .form {
    display: grid;
    gap: 1.1rem;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.3rem;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--ink-soft);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .trio {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.8rem;
    align-items: start;
  }

  .block {
    display: grid;
    gap: 0.6rem;
  }

  .rows {
    display: grid;
    gap: 0.4rem;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr) 5.5rem 2rem;
    gap: 0.4rem;
    align-items: center;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .newfood {
    display: grid;
    gap: 0.7rem;
    padding: 0.9rem;
    border: 1px dashed var(--line-strong);
    border-radius: var(--r-s);
  }

  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .grid4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .live {
    font-size: 0.93rem;
    color: var(--ink-soft);
  }

  .live strong {
    color: var(--ink);
  }

  .error,
  .errors {
    color: var(--danger);
    font-size: 0.92rem;
  }

  .errors {
    margin: 0;
    padding-left: 1.2rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 640px) {
    .trio,
    .grid2 {
      grid-template-columns: 1fr;
    }
    .grid4 {
      grid-template-columns: 1fr 1fr;
    }
    .row {
      grid-template-columns: minmax(0, 1fr) 5rem 5rem 2rem;
    }
  }
</style>
