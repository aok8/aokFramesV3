<script lang="ts">
  import '../app.css';

  import '@fontsource/cormorant-garamond/300.css';
  import '@fontsource/cormorant-garamond/300-italic.css';
  import '@fontsource/cormorant-garamond/400.css';
  import '@fontsource/cormorant-garamond/400-italic.css';

  import '@fontsource/josefin-sans/100.css';
  import '@fontsource/josefin-sans/300.css';
  import '@fontsource/josefin-sans/400.css';
  import '@fontsource/josefin-sans/600.css';

  import { navigating } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Cursor from '$lib/components/ui/Cursor.svelte';
  import Preloader from '$lib/components/ui/Preloader.svelte';

  let { children } = $props();

  let overlay = $state<HTMLDivElement | null>(null);
  let isTransitioning = $state(false);

  $effect(() => {
    if (!browser || !overlay) return;
    if ($navigating && !isTransitioning) {
      isTransitioning = true;
      import('gsap').then(({ gsap }) => {
        gsap.to(overlay, {
          opacity: 1,
          duration: 0.18,
          ease: 'power1.in',
          onStart: () => { overlay!.style.pointerEvents = 'all'; },
        });
      });
    } else if (!$navigating && isTransitioning) {
      isTransitioning = false;
      import('gsap').then(({ gsap }) => {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.28,
          ease: 'power1.out',
          onComplete: () => { overlay!.style.pointerEvents = 'none'; },
        });
      });
    }
  });
</script>

<svelte:head>
  <title>AOKFrames</title>
  <meta name="description" content="Seattle-based photographer Alain Kouassi — film and digital. Capturing moments and telling stories through images." />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://aokframes.com/" />
  <meta property="og:title" content="AOKFrames — Film &amp; Digital Photography" />
  <meta property="og:description" content="Seattle-based photographer Alain Kouassi — film and digital. Capturing moments and telling stories through images." />
  <meta property="og:image" content="https://assets.aokframes.com/constants/w1920/bg.webp" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://aokframes.com/" />
  <meta name="twitter:title" content="AOKFrames — Film &amp; Digital Photography" />
  <meta name="twitter:description" content="Seattle-based photographer Alain Kouassi — film and digital. Capturing moments and telling stories through images." />
  <meta name="twitter:image" content="https://assets.aokframes.com/constants/w1920/bg.webp" />
</svelte:head>

<!-- Preloader — first visit only (sessionStorage gated), preloads gallery images -->
<Preloader />

<!-- Custom cursor — renders nothing on touch devices (guarded inside component) -->
<Cursor />

<!-- Page transition overlay — animated in Sprint 6 via GSAP + $navigating store.
     Sits above all page content, below the cursor. -->
<div
  bind:this={overlay}
  id="page-transition-overlay"
  aria-hidden="true"
  style="
    position: fixed;
    inset: 0;
    background: var(--near-black, #0e0e0e);
    z-index: 9990;
    opacity: 0;
    pointer-events: none;
  "
></div>

{@render children()}
