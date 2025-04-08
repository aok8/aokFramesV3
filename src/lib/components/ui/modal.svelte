<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { theme } from '../../../theme/theme.js';
  import { onMount, onDestroy } from 'svelte';
  import { BROWSER } from 'esm-env';

  export let open = false;
  export let onClose: () => void;

  let closeButton: HTMLButtonElement;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  function handleClose() {
    if (BROWSER) {
      document.body.style.overflow = '';
    }
    onClose();
  }

  onMount(() => {
    if (BROWSER) {
      document.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (BROWSER) {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  });

  $: if (open && BROWSER) {
    document.body.style.overflow = 'hidden';
    // Focus the close button when modal opens
    setTimeout(() => closeButton?.focus(), 0);
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div 
    class="modal-backdrop"
    role="presentation"
    on:click|self={handleClose}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <button 
        bind:this={closeButton}
        class="close-button" 
        on:click={handleClose}
        aria-label="Close modal"
      >×</button>
      <div class="modal-content" id="modal-title">
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
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-container {
    background: var(--bg-color);
    padding: 2rem;
    border-radius: 8px;
    position: relative;
    max-width: 90%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
    z-index: 1;
  }

  .close-button:hover {
    color: #333;
  }

  .close-button:focus {
    outline: none;
  }

  .modal-content {
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    height: fit-content;
  }

  .modal-content :global(img) {
    display: block;
    margin: 0;
    padding: 0;
    max-width: 100%;
    height: auto;
  }
</style> 