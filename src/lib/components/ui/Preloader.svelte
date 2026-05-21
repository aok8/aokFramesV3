<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  const PRELOAD_COUNT = 15;
  const SESSION_KEY  = 'aok_preloaded';

  let visible  = $state(true);
  let exiting  = $state(false);
  let progress = $state(0);

  onMount(async () => {
    if (!browser) return;

    // Skip entirely if already done this session
    if (sessionStorage.getItem(SESSION_KEY)) {
      visible = false;
      return;
    }

    try {
      const res = await fetch(`/api/portfolio-images?width=${window.innerWidth}`);
      const raw = await res.json();
      const all: { url: string }[] = Array.isArray(raw) ? raw : (raw.images ?? []);

      const priority = all.slice(0, PRELOAD_COUNT);
      const rest     = all.slice(PRELOAD_COUNT);
      const total    = priority.length || 1;
      let   loaded   = 0;

      // Preload first 15 in parallel, track progress
      await Promise.all(
        priority.map(({ url }) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => {
              progress = Math.round((++loaded / total) * 100);
              resolve();
            };
            img.src = url;
          })
        )
      );

      // Fire the rest of the gallery images in background
      rest.forEach(({ url }) => { new Image().src = url; });

      // Fire works cover preloads in background — so /works hover is instant
      // Don't await; this runs in parallel while the user browses the home page
      fetch('/api/works-covers')
        .then((r) => r.json())
        .then((covers: { coverImage: string }[]) => {
          covers.forEach(({ coverImage }) => { new Image().src = coverImage; });
        })
        .catch(() => {});

      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Network error — fail silently, don't block the user
    }

    // Snap to 100% in case of any rounding drift, hold briefly, then fade out
    progress = 100;
    await new Promise(r => setTimeout(r, 480));
    exiting = true;
    await new Promise(r => setTimeout(r, 680)); // matches CSS transition duration
    visible = false;
  });
</script>

{#if visible}
  <div
    class="preloader"
    class:exiting
    aria-label="Loading"
    aria-live="polite"
  >
    <div class="preloader-content">
      <p class="preloader-logo">AOK<span>Frames</span></p>

      <div
        class="preloader-track"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div class="preloader-fill" style="width: {progress}%"></div>
      </div>

      <p class="preloader-label">developing</p>
    </div>
  </div>
{/if}

<style>
  /* ── Overlay ─────────────────────────────────────────────────── */
  .preloader {
    position: fixed;
    inset: 0;
    z-index: 9995;
    background: var(--near-black, #0e0e0e);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.68s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .preloader.exiting {
    opacity: 0;
    pointer-events: none;
  }

  /* ── Centre stack ────────────────────────────────────────────── */
  .preloader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
  }

  /* ── Logo ────────────────────────────────────────────────────── */
  .preloader-logo {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    letter-spacing: 0.06em;
    color: var(--warm-white, #f0ebe3);
    margin: 0;
    line-height: 1;
  }

  .preloader-logo span {
    color: var(--silver, #c8c0b8);
    opacity: 0.65;
  }

  /* ── Progress bar ────────────────────────────────────────────── */
  .preloader-track {
    width: 120px;
    height: 1px;
    background: rgba(200, 192, 184, 0.1);
    position: relative;
    overflow: hidden;
  }

  .preloader-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: rgba(200, 192, 184, 0.5);
    transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ── Subtitle ────────────────────────────────────────────────── */
  .preloader-label {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 100;
    font-size: 8px;
    letter-spacing: 0.55em;
    text-transform: uppercase;
    color: var(--silver, #c8c0b8);
    opacity: 0.3;
    margin: 0;
  }
</style>
