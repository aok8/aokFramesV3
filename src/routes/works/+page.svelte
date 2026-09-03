<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import type { Work } from '$lib/types/works.js';
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import { initFadeUpReveal } from '$lib/utils/animations.js';

  let { data }: { data: { works: Work[] } } = $props();

  let selectedWork  = $state<Work | null>(null);
  let hoveredId     = $state<string | null>(null);
  let overlayEl     = $state<HTMLDivElement | null>(null);
	let nsfwDialogEl = $state<HTMLDivElement | null>(null);
	let lightboxEl = $state<HTMLDivElement | null>(null);
  let previewsReady = $state(false);

	let focusedBeforeOverlay: HTMLElement | null = null;
	let focusedBeforeLightbox: HTMLElement | null = null;

  // NSFW gate
  let nsfwGateWork  = $state<Work | null>(null);

  // Per-thumbnail loaded flags (index → boolean)
  let imgLoaded = $state<boolean[]>([]);

  // Lightbox
  let lightboxIndex = $state<number | null>(null);
  let lbLoaded      = $state(false);

  const works = $derived(data.works ?? []);
	const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function rememberFocusedElement() {
		return document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}

	function focusFirst(container: HTMLElement | null, selector?: string) {
		tick().then(() => {
			const preferred = selector ? container?.querySelector<HTMLElement>(selector) : null;
			const first =
				preferred ?? container?.querySelector<HTMLElement>(focusableSelector) ?? container;
			first?.focus();
		});
	}

	function trapDialogFocus(e: KeyboardEvent, container: HTMLElement | null) {
		if (e.key !== 'Tab' || !container) return;
		const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0
		);

		if (focusable.length === 0) {
			e.preventDefault();
			container.focus();
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

	function imageAlt(work: Work, image: Work['images'][number], index: number) {
		const supplied = image.alt?.trim();
		return supplied && !/^\d+$/.test(supplied)
			? supplied
			: `${work.title} — photograph ${index + 1}`;
	}

  // ── Reset + cache-check when contact sheet opens / changes ──
  $effect(() => {
    const work = selectedWork;
    if (!work) {
      imgLoaded     = [];
      lightboxIndex = null;
      return;
    }
    imgLoaded = new Array(work.images.length).fill(false);
    let active = true;
    tick().then(() => {
      if (!active) return;
			document.querySelectorAll<HTMLImageElement>('.contact-thumb img').forEach((img, idx) => {
          if (img.complete && img.naturalHeight > 0) imgLoaded[idx] = true;
        });
    });
		return () => {
			active = false;
		};
  });

  // ── Reset + cache-check when lightbox image changes ─────────
  $effect(() => {
    const idx = lightboxIndex;
    if (idx === null) return;
    lbLoaded = false;
    let active = true;
    tick().then(() => {
      if (!active) return;
      const lbImg = document.querySelector<HTMLImageElement>('.lb-img');
      if (lbImg?.complete && lbImg.naturalHeight > 0) lbLoaded = true;
    });
		return () => {
			active = false;
		};
  });

  // ── Works list interactions ──────────────────────────────────
  function openWorkDetail(work: Work) {
    selectedWork = work;
		if (browser) {
			document.body.style.overflow = 'hidden';
			tick().then(() => {
				if (!overlayEl) return;
				focusFirst(overlayEl, '.overlay-close');
      import('gsap').then(({ gsap }) => {
					gsap.fromTo(
						overlayEl,
						{ opacity: 0 },
						{ opacity: 1, duration: 0.25, ease: 'power2.out' }
					);
				});
      });
    }
  }

  function handleRowClick(work: Work) {
		if (browser) focusedBeforeOverlay = rememberFocusedElement();
    if (work.nsfw) {
      nsfwGateWork = work;
			if (browser) {
				document.body.style.overflow = 'hidden';
				tick().then(() => focusFirst(nsfwDialogEl, '.nsfw-cancel'));
			}
    } else {
      openWorkDetail(work);
    }
  }

  function confirmNsfw() {
    if (!nsfwGateWork) return;
    const work = nsfwGateWork;
    nsfwGateWork = null;
    openWorkDetail(work);
  }

  function cancelNsfw() {
    nsfwGateWork = null;
		if (browser) {
			const restoreTarget = focusedBeforeOverlay;
			focusedBeforeOverlay = null;
			document.body.style.overflow = '';
			tick().then(() => restoreTarget?.focus());
		}
  }

  function closeOverlay() {
    lightboxIndex = null;
    const restoreTarget = focusedBeforeOverlay;
    focusedBeforeOverlay = null;
    if (browser && overlayEl) {
      import('gsap').then(({ gsap }) => {
        gsap.to(overlayEl, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            selectedWork = null;
            document.body.style.overflow = '';
						tick().then(() => restoreTarget?.focus());
					}
        });
      });
    } else {
      selectedWork = null;
			if (browser) {
				document.body.style.overflow = '';
				tick().then(() => restoreTarget?.focus());
			}
    }
  }

  function handleOverlayBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeOverlay();
  }

  // ── Lightbox ─────────────────────────────────────────────────
	function openLightbox(i: number) {
		if (browser) focusedBeforeLightbox = rememberFocusedElement();
		lightboxIndex = i;
		if (browser) tick().then(() => focusFirst(lightboxEl, '.lb-close'));
	}

	function closeLightbox() {
		lightboxIndex = null;
		if (browser) {
			const restoreTarget = focusedBeforeLightbox;
			focusedBeforeLightbox = null;
			tick().then(() => restoreTarget?.focus());
		}
	}

  function prevImage() {
    if (lightboxIndex === null || !selectedWork) return;
    lightboxIndex = (lightboxIndex - 1 + selectedWork.images.length) % selectedWork.images.length;
  }

  function nextImage() {
    if (lightboxIndex === null || !selectedWork) return;
    lightboxIndex = (lightboxIndex + 1) % selectedWork.images.length;
  }

  // ── Swipe ────────────────────────────────────────────────────
  let touchStartX = 0;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) prevImage();
    else nextImage();
  }

  // ── Keyboard ─────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent) {
    if (lightboxIndex !== null) {
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				prevImage();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				nextImage();
			} else if (e.key === 'Escape') {
				closeLightbox();
			}
    } else if (selectedWork) {
      if (e.key === 'Escape') closeOverlay();
    } else if (nsfwGateWork) {
      if (e.key === 'Escape') cancelNsfw();
    }
  }

  function padIndex(n: number): string {
    return String(n).padStart(2, '0');
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    initFadeUpReveal('.works-row', { stagger: 0.04, duration: 0.6, y: 12 });

    // Preload all cover images so hover reveals are instant
		const coverUrls = works.map((w) => w.coverImage).filter(Boolean);
    if (coverUrls.length === 0) {
      previewsReady = true;
    } else {
      let loaded = 0;
			coverUrls.forEach((src) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          if (++loaded === coverUrls.length) previewsReady = true;
        };
        img.src = src;
      });
    }

    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<svelte:head>
  <title>Works — AOKFrames</title>
	<meta
		name="description"
		content="Selected photography series by Alain Kouassi — film and digital works from 2022 to present."
	/>
  <meta property="og:title" content="Works — AOKFrames" />
	<meta
		property="og:description"
		content="Selected photography series by Alain Kouassi — film and digital works from 2022 to present."
	/>
  <meta property="og:url" content="https://aokframes.com/works" />
</svelte:head>

<div class="works-page" inert={nsfwGateWork !== null || selectedWork !== null}>
  <Navbar />

  <div class="works-container">
    <!-- Left: typographic index -->
    <main class="works-index">
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
              class:hovered={hoveredId === work.id}
							onmouseenter={() => {
								if (previewsReady) hoveredId = work.id;
							}}
              onmouseleave={() => (hoveredId = null)}
            >
              <button
								type="button"
                class="works-row-btn"
                onclick={() => handleRowClick(work)}
                aria-label={`Open ${work.title}`}
              >
                <span class="row-number">{padIndex(i + 1)}</span>

                <div class="row-meta">
                  <span class="row-title">
                    {work.title}
                    {#if work.nsfw}<span class="row-nsfw-badge">18+</span>{/if}
                  </span>
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

      <Footer />
    </main>

    <!-- Right: sticky preview panel -->
    <div class="works-preview" aria-hidden="true">
      <div class="works-preview-overlay"></div>

      {#each works as work}
        <div
          class="works-preview-image"
					style="opacity: {hoveredId === work.id && !selectedWork
						? 1
						: 0}; transform: translateX({hoveredId === work.id && !selectedWork ? 0 : 30}px);"
        >
          <img src={work.coverImage} alt="" />
        </div>
      {/each}

      {#if !previewsReady}
        <div class="preview-loading">
          <span class="preview-loading-bar"></span>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- ── NSFW content gate ──────────────────────────────────── -->
{#if nsfwGateWork}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
		bind:this={nsfwDialogEl}
    class="nsfw-backdrop"
    onclick={cancelNsfw}
		onkeydown={(e) => trapDialogFocus(e, nsfwDialogEl)}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Content warning"
  >
		<!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="nsfw-card" onclick={(e) => e.stopPropagation()}>
      <p class="nsfw-eyebrow">Content Warning</p>
      <h2 class="nsfw-title">Sensitive Content</h2>
      <p class="nsfw-body">
        This work contains content that may not be suitable for all audiences.
      </p>
      {#if nsfwGateWork.nsfw_tags && nsfwGateWork.nsfw_tags.length > 0}
        <div class="nsfw-tags">
          <span class="nsfw-tags-label">May contain:</span>
          <div class="nsfw-tag-list">
            {#each nsfwGateWork.nsfw_tags as tag}
              <span class="nsfw-tag">{tag}</span>
            {/each}
          </div>
        </div>
      {/if}
      <div class="nsfw-actions">
				<button type="button" class="nsfw-cancel" onclick={cancelNsfw}>Go back</button>
				<button type="button" class="nsfw-confirm" onclick={confirmNsfw}
					>I understand, continue</button
				>
      </div>
    </div>
  </div>
{/if}

<!-- ── Contact sheet overlay ──────────────────────────────── -->
{#if selectedWork}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    bind:this={overlayEl}
    class="overlay"
		inert={lightboxIndex !== null}
    onclick={handleOverlayBackdropClick}
		onkeydown={(e) => trapDialogFocus(e, overlayEl)}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label={`Images for ${selectedWork.title}`}
  >
    <div class="overlay-inner">
      <div class="overlay-header">
        <h2 class="overlay-title">{selectedWork.title}</h2>
				<button
					type="button"
					class="overlay-close"
					onclick={closeOverlay}
					aria-label={`Close ${selectedWork.title} gallery`}>×</button
				>
      </div>

      {#if selectedWork.description}
        <p class="overlay-desc">{selectedWork.description}</p>
      {/if}

      <div class="contact-grid">
        {#each selectedWork.images as image, i}
					<button
						type="button"
            class="contact-thumb"
						aria-label={`View ${imageAlt(selectedWork, image, i)} full size`}
            onclick={() => openLightbox(i)}
          >
            <img
              src={image.src}
							alt={imageAlt(selectedWork, image, i)}
							loading={i < 4 ? 'eager' : 'lazy'}
              class:loaded={imgLoaded[i]}
							onload={() => {
								imgLoaded[i] = true;
							}}
            />
						<span class="contact-label">{imageAlt(selectedWork, image, i)}</span>
					</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- ── Lightbox ───────────────────────────────────────────── -->
{#if lightboxIndex !== null && selectedWork}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
		bind:this={lightboxEl}
    class="lightbox"
    role="dialog"
    aria-modal="true"
    aria-label={`Image ${lightboxIndex + 1} of ${selectedWork.images.length}`}
		tabindex="-1"
    onclick={closeLightbox}
		onkeydown={(e) => trapDialogFocus(e, lightboxEl)}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- Prev -->
    <button
			type="button"
      class="lb-nav lb-prev"
			onclick={(e) => {
				e.stopPropagation();
				prevImage();
			}}
			aria-label="Previous image">‹</button
		>

    <!-- Image frame — keyed so img remounts on index change -->
    {#key lightboxIndex}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="lb-frame" onclick={(e) => e.stopPropagation()}>
        <img
          class="lb-img"
          class:loaded={lbLoaded}
          src={selectedWork.images[lightboxIndex].src}
					alt={imageAlt(selectedWork, selectedWork.images[lightboxIndex], lightboxIndex)}
          loading="eager"
					onload={() => {
						lbLoaded = true;
					}}
        />
      </div>
    {/key}

    <!-- Next -->
    <button
			type="button"
      class="lb-nav lb-next"
			onclick={(e) => {
				e.stopPropagation();
				nextImage();
			}}
			aria-label="Next image">›</button
		>

    <!-- Counter -->
    <div class="lb-counter">{lightboxIndex + 1} / {selectedWork.images.length}</div>

    <!-- Close (back to contact sheet) -->
		<button type="button" class="lb-close" onclick={closeLightbox} aria-label="Back to gallery"
			>×</button
		>
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

  /* ── Two-column grid ──────────────────────────────────────── */
  .works-container {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
  }

  /* ── Left: works index ────────────────────────────────────── */
  .works-index {
    padding: 8rem 3rem 4rem clamp(2rem, 5vw, 6rem);
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
		min-width: 0;
  }

  /* ── Page title ───────────────────────────────────────────── */
  .works-header {
    margin-bottom: 4rem;
  }

  .works-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(3.5rem, 5vw, 7rem);
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
    flex: 1;
  }

  .works-row {
    border-bottom: 1px solid rgba(200, 192, 184, 0.08);
    transition: background 0.18s ease;
  }

  .works-row:hover {
    background: rgba(45, 71, 57, 0.06);
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
    text-align: left;
    cursor: pointer;
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
		transition:
			color 0.3s ease,
			opacity 0.3s ease;
  }

  .works-row:hover .row-number {
		color: var(--forest-green, #2d4739);
    opacity: 1;
  }

  /* ── Row: title + tags ────────────────────────────────────── */
  .row-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
		min-width: 0;
  }

  .row-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: clamp(1.8rem, 2.5vw, 2.5rem);
    line-height: 1.1;
    color: var(--silver, #c8c0b8);
    transition: color 0.3s ease;
		overflow-wrap: anywhere;
  }

  .works-row:hover .row-title {
    color: var(--warm-white, #f0ebe3);
  }

  .row-tags {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 9px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--silver, #c8c0b8);
    opacity: 0;
    transform: translateX(-8px);
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
		overflow-wrap: anywhere;
  }

  .works-row:hover .row-tags {
    opacity: 0.55;
    transform: translateX(0);
  }

  /* ── Row: arrow ───────────────────────────────────────────── */
  .row-arrow {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 1rem;
    color: var(--silver, #c8c0b8);
    opacity: 0;
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
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

  /* ── Right: sticky preview panel ─────────────────────────── */
  .works-preview {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
  }

  .works-preview-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, var(--near-black, #0e0e0e) 0%, transparent 30%);
    z-index: 1;
    pointer-events: none;
  }

  .works-preview-image {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: translateX(30px);
    transition:
      opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .works-preview-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0.8;
  }

  /* ── Preview loading indicator ────────────────────────────── */
  .preview-loading {
    position: absolute;
    bottom: 2.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    pointer-events: none;
  }

  .preview-loading-bar {
    display: block;
    height: 1px;
    width: 32px;
    background: rgba(200, 192, 184, 0.35);
    animation: preview-pulse 1.8s ease-in-out infinite;
  }

  @keyframes preview-pulse {
		0%,
		100% {
			width: 20px;
			opacity: 0.2;
		}
		50% {
			width: 44px;
			opacity: 0.55;
		}
  }

  /* ── Responsive ───────────────────────────────────────────── */
  @media (max-width: 900px) {
    .works-container {
      grid-template-columns: 1fr;
    }

    .works-preview {
      display: none;
    }

    .works-index {
      padding: 6rem 1.25rem 3rem;
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
    padding: 0 0.25rem;
    opacity: 0.7;
    cursor: pointer;
		transition:
			opacity 0.15s ease,
			color 0.15s ease;
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
    position: relative;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: #1c1c1c;
    cursor: pointer;
  }

  /* Shimmer while loading */
  .contact-thumb::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(200, 192, 184, 0.06) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: thumb-shimmer 1.6s ease-in-out infinite;
    pointer-events: none;
    z-index: 3;
    transition: opacity 0.35s ease;
  }

  /* Stop shimmer and fade it out once image is loaded */
  .contact-thumb:has(img.loaded)::after {
    animation: none;
    opacity: 0;
  }

  @keyframes thumb-shimmer {
		to {
			transform: translateX(300%);
		}
  }

  /* Image: hidden + slightly zoomed, reveal with fade + zoom-out */
  .contact-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transform: scale(1.05);
		transition:
			opacity 0.5s ease,
			transform 0.55s ease;
    position: relative;
    z-index: 2;
  }

  .contact-thumb img.loaded {
    opacity: 0.85;
    transform: scale(1);
  }

  .contact-thumb:hover img.loaded {
    transform: scale(1.04);
    opacity: 1;
  }

  .contact-label {
    position: absolute;
    bottom: 0.5rem;
    left: 0.6rem;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 8px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(240, 235, 227, 0.55);
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 1.2rem);
    z-index: 4;
  }

  @media (max-width: 1024px) {
		.contact-grid {
			grid-template-columns: repeat(4, 1fr);
		}
  }
  @media (max-width: 768px) {
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

  /* ── Lightbox ─────────────────────────────────────────────── */
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.96);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer; /* click dark area → back to contact sheet */
  }

  /* Image container — stops click propagation */
  .lb-frame {
    position: relative;
    max-width: 88vw;
    max-height: 88vh;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
  }

  /* Shimmer placeholder behind lb-img while loading */
  .lb-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(200, 192, 184, 0.04) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: thumb-shimmer 2s ease-in-out infinite;
    pointer-events: none;
  }

  .lb-img {
    max-width: 88vw;
    max-height: 88vh;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    opacity: 0;
    transition: opacity 0.4s ease;
    position: relative; /* above lb-frame::before */
  }

  .lb-img.loaded {
    opacity: 1;
  }

  /* Prev / Next */
  .lb-nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 301;
    background: none;
    border: none;
    color: rgba(200, 192, 184, 0.45);
    font-size: 3.5rem;
    font-weight: 100;
    width: 4.5rem;
    height: 6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color 0.2s ease;
    line-height: 1;
  }

	.lb-prev {
		left: 0.75rem;
	}
	.lb-next {
		right: 0.75rem;
	}

  .lb-nav:hover {
    color: var(--warm-white, #f0ebe3);
  }

  /* Counter */
  .lb-counter {
    position: fixed;
    bottom: 1.75rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.4);
    pointer-events: none;
  }

  /* Close (back to contact sheet) */
  .lb-close {
    position: fixed;
    top: 1.5rem;
    right: 1.75rem;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 100;
    font-size: 2rem;
    line-height: 1;
    color: rgba(200, 192, 184, 0.55);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s ease;
    z-index: 302;
    padding: 0.25rem;
  }

  .lb-close:hover {
    color: var(--warm-white, #f0ebe3);
  }

  /* Mobile lightbox */
  @media (max-width: 640px) {
		.lb-nav {
			font-size: 2.5rem;
			width: 3rem;
		}
		.lb-prev {
			left: 0.1rem;
		}
		.lb-next {
			right: 0.1rem;
		}
    .lb-img,
		.lb-frame {
			max-width: 96vw;
			max-height: 80vh;
		}
  }

  /* ── NSFW badge on row ────────────────────────────────────── */
  .row-nsfw-badge {
    display: inline-block;
    margin-left: 0.65rem;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 8px;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.4);
    border: 1px solid rgba(200, 192, 184, 0.18);
    padding: 0.15em 0.5em;
    vertical-align: middle;
    position: relative;
    top: -0.1em;
		transition:
			color 0.3s ease,
			border-color 0.3s ease;
  }

  .works-row:hover .row-nsfw-badge {
    color: rgba(200, 192, 184, 0.65);
    border-color: rgba(200, 192, 184, 0.35);
  }

  /* ── NSFW gate modal ──────────────────────────────────────── */
  .nsfw-backdrop {
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    animation: nsfw-fade-in 0.2s ease;
  }

  @keyframes nsfw-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
  }

  .nsfw-card {
    background: #0e0e0e;
    border: 1px solid rgba(200, 192, 184, 0.1);
    padding: 3rem 3rem 2.5rem;
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: nsfw-slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes nsfw-slide-up {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
  }

  .nsfw-eyebrow {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 0.45em;
    text-transform: uppercase;
    color: #6a9e82;
    margin: 0;
  }

  .nsfw-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(2rem, 4vw, 2.75rem);
    color: var(--warm-white, #f0ebe3);
    margin: 0;
    line-height: 1.1;
  }

  .nsfw-body {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    line-height: 1.8;
    color: rgba(200, 192, 184, 0.7);
    margin: 0;
  }

  .nsfw-tags {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nsfw-tags-label {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 8px;
    font-weight: 300;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.4);
  }

  .nsfw-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .nsfw-tag {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 8px;
    font-weight: 300;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.55);
    border: 1px solid rgba(200, 192, 184, 0.12);
    padding: 0.25em 0.65em;
  }

  .nsfw-actions {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  .nsfw-cancel {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 0.65rem;
    font-weight: 300;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.45);
    background: none;
    border: 1px solid rgba(200, 192, 184, 0.12);
    padding: 0.75rem 1.5rem;
    cursor: pointer;
		transition:
			color 0.2s ease,
			border-color 0.2s ease;
  }

  .nsfw-cancel:hover {
    color: rgba(200, 192, 184, 0.8);
    border-color: rgba(200, 192, 184, 0.3);
  }

  .nsfw-confirm {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 0.65rem;
    font-weight: 400;
    letter-spacing: 0.25em;
    text-transform: uppercase;
		color: var(--forest-green, #2d4739);
    background: none;
		border: 1px solid var(--forest-green, #2d4739);
    padding: 0.75rem 1.75rem;
    cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
  }

  .nsfw-confirm:hover {
		background-color: var(--forest-green, #2d4739);
    color: var(--warm-white, #f0ebe3);
  }

  @media (max-width: 480px) {
    .nsfw-card {
      padding: 2rem 1.5rem;
    }
    .nsfw-actions {
      flex-direction: column;
    }
    .nsfw-cancel,
    .nsfw-confirm {
      width: 100%;
      text-align: center;
    }
  }
</style>
