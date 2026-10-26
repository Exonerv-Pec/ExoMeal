<script lang="ts">
  type Name = 'pin' | 'shuffle' | 'trash' | 'plus' | 'minus' | 'close' | 'copy' | 'print' | 'download' | 'plate';
  let { name, size = 16 }: { name: Name; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'pin'}
    <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
    <path d="M12 14v7" />
  {:else if name === 'shuffle'}
    <path d="M3 7h3c5 0 6 10 11 10h4" />
    <path d="M3 17h3c2 0 3.2-1.6 4.3-3.3" />
    <path d="M13.7 9.3C14.8 7.6 15.5 7 17 7h4" />
    <path d="m18 4 3 3-3 3" />
    <path d="m18 14 3 3-3 3" />
  {:else if name === 'trash'}
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'minus'}
    <path d="M5 12h14" />
  {:else if name === 'close'}
    <path d="M6 6l12 12M18 6 6 18" />
  {:else if name === 'copy'}
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  {:else if name === 'print'}
    <path d="M7 9V3h10v6" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M7 14h10v7H7z" />
  {:else if name === 'download'}
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  {:else if name === 'plate'}
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
  {/if}
</svg>
