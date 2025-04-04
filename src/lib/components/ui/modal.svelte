<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { theme } from '../../../theme/theme.js';
  import { onMount } from 'svelte';

  export let open = false;
  export let onClose: () => void;

  let closeButton: HTMLButtonElement;

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  });

  $: if (open) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    // Focus the close button when modal opens
    setTimeout(() => closeButton?.focus(), 0);
  }
</script>

{#if open}
  <div 
    class="modal-backdrop"
    role="presentation"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      transition:scale={{ duration: 200, start: 0.95 }}
      style="--bg-color: {theme.text.primary};"
    >
      <button 
        bind:this={closeButton}
        class="close-button" 
        on:click={onClose}
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
    padding: 20px;
    border-radius: 8px;
    position: relative;
    max-width: 90%;
    max-height: 90vh;
    overflow: auto;
  }

  .close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: inherit;
    padding: 5px 10px;
    border-radius: 4px;
  }

  .close-button:hover {
    background: rgba(0, 0, 0, 0.1);
  }

  .close-button:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .modal-content {
    margin-top: 20px;
  }
</style> 