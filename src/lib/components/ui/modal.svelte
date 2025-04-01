<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { theme } from '../../../theme/theme.js';
  import { onMount } from 'svelte';

  export let open = false;
  export let onClose: () => void;

  $: if (open) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  } else {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  onMount(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  });
</script>

{#if open}
  <div 
    class="modal-backdrop"
    on:click={() => onClose()}
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="modal-container"
      on:click|stopPropagation
      transition:scale={{ duration: 200, start: 0.95 }}
      style="--bg-color: {theme.text.primary};"
    >
      <button 
        class="close-button" 
        on:click={() => onClose()}
        aria-label="Close modal"
      >×</button>
      <div class="modal-content">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
  }

  .modal-container {
    background-color: var(--bg-color);
    padding: 3rem 3rem 3rem;
    border-radius: 8px;
    position: relative;
    width: 95vw;
    max-width: 1200px;
    max-height: 90vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal-content {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .close-button {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: none;
    border: none;
    color: white;
    font-size: 2rem;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    z-index: 10;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .close-button:hover {
    color: black;
  }
</style> 