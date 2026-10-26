<script lang="ts">
  import { groupShoppingList, shoppingToText } from '../core/shopping';
  import type { ShoppingItem } from '../core/types';
  import { app } from './app.svelte';
  import Icon from './Icon.svelte';

  const groups = $derived(groupShoppingList(app.shopping));
  const buyItems = $derived(groups.buy.flatMap((g) => g.items));
  const done = $derived(buyItems.filter((i) => app.checked[i.foodId]).length);

  let status = $state('');

  function usedIn(item: ShoppingItem): string {
    const [a, b, ...rest] = item.usedIn;
    if (!b) return a ?? '';
    return rest.length ? `${a}, ${b} и ещё ${rest.length}` : `${a}, ${b}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shoppingToText(app.shopping));
      status = 'Список скопирован.';
    } catch {
      status = 'Не удалось скопировать. Выделите список вручную или скачайте файл.';
    }
  }

  function download() {
    const blob = new Blob([shoppingToText(app.shopping)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exomeal-pokupki.txt';
    a.click();
    URL.revokeObjectURL(url);
    status = 'Файл скачан.';
  }

  function resetTicks() {
    app.checked = {};
    status = '';
  }
</script>

<section class="shopping">
  <div class="head">
    <div>
      <h1>Покупки на неделю</h1>
      {#if app.hasPlan}
        <p class="muted">
          Куплено {done} из {buyItems.length}. Количества собраны из всех блюд недели{app.household.members.length > 1
            ? `, на ${app.household.members.length} чел.`
            : '.'}
        </p>
      {/if}
    </div>
    {#if app.hasPlan}
      <div class="actions no-print">
        <button class="btn btn-small" type="button" onclick={copy}><Icon name="copy" size={14} /> Копировать</button>
        <button class="btn btn-small" type="button" onclick={download}><Icon name="download" size={14} /> Скачать</button>
        <button class="btn btn-small" type="button" onclick={() => window.print()}><Icon name="print" size={14} /> Печать</button>
        <button class="btn btn-small btn-quiet" type="button" onclick={resetTicks} disabled={done === 0}>Снять отметки</button>
      </div>
    {/if}
  </div>
  <p class="status no-print" role="status">{status}</p>

  {#if !app.hasPlan}
    <div class="empty">
      <p>Список появится, когда вы составите меню на неделю.</p>
      <a class="btn btn-primary" href="#/plan">К плану недели</a>
    </div>
  {:else}
    <div class="lists">
      {#each groups.buy as group (group.category)}
        <section class="group">
          <h2>{group.title}</h2>
          <ul>
            {#each group.items as item (item.foodId)}
              <li class:done={app.checked[item.foodId]}>
                <label>
                  <input type="checkbox" checked={!!app.checked[item.foodId]} onchange={() => app.toggleChecked(item.foodId)} />
                  <span class="name">
                    {item.name}
                    <small class="muted">{usedIn(item)}</small>
                  </span>
                  <span class="amount">{item.label}</span>
                </label>
              </li>
            {/each}
          </ul>
        </section>
      {/each}

      {#if groups.staples.length}
        <section class="group staples">
          <h2>Проверьте, есть ли дома</h2>
          <p class="muted">Масла, соусы и специи обычно уже на кухне. Отметьте то, что есть.</p>
          <ul>
            {#each groups.staples as item (item.foodId)}
              <li class:done={app.checked[item.foodId]}>
                <label>
                  <input type="checkbox" checked={!!app.checked[item.foodId]} onchange={() => app.toggleChecked(item.foodId)} />
                  <span class="name">{item.name}</span>
                  <span class="amount">{item.label}</span>
                </label>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  {/if}
</section>

<style>
  .shopping {
    display: grid;
    gap: 0.9rem;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 0.8rem 1.5rem;
  }

  .head p {
    margin-top: 0.35rem;
    font-size: 0.95rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .status {
    min-height: 1.3rem;
    margin-top: -0.4rem;
    font-size: 0.9rem;
    color: var(--moss-ink);
  }

  .empty {
    display: grid;
    gap: 0.8rem;
    justify-items: start;
    padding: 1.4rem 0;
  }

  .lists {
    columns: 20rem;
    column-gap: 1.2rem;
  }

  .group {
    break-inside: avoid;
    margin-bottom: 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-s);
    background: var(--paper);
    overflow: hidden;
  }

  .group h2 {
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid var(--line-strong);
    background: color-mix(in oklab, var(--moss) 9%, var(--paper));
    font-size: 1rem;
  }

  .staples > p {
    padding: 0.6rem 0.9rem 0;
    font-size: 0.88rem;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    border-top: 1px dashed var(--line);
  }

  label {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 0.65rem;
    padding: 0.55rem 0.9rem;
    cursor: pointer;
  }

  label input {
    margin-top: 0.2rem;
  }

  .name {
    display: grid;
    line-height: 1.3;
  }

  .name small {
    font-size: 0.78rem;
  }

  .amount {
    font-weight: 650;
    white-space: nowrap;
  }

  li.done .name,
  li.done .amount {
    color: var(--ink-soft);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  @media print {
    .group {
      border-color: #999;
    }
    .group h2 {
      background: none;
    }
  }
</style>
