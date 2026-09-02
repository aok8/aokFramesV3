<script lang="ts">
  import { onMount, tick } from 'svelte';

  interface LightboxImage {
    src: string;
    alt: string;
  }

  let {
    images = [],
    index = 0,
    open = false,
    onclose,
    onprev,
    onnext
  }: {
    images: LightboxImage[];
    index: number;
    open: boolean;
    onclose: () => void;
    onprev?: () => void;
    onnext?: () => void;
  } = $props();

  const current = $derived(images[index] ?? { src: '', alt: '' });
  const hasPrev  = $derived(index > 0);
  const hasNext  = $derived(index < images.length - 1);

  let dialogEl = $state<HTMLDivElement | null>(null);
  let focusedBeforeOpen: HTMLElement | null = null;
  const focusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !dialogEl) return;
    const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) {
      e.preventDefault();
      dialogEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape')     onclose();
    if (e.key === 'ArrowLeft'  && hasPrev) onprev?.();
    if (e.key === 'ArrowRight' && hasNext) onnext?.();
  }

  // Swipe tracking
  let touchStartX = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 50) return;
    if (delta > 0 && hasPrev) onprev?.();
    if (delta < 0 && hasNext) onnext?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  $effect(() => {
    if (open) {
      focusedBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';
      tick().then(() => dialogEl?.querySelector<HTMLElement>('.lb-close')?.focus());
    } else {
      document.body.style.overflow = '';
      const restoreTarget = focusedBeforeOpen;
      focusedBeforeOpen = null;
      tick().then(() => restoreTarget?.focus());
    }
    return () => { document.body.style.overflow = ''; };
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    bind:this={dialogEl}
    class="lb-backdrop"
    onclick={handleBackdropClick}
    onkeydown={trapFocus}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="dialog"
    aria-modal="true"
    aria-label="Image lightbox"
    tabindex="-1"
  >
    <button type="button" class="lb-close" onclick={onclose} aria-label="Close lightbox">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="17" y1="1" x2="1" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    {#if hasPrev}
      <button type="button" class="lb-nav lb-prev" onclick={(e) => { e.stopPropagation(); onprev?.(); }} aria-label="Previous image">‹</button>
    {/if}

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lb-frame" onclick={(e) => e.stopPropagation()}>
      <img class="lb-img" src={current.src} alt={current.alt} />
      {#if current.alt}
        <span class="lb-label">{current.alt}</span>
      {/if}
    </div>

    {#if hasNext}
      <button type="button" class="lb-nav lb-next" onclick={(e) => { e.stopPropagation(); onnext?.(); }} aria-label="Next image">›</button>
    {/if}
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

  /* Prev / Next arrows */
  .lb-nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1001;
    background: none;
    border: none;
    color: rgba(200, 192, 184, 0.4);
    font-size: 3.5rem;
    font-weight: 100;
    width: 4rem;
    height: 6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.2s ease;
    line-height: 1;
  }

  .lb-prev { left: 0.5rem; }
  .lb-next { right: 0.5rem; }

  .lb-nav:hover {
    color: rgba(200, 192, 184, 1);
  }

  .lb-frame {
    max-width: min(90vw, 1200px);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
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
    max-height: calc(90vh - 2rem);
    width: auto;
    height: auto;
    object-fit: contain;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
  }

  .lb-label {
    margin-top: 0.6rem;
    font-family: var(--font-ui);
    font-size: 9px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(240, 235, 227, 0.45);
    pointer-events: none;
    user-select: none;
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
      max-height: calc(85vh - 2rem);
    }

    .lb-close {
      top: 0.75rem;
      right: 1rem;
    }

    .lb-nav {
      font-size: 2.5rem;
      width: 3rem;
    }

    .lb-prev { left: 0.1rem; }
    .lb-next { right: 0.1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lb-backdrop,
    .lb-frame {
      animation: none;
    }
  }
</style>
