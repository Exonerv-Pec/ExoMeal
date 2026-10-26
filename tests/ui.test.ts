// @vitest-environment jsdom
import { mount, tick } from 'svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/core/storage';

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];
const button = (text: string) => $$<HTMLButtonElement>('button').find((b) => b.textContent?.includes(text));

async function go(route: string) {
  location.hash = `#/${route}`;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await tick();
}

describe('interface', () => {
  it('builds a week, a shopping list and cooking batches, and opens a recipe', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { default: App } = await import('../src/App.svelte');
    mount(App, { target: $('#app')! });
    await tick();

    // First visit: an invitation, not an empty grid.
    expect(document.body.textContent).toContain('Составим меню на неделю');
    expect($$('article.day')).toHaveLength(0);

    button('Собрать неделю')!.click();
    await tick();
    expect($$('article.day')).toHaveLength(7);
    for (const day of $$('article.day')) expect(day.querySelectorAll('.cell')).toHaveLength(4);
    expect(button('Собрать неделю заново')).toBeDefined();

    // Pin a meal, then rebuild: the pinned dish stays.
    const firstTitle = $$('article.day')[0].querySelector('.title')!.textContent;
    $$<HTMLButtonElement>('article.day')[0].querySelector<HTMLButtonElement>('button[aria-pressed]')!.click();
    await tick();
    button('Собрать неделю заново')!.click();
    await tick();
    const pinned = $$('article.day')[0].querySelector('.cell.locked .title')!.textContent;
    expect(pinned).toBe($$('article.day')[0].querySelector('.title')!.textContent);
    expect(firstTitle).toBeTruthy();

    await go('shopping');
    expect($('h1')!.textContent).toBe('Покупки на неделю');
    expect($$('.group').length).toBeGreaterThanOrEqual(5);
    const box = $<HTMLInputElement>('.group input[type=checkbox]')!;
    box.click();
    await tick();
    expect(document.body.textContent).toMatch(/Куплено 1 из \d+/);

    await go('cook');
    expect($('h1')!.textContent).toBe('Готовка');
    expect($$('.batches > li').length).toBeGreaterThan(8);

    await go('recipes');
    expect($$('button.card').length).toBeGreaterThanOrEqual(55);
    $$<HTMLButtonElement>('button.card')[0].click();
    await tick();
    expect($('dialog[open]')).not.toBeNull();
    expect($('dialog[open]')!.textContent).toContain('Добавить в неделю');

    // Hide the recipe that is open: it is marked, listed in the profile, and can come back.
    button('Скрыть из меню')!.click();
    await tick();
    expect(button('Вернуть в меню')).toBeDefined();
    $<HTMLButtonElement>('dialog[open] button[aria-label]')?.click();
    await tick();
    expect($$('.card.hidden')).toHaveLength(1);

    await go('profile');
    expect(document.body.textContent).toContain('Скрытые рецепты');
    expect($$('button[aria-label^="Вернуть в меню:"]')).toHaveLength(1);
    $<HTMLButtonElement>('button[aria-label^="Вернуть в меню:"]')!.click();
    await tick();
    expect(document.body.textContent).toContain('Нет скрытых рецептов');

    expect($('h1')!.textContent).toBe('Профиль');
    expect(document.body.textContent).toContain('ккал в день');

    // Everything is remembered.
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"version":1');
  });
});
