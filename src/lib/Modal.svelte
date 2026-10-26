<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    title,
    onclose,
    wide = false,
    children,
  }: { title: string; onclose: () => void; wide?: boolean; children: Snippet } = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (!dialog.open) dialog.showModal();
  });

  function backdrop(e: MouseEvent) {
    if (e.target === dialog) onclose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class:wide aria-label={title} onclose={onclose} onclick={backdrop}>
  <div class="frame">
    <header>
      <h2>{title}</h2>
      <button class="btn btn-quiet btn-icon" type="button" aria-label="Закрыть" onclick={onclose}>
        <Icon name="close" size={18} />
      </button>
    </header>
    <div class="body">
      {@render children()}
    </div>
  </div>
</dialog>

<style>
  dialog {
    width: min(40rem, calc(100vw - 1.5rem));
    max-height: calc(100dvh - 1.5rem);
    padding: 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-m);
    background: var(--paper);
    color: var(--ink);
    overflow: hidden;
  }

  dialog.wide {
    width: min(64rem, calc(100vw - 1.5rem));
  }

  dialog::backdrop {
    background: color-mix(in oklab, var(--ink) 55%, transparent);
  }

  .frame {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 1.5rem);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem 0.85rem 1.25rem;
    border-bottom: 1px solid var(--line);
  }

  .body {
    padding: 1.25rem;
    overflow-y: auto;
  }
</style>
