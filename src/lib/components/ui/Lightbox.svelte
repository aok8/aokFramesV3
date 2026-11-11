<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import type { FilmMeta } from '$lib/utils/filmMeta.js';
  import EdgePrint from './EdgePrint.svelte';

  interface LightboxImage {
    src: string;
    alt: string;
    /** Film data printed under the photo like edge markings, when the filename carries it */
    meta?: FilmMeta | null;
  }

  let {
    images = [],
    index = 0,
    open = false,
    onclose,
    onprev,
    onnext,
    onselect,
    originFor
  }: {
    images: LightboxImage[];
    index: number;
    open: boolean;
    onclose: () => void;
    onprev?: () => void;
    onnext?: () => void;
    /** Jump straight to a frame. When provided, a rail of thumbnails is shown. */
    onselect?: (index: number) => void;
    /** The element a frame was opened from: the photo grows out of it and shrinks back into it. */
    originFor?: (index: number) => HTMLElement | null | undefined;
  } = $props();

  const current = $derived(images[index] ?? { src: '', alt: '', meta: null });
  const hasPrev  = $derived(index > 0);
  const hasNext  = $derived(index < images.length - 1);

  let dialogEl = $state<HTMLDivElement | null>(null);
  let imgEl = $state<HTMLImageElement | null>(null);
  let railEl = $state<HTMLDivElement | null>(null);
  let flying = $state(false);
  let closing = $state(false);
  let focusedBeforeOpen: HTMLElement | null = null;
  let wasOpen = false;
  const focusableSelector = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

  const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Open from the frame / close back into it ──────────────────────────────
  // A temporary copy of the photo flies between the thumbnail's box and the lightbox image's box.
  // Only transform-free boxes are measured, so nothing reflows while it runs.
  function visibleRect(el: HTMLElement | null | undefined): DOMRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
    return r;
  }

  function fly(from: DOMRect, to: DOMRect, src: string): Promise<void> {
    const clone = document.createElement('img');
    clone.src = src;
    clone.alt = '';
    clone.className = 'lb-fly';
    Object.assign(clone.style, {
      position: 'fixed', left: '0', top: '0', margin: '0', zIndex: '1002', pointerEvents: 'none',
      objectFit: 'cover', width: `${to.width}px`, height: `${to.height}px`, transformOrigin: '0 0'
    });
    document.body.appendChild(clone);
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const anim = clone.animate(
      [
        { transform: `translate(${from.left}px, ${from.top}px) scale(${sx}, ${sy})` },
        { transform: `translate(${to.left}px, ${to.top}px) scale(1, 1)` }
      ],
      { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
    );
    return anim.finished.then(() => clone.remove(), () => clone.remove());
  }

  async function flyIn() {
    if (reducedMotion() || !originFor) return;
    const from = visibleRect(originFor(index));
    await tick();
    if (!from || !imgEl) return;
    flying = true;
    if (!imgEl.complete) await new Promise((r) => imgEl!.addEventListener('load', r, { once: true }));
    const to = imgEl.getBoundingClientRect();
    if (to.width > 0) await fly(from, to, current.src);
    flying = false;
  }

  async function requestClose() {
    if (closing) return;
    const to = !reducedMotion() && originFor ? visibleRect(originFor(index)) : null;
    if (!to || !imgEl) {
      onclose();
      return;
    }
    closing = true;
    const from = imgEl.getBoundingClientRect();
    flying = true;
    await fly(from, to, current.src);
    flying = false;
    closing = false;
    onclose();
  }

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
    if (e.key === 'Escape')     requestClose();
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
    const t = e.target as HTMLElement;
    if (t === e.currentTarget || t.classList.contains('lb-stage')) requestClose();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  $effect(() => {
    if (open) {
      wasOpen = true;
      focusedBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.style.overflow = 'hidden';
      // untrack: this effect should only react to open/close, not to moving between frames
      untrack(flyIn);
      tick().then(() => dialogEl?.querySelector<HTMLElement>('.lb-close')?.focus());
    } else if (wasOpen) {
      wasOpen = false;
      document.body.style.overflow = '';
      // Return focus to the frame now on screen (the visitor may have moved through the set).
      const restoreTarget = untrack(() => originFor?.(index)) ?? focusedBeforeOpen;
      focusedBeforeOpen = null;
      tick().then(() => restoreTarget?.focus());
    }
    return () => { document.body.style.overflow = ''; };
  });

  // Keep the current frame centred in the rail.
  $effect(() => {
    if (!open || !railEl) return;
    void index;
    tick().then(() => {
      railEl?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: reducedMotion() ? 'auto' : 'smooth'
      });
    });
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    bind:this={dialogEl}
    class="lb-backdrop"
    class:closing
    onclick={handleBackdropClick}
    onkeydown={trapFocus}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="dialog"
    aria-modal="true"
    aria-label="Image lightbox"
    tabindex="-1"
  >
    <button type="button" class="lb-close" onclick={requestClose} aria-label="Close lightbox">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <line x1="1" y1="1" x2="17" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="17" y1="1" x2="1" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    {#if hasPrev}
      <button type="button" class="lb-nav lb-prev" onclick={(e) => { e.stopPropagation(); onprev?.(); }} aria-label="Previous image">‹</button>
    {/if}

    <div class="lb-stage">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="lb-frame" onclick={(e) => e.stopPropagation()}>
        {#key current.src}
          <img
            bind:this={imgEl}
            class="lb-img"
            class:lb-hidden={flying}
            src={current.src}
            alt={current.alt}
          />
        {/key}
      </div>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lb-meta" onclick={(e) => e.stopPropagation()}>
      {#if images.length > 1}
        <span class="lb-count" aria-live="polite">{index + 1} / {images.length}</span>
      {/if}
      {#if current.meta}
        <EdgePrint meta={current.meta} />
      {/if}
      {#if current.alt}
        <span class="lb-label">{current.alt}</span>
      {/if}
    </div>

    {#if onselect && images.length > 1}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="lb-rail" bind:this={railEl} onclick={(e) => e.stopPropagation()}>
        {#each images as img, i}
          <button
            type="button"
            class="lb-thumb"
            aria-current={i === index ? 'true' : 'false'}
            aria-label={`Show photo ${i + 1}${img.alt ? `: ${img.alt}` : ''}`}
            onclick={() => onselect?.(i)}
          >
            <img src={img.src} alt="" loading="lazy" decoding="async" />
          </button>
        {/each}
      </div>
    {/if}

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
    background: rgba(8, 8, 8, 0.94);
    /* Same tint past the viewport edges, where phone browsers draw under the clock and toolbar */
    box-shadow: 0 0 0 100vmax rgba(8, 8, 8, 0.94);
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    padding: 3.5rem 4.5rem 1rem;
    animation: lb-fade-in 0.3s ease;
    cursor: zoom-out;
    transition: background-color 0.45s ease, box-shadow 0.45s ease;
  }

  .lb-backdrop.closing {
    background: rgba(8, 8, 8, 0);
    box-shadow: 0 0 0 100vmax rgba(8, 8, 8, 0);
  }

  .lb-backdrop.closing > :not(.lb-stage) {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  @keyframes lb-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .lb-close {
    position: fixed;
    top: 1.25rem;
    right: 1.5rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: rgba(200, 192, 184, 0.7);
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
    color: rgba(200, 192, 184, 0.55);
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

  .lb-stage {
    min-height: 0;
    display: grid;
    place-items: center;
  }

  .lb-frame {
    max-width: min(100%, 1200px);
    max-height: 100%;
    min-height: 0;
    display: flex;
    cursor: default;
  }

  @keyframes lb-img-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .lb-img {
    animation: lb-img-in 0.35s ease;
    display: block;
    max-width: 100%;
    max-height: calc(100vh - 13rem);
    max-height: calc(100dvh - 13rem);
    width: auto;
    height: auto;
    object-fit: contain;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  }

  .lb-img.lb-hidden {
    visibility: hidden;
    animation: none;
  }

  /* Caption row: counter, film edge print, title */
  .lb-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.6rem 1.25rem;
    padding: 1rem 0 0.75rem;
    cursor: default;
  }

  .lb-count {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 0.3em;
    color: rgba(200, 192, 184, 0.75);
    font-variant-numeric: tabular-nums;
  }

  .lb-label {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.15rem;
    color: rgba(240, 235, 227, 0.85);
  }

  /* Contact-strip rail */
  .lb-rail {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 2px 6px;
    margin-inline: auto;
    max-width: 100%;
    scrollbar-width: thin;
    scrollbar-color: rgba(200, 192, 184, 0.25) transparent;
    cursor: default;
  }

  .lb-thumb {
    flex-shrink: 0;
    width: 60px;
    height: 42px;
    padding: 0;
    border: 0;
    background: #141414;
    opacity: 0.4;
    cursor: pointer;
    transition: opacity 0.25s ease;
  }

  .lb-thumb:hover {
    opacity: 0.85;
  }

  .lb-thumb[aria-current='true'] {
    opacity: 1;
    box-shadow: 0 0 0 1px var(--warm-white, #f0ebe3);
  }

  .lb-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 640px) {
    /* Counter above the film strip and title, always in the same place */
    .lb-meta {
      flex-direction: column;
      gap: 0.6rem;
    }

    .lb-backdrop {
      padding: 3.5rem 0.75rem 0.75rem;
    }

    .lb-img {
      max-height: calc(100vh - 14rem);
      max-height: calc(100dvh - 14rem);
    }

    .lb-close {
      top: 0.5rem;
      right: 0.5rem;
    }

    .lb-nav {
      display: none;
    }

    .lb-thumb {
      width: 52px;
      height: 38px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lb-backdrop,
    .lb-img {
      animation: none;
    }
  }
</style>
