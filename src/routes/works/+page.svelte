<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import type { Work } from '$lib/types/works.js';
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import { initFadeUpReveal } from '$lib/utils/animations.js';

  let { data }: { data: { works: Work[] } } = $props();

  let selectedWork = $state<Work | null>(null);
  let hoveredWork = $state<Work | null>(null);
  let cursorX = $state(0);
  let cursorY = $state(0);
  let previewEl = $state<HTMLDivElement | null>(null);
  let overlayEl = $state<HTMLDivElement | null>(null);

  const works = $derived(data.works ?? []);

  function handleRowClick(work: Work) {
    selectedWork = work;
    if (browser) document.body.style.overflow = 'hidden';
    // Animate overlay entrance
    if (browser && overlayEl) {
      import('gsap').then(({ gsap }) => {
        gsap.fromTo(overlayEl, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      });
    }
  }

  function closeOverlay() {
    if (browser && overlayEl) {
      import('gsap').then(({ gsap }) => {
        gsap.to(overlayEl, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            selectedWork = null;
            document.body.style.overflow = '';
          },
        });
      });
    } else {
      selectedWork = null;
      if (browser) document.body.style.overflow = '';
    }
  }

  function handleOverlayBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeOverlay();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && selectedWork) closeOverlay();
  }

  function handleMouseMove(e: MouseEvent) {
    cursorX = e.clientX;
    cursorY = e.clientY;
  }

  function padIndex(n: number): string {
    return String(n).padStart(2, '0');
  }

  // GSAP hover bleed-in for the preview image panel
  $effect(() => {
    if (!browser || !previewEl) return;
    if (window.matchMedia('(hover: none)').matches) return;

    import('gsap').then(({ gsap }) => {
      if (hoveredWork && !selectedWork) {
        gsap.to(previewEl, {
          opacity: 1,
          x: '0%',
          duration: 0.4,
          ease: 'power3.out',
        });
      } else {
        gsap.to(previewEl, {
          opacity: 0,
          x: '4%',
          duration: 0.25,
          ease: 'power2.in',
        });
      }
    });
  });

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    initFadeUpReveal('.works-row', { stagger: 0.04, duration: 0.6, y: 12 });
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="works-page" onmousemove={handleMouseMove}>
  <Navbar />

  <main class="works-main">
    <header class="works-header">
      <h1 class="works-title">Works</h1>
    </header>

    {#if works.length === 0}
      <div class="empty-state">
        <p>No works yet. Please come back later.</p>
      </div>
    {:else}
      <ol class="works-list">
        {#each works as work, i}
          <li
            class="works-row"
            class:hovered={hoveredWork === work}
            onmouseenter={() => (hoveredWork = work)}
            onmouseleave={() => (hoveredWork = null)}
          >
            <button
              class="works-row-btn"
              onclick={() => handleRowClick(work)}
              aria-label={`Open ${work.title}`}
            >
              <span class="row-number">{padIndex(i + 1)}</span>

              <div class="row-meta">
                <span class="row-title">{work.title}</span>
                {#if work.tags.length > 0}
                  <span class="row-tags">{work.tags.join(' / ')}</span>
                {/if}
              </div>

              <span class="row-arrow">→</span>
            </button>
          </li>
        {/each}
      </ol>
    {/if}
  </main>

  <Footer />

  <!-- Floating preview — always in DOM so GSAP can animate it; opacity driven by $effect -->
  <div
    bind:this={previewEl}
    class="hover-preview"
    style="left: {cursorX + 24}px; top: {cursorY - 60}px; opacity: 0; transform: translateX(4%);"
    aria-hidden="true"
  >
    {#if hoveredWork}
      <img src={hoveredWork.coverImage} alt={hoveredWork.title} />
    {/if}
  </div>
</div>

<!-- Contact sheet overlay -->
{#if selectedWork}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    bind:this={overlayEl}
    class="overlay"
    onclick={handleOverlayBackdropClick}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={`Images for ${selectedWork.title}`}
  >
    <div class="overlay-inner">
      <div class="overlay-header">
        <h2 class="overlay-title">{selectedWork.title}</h2>
        <button class="overlay-close" onclick={closeOverlay} aria-label="Close overlay">×</button>
      </div>

      {#if selectedWork.description}
        <p class="overlay-desc">{selectedWork.description}</p>
      {/if}

      <div class="contact-grid">
        {#each selectedWork.images as image, i}
          <div class="contact-thumb">
            <img src={image.src} alt={image.alt ?? `${selectedWork.title} — ${i + 1}`} loading="lazy" />
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Page shell ───────────────────────────────────────────── */
  .works-page {
    min-height: 100vh;
    background: var(--near-black, #0e0e0e);
    color: var(--warm-white, #f0ebe3);
    display: flex;
    flex-direction: column;
  }

  /* ── Main ─────────────────────────────────────────────────── */
  .works-main {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 8rem 2rem 4rem;
  }

  /* ── Page title ───────────────────────────────────────────── */
  .works-header {
    margin-bottom: 4rem;
  }

  .works-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(3.5rem, 7vw, 7rem);
    line-height: 1;
    color: var(--warm-white, #f0ebe3);
    margin: 0;
    letter-spacing: -0.01em;
  }

  /* ── Works list ───────────────────────────────────────────── */
  .works-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid rgba(200, 192, 184, 0.08);
  }

  .works-row {
    border-bottom: 1px solid rgba(200, 192, 184, 0.08);
    transition: background 0.18s ease;
    position: relative;
  }

  .works-row:hover {
    background: rgba(184, 147, 106, 0.04);
  }

  .works-row-btn {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.6rem 0;
    width: 100%;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  /* ── Row: series number ───────────────────────────────────── */
  .row-number {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 100;
    font-size: 9px;
    letter-spacing: 0.3em;
    color: var(--silver, #c8c0b8);
    opacity: 0.5;
    min-width: 2.2rem;
    flex-shrink: 0;
  }

  /* ── Row: title + tags ────────────────────────────────────── */
  .row-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .row-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: clamp(1.8rem, 3vw, 2.5rem);
    line-height: 1.1;
    color: var(--warm-white, #f0ebe3);
    transition: color 0.18s ease;
  }

  .works-row:hover .row-title {
    color: var(--gold, #b8936a);
  }

  .row-tags {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 9px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--silver, #c8c0b8);
    opacity: 0.55;
  }

  /* ── Row: arrow ───────────────────────────────────────────── */
  .row-arrow {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 1rem;
    color: var(--silver, #c8c0b8);
    opacity: 0;
    transition: opacity 0.18s ease, transform 0.18s ease;
    flex-shrink: 0;
  }

  .works-row:hover .row-arrow {
    opacity: 0.6;
    transform: translateX(4px);
  }

  /* ── Empty state ──────────────────────────────────────────── */
  .empty-state {
    padding: 4rem 0;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 0.875rem;
    letter-spacing: 0.1em;
    color: var(--silver, #c8c0b8);
    opacity: 0.5;
  }

  /* ── Floating hover preview ───────────────────────────────── */
  .hover-preview {
    position: fixed;
    z-index: 50;
    pointer-events: none;
    width: 240px;
    animation: fadeIn 0.18s ease forwards;
  }

  .hover-preview img {
    width: 100%;
    height: auto;
    display: block;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Hide hover preview on mobile */
  @media (max-width: 768px) {
    .hover-preview {
      display: none;
    }
  }

  /* ── Contact sheet overlay ────────────────────────────────── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(14, 14, 14, 0.97);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .overlay-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 2rem;
  }

  .overlay-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .overlay-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(2rem, 4vw, 3.5rem);
    color: var(--warm-white, #f0ebe3);
    margin: 0;
    line-height: 1.1;
  }

  .overlay-close {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 100;
    font-size: 2rem;
    line-height: 1;
    color: var(--silver, #c8c0b8);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0 0.25rem;
    opacity: 0.7;
    transition: opacity 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .overlay-close:hover {
    opacity: 1;
    color: var(--warm-white, #f0ebe3);
  }

  .overlay-desc {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    color: var(--silver, #c8c0b8);
    opacity: 0.6;
    margin: 0 0 2rem;
    flex-shrink: 0;
  }

  /* ── Contact sheet grid ───────────────────────────────────── */
  .contact-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    flex: 1;
  }

  .contact-thumb {
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
  }

  .contact-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.22s ease, opacity 0.22s ease;
    opacity: 0.85;
  }

  .contact-thumb:hover img {
    transform: scale(1.04);
    opacity: 1;
  }

  /* ── Responsive grid ──────────────────────────────────────── */
  @media (max-width: 1024px) {
    .contact-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  @media (max-width: 768px) {
    .works-main {
      padding: 6rem 1.25rem 3rem;
    }

    .overlay-inner {
      padding: 1.25rem;
    }

    .contact-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 480px) {
    .contact-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
