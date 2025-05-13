<script lang="ts">
  import { fade } from 'svelte/transition';
  import { theme } from '../../../theme/theme.js';
  import { onMount, onDestroy } from 'svelte';
  import { BROWSER } from 'esm-env';

  export let open = false;
  export let onClose: () => void;

  let closeButton: HTMLButtonElement;
  let scrollbarWidth: number;

  function getScrollbarWidth() {
    if (!BROWSER) return 0;
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    document.body.appendChild(outer);
    
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode?.removeChild(outer);
    
    return scrollbarWidth;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  function handleClose() {
    if (BROWSER) {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('--scrollbar-width');
    }
    onClose();
  }

  onMount(() => {
    if (BROWSER) {
      document.addEventListener('keydown', handleKeydown);
      scrollbarWidth = getScrollbarWidth();
    }
  });

  onDestroy(() => {
    if (BROWSER) {
      document.removeEventListener('keydown', handleKeydown);
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('--scrollbar-width');
    }
  });

  $: if (BROWSER && open) {
    document.body.classList.add('modal-open');
    document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
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
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    overflow: hidden;
  }

  .modal-container {
    position: relative;
    width: fit-content;
    height: fit-content;
    max-width: 90vw;
    max-height: 90vh;
    margin: auto;
    overflow: visible;
  }

  .close-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: white;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;
    z-index: 1001;
    opacity: 0.7;
  }

  .close-button:hover {
    opacity: 1;
  }

  .modal-content {
    position: relative;
    width: 100%;
    height: 100%;
  }

  :global(body.modal-open) {
    overflow: hidden;
    padding-right: var(--scrollbar-width, 0px);
  }
</style> 