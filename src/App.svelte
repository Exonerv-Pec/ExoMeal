<script lang="ts">
  import { app, ROUTES, type Route } from './lib/app.svelte';
  import CookView from './lib/CookView.svelte';
  import PickerModal from './lib/PickerModal.svelte';
  import PlanView from './lib/PlanView.svelte';
  import ProfileView from './lib/ProfileView.svelte';
  import RecipeEditor from './lib/RecipeEditor.svelte';
  import RecipeModal from './lib/RecipeModal.svelte';
  import RecipesView from './lib/RecipesView.svelte';
  import ShoppingView from './lib/ShoppingView.svelte';

  const NAV: Record<Route, string> = {
    plan: 'Неделя',
    recipes: 'Рецепты',
    shopping: 'Покупки',
    cook: 'Готовка',
    profile: 'Профиль',
  };

  $effect(() => {
    document.title = `${NAV[app.route]}: ExoMeal`;
  });
</script>

<div class="shell">
  <header class="bar no-print">
    <a class="brand" href="#/plan" aria-label="ExoMeal, к плану недели">
      <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12V1a11 11 0 0 1 11 11z" fill="var(--yolk)" />
        <path d="M12 12h11a11 11 0 0 1-11 11z" fill="var(--leaf)" />
        <path d="M12 12v11A11 11 0 0 1 1 12z" fill="var(--berry)" />
        <path d="M12 12H1A11 11 0 0 1 12 1z" fill="var(--tangerine)" />
        <circle cx="12" cy="12" r="4.2" fill="var(--chalk)" />
      </svg>
      <span>ExoMeal</span>
    </a>
    <nav aria-label="Разделы">
      {#each ROUTES as r}
        <a href="#/{r}" aria-current={app.route === r ? 'page' : undefined}>{NAV[r]}</a>
      {/each}
    </nav>
  </header>

  <main>
    {#if app.route === 'plan'}
      <PlanView />
    {:else if app.route === 'recipes'}
      <RecipesView />
    {:else if app.route === 'shopping'}
      <ShoppingView />
    {:else if app.route === 'cook'}
      <CookView />
    {:else}
      <ProfileView />
    {/if}
  </main>

  <footer class="foot no-print">
    <p class="muted">
      ExoMeal открытый и работает офлайн: данные остаются на вашем устройстве.
      Лицензия AGPL-3.0,
      <a href="https://github.com/Exonerv-Pec/ExoMeal" rel="noopener">исходный код на GitHub</a>.
    </p>
  </footer>
</div>

{#if app.openRecipeId}<RecipeModal />{/if}
{#if app.picking}<PickerModal />{/if}
{#if app.editing}<RecipeEditor />{/if}

<style>
  .shell {
    width: min(100%, 1560px);
    margin: 0 auto;
    padding: 0 1rem 6.5rem;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 0 0.9rem;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--ink);
    text-decoration: none;
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  nav {
    display: flex;
    gap: 0.2rem;
  }

  nav a {
    padding: 0.4rem 0.8rem;
    border-radius: var(--r-s);
    color: var(--ink);
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
  }

  nav a:hover {
    background: color-mix(in oklab, var(--ink) 8%, transparent);
  }

  nav a[aria-current='page'] {
    background: var(--ink);
    color: var(--chalk);
  }

  main {
    padding-top: 0.6rem;
    min-height: 60vh;
  }

  .foot {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    font-size: 0.85rem;
  }

  /* Phones: navigation moves to the bottom edge, within thumb reach. */
  @media (max-width: 720px) {
    .bar {
      padding-bottom: 0.3rem;
    }

    nav {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 5;
      justify-content: space-around;
      gap: 0;
      padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom));
      border-top: 1px solid var(--line-strong);
      background: var(--paper);
    }

    nav a {
      flex: 1;
      padding: 0.6rem 0.2rem;
      text-align: center;
      font-size: 0.82rem;
    }
  }

  @media print {
    .shell {
      padding: 0;
    }
  }
</style>
