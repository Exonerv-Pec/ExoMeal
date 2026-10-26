<script lang="ts">
  import type { Recipe } from '../core/types';
  import { app } from './app.svelte';
  import { DAY_NAMES, MEAL_LABEL } from './labels';
  import Modal from './Modal.svelte';
  import RecipesView from './RecipesView.svelte';

  const target = $derived(app.picking);

  function close() {
    app.picking = null;
  }

  function choose(r: Recipe) {
    if (!target) return;
    app.place(target.day, target.slot, r.id);
    close();
  }
</script>

{#if target}
  <Modal title="{DAY_NAMES[target.day]}, {MEAL_LABEL[target.slot].toLowerCase()}: выберите блюдо" onclose={close} wide>
    <RecipesView pick={target.slot} onpick={choose} />
  </Modal>
{/if}
