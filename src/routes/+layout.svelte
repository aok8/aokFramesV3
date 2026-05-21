<script lang="ts">
  // Darkroom v4 root layout
  // Fonts loaded here so they are available globally across every route.
  import '../app.css';

  // Cormorant Garamond — display serif used for headlines, pull quotes, blog body
  import '@fontsource/cormorant-garamond/300.css';
  import '@fontsource/cormorant-garamond/300-italic.css';
  import '@fontsource/cormorant-garamond/400.css';
  import '@fontsource/cormorant-garamond/400-italic.css';

  // Josefin Sans — UI labels, nav, captions, all-caps metadata
  import '@fontsource/josefin-sans/100.css';
  import '@fontsource/josefin-sans/300.css';
  import '@fontsource/josefin-sans/400.css';
  import '@fontsource/josefin-sans/600.css';

  import Cursor from '$lib/components/ui/Cursor.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <title>AOKFrames</title>
  <meta name="description" content="Seattle based photographer capturing moments and telling stories through film and digital images." />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://aokframesv3.pages.dev/" />
  <meta property="og:title" content="AOKFrames" />
  <meta property="og:description" content="Seattle based photographer — film and digital. Capturing moments and telling stories through images." />
  <meta property="og:image" content="https://aokframesv3.pages.dev/directr2/constants/bg.jpg" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://aokframesv3.pages.dev/" />
  <meta property="twitter:title" content="AOKFrames" />
  <meta property="twitter:description" content="Seattle based photographer — film and digital. Capturing moments and telling stories through images." />
  <meta property="twitter:image" content="https://aokframesv3.pages.dev/directr2/constants/bg.jpg" />
</svelte:head>

<!-- Custom cursor — renders nothing on touch devices (guarded inside component) -->
<Cursor />

<!-- Page transition overlay — animated in Sprint 6 via GSAP + $navigating store.
     Sits above all page content, below the cursor. -->
<div
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
