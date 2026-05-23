<script lang="ts">
  import { onMount } from 'svelte';

  let {
    src = '',
    alt = '',
    open = false,
    onclose
  }: {
    src: string;
    alt: string;
    open: boolean;
    onclose: () => void;
  } = $props();

  // Close on Escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  // Close when clicking the backdrop (not the image itself)
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  // Lock body scroll while open
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="lb-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Image lightbox">
    <button class="lb-close" onclick={onclose} aria-label="Close lightbox">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="17" y1="1" x2="1" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="lb-frame">
      <img class="lb-img" {src} {alt} />
    </div>
  </div>
{/if}

<style>
  .lb-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(8, 8, 8, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    animation: lb-fade-in 0.2s ease;
    cursor: zoom-out;
  }

  @keyframes lb-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .lb-close {
    position: fixed;
    top: 1.25rem;
    right: 1.5rem;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: rgba(200, 192, 184, 0.6);
    cursor: pointer;
    transition: color 0.2s ease;
    padding: 0;
    z-index: 1001;
  }

  .lb-close:hover {
    color: rgba(200, 192, 184, 1);
  }

  .lb-frame {
    max-width: min(90vw, 1200px);
    max-height: 90vh;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    animation: lb-scale-in 0.2s ease;
  }

  @keyframes lb-scale-in {
    from { transform: scale(0.96); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }

  .lb-img {
    display: block;
    max-width: 100%;
    max-height: 90vh;
    width: auto;
    height: auto;
    object-fit: contain;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
  }

  @media (max-width: 640px) {
    .lb-backdrop {
      padding: 1rem;
    }

    .lb-frame {
      max-width: 100vw;
      max-height: 85vh;
    }

    .lb-img {
      max-height: 85vh;
    }

    .lb-close {
      top: 0.75rem;
      right: 1rem;
    }
  }
</style>
