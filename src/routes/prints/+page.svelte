<script lang="ts">
  import { theme } from '../../theme/theme.js'; // Relative path to theme
  import { Footer, Navbar } from "$lib/components/ui/index.js";
  import { assetUrl } from '$lib/utils/r2.js';
  import { onMount, afterUpdate } from 'svelte'; // Import lifecycle hooks

  // Receive data from load function
  export let data: { width: number; height: number };

  // State for image loading
  let imageLoaded = false;
  let imageError = false;
  let imgElement: HTMLImageElement | null = null;

  // Image URLs
  const primaryImageSrc = assetUrl('constants/Prints.webp');
  const fallbackImageSrc = "/images/constants/Prints.webp"; // Local fallback

  // Check completion after updates for fast-loading images
  afterUpdate(() => {
    if (!imageError && imgElement?.complete && !imageLoaded) {
      imageLoaded = true;
    }
  });

  onMount(() => {
    // Reset state if component remounts (e.g., navigation)
    imageLoaded = false;
    imageError = false;
  });

</script>

<svelte:head>
  <title>Prints &amp; Collabs — AOKFrames</title>
  <meta name="description" content="Original photography prints and limited edition collaborations from Alain Kouassi." />
  <meta property="og:title" content="Prints &amp; Collabs — AOKFrames" />
  <meta property="og:description" content="Original photography prints and limited edition collaborations from Alain Kouassi." />
  <meta property="og:url" content="https://aokframes.com/prints" />
</svelte:head>

<div class="prints-page">
  <Navbar />

  <!-- Page header -->
  <header class="page-header">
    <h1 class="page-title">Prints &amp; Collabs</h1>
    <p class="page-subtitle">Original photography · Limited editions</p>
  </header>

  <hr class="divider" />

  <!-- Main image -->
  <section class="image-section">
    <div
      class="image-container"
      style:aspect-ratio={data.width && data.height ? `${data.width} / ${data.height}` : '16 / 9'}
    >
      {#if !imageError}
        <img
          bind:this={imgElement}
          src={primaryImageSrc}
          width={data.width}
          height={data.height}
          alt="Selection of photographic prints"
          class="prints-image"
          class:loaded={imageLoaded}
          onload={() => { imageLoaded = true; }}
          onerror={() => {
            console.error('Primary prints image failed to load, trying fallback');
            imageError = true;
            imageLoaded = false;
          }}
        />
      {:else}
        <img
          bind:this={imgElement}
          src={fallbackImageSrc}
          width={data.width}
          height={data.height}
          alt="Selection of photographic prints (fallback)"
          class="prints-image"
          class:loaded={imageLoaded}
          onload={() => { imageLoaded = true; }}
          onerror={() => {
            console.error('Fallback prints image also failed to load.');
          }}
        />
      {/if}
      {#if imageError && !imageLoaded}
        <div class="error-placeholder">Image unavailable</div>
      {/if}
    </div>
  </section>

  <hr class="divider" />

  <!-- Description / CTA -->
  <section class="cta-section">
    <div class="cta-inner">
      <p class="cta-text">
        A selection of prints is available through my online store. Each print is produced to order,
        ensuring the highest quality on archival paper.
        For professional inquiries, collaborations, or to commission a custom piece, reach out directly.
      </p>

      <div class="cta-links">
        <a
          href="https://aokframes.darkroom.com"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-bordered"
        >
          View Store
        </a>
        <a href="mailto:aokframes@gmail.com" class="btn-bordered">
          Get in Touch
        </a>
      </div>

      <!-- Featured work -->
      <div class="featured">
        <h2 class="featured-title">Featured Work</h2>
        <ul class="featured-list">
          <li>
            <a
              href="https://www.ephemere.tokyo/store/p/anarchy2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ephemere Anarchy2
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <Footer />
</div>

<style>
  /* ── Page shell ── */
  .prints-page {
    min-height: 100vh;
    background-color: #0e0e0e;
    color: #f0ebe3;
    display: flex;
    flex-direction: column;
  }

  /* ── Dividers ── */
  .divider {
    border: none;
    border-top: 1px solid rgba(200, 192, 184, 0.08);
    margin: 0;
  }

  /* ── Page header ── */
  .page-header {
    padding: 6rem 5vw 3rem;
    text-align: center;
  }

  .page-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: clamp(3rem, 5.5vw, 6rem);
    line-height: 1;
    margin: 0 0 1rem 0;
    color: #f0ebe3;
    letter-spacing: -0.01em;
  }

  .page-subtitle {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.35em;
    color: rgba(200, 192, 184, 0.85);
    margin: 0;
  }

  /* ── Image section ── */
  .image-section {
    padding: 4rem 5vw;
    display: flex;
    justify-content: center;
  }

  .image-container {
    display: block;
    width: 100%;
    max-width: 900px;
    position: relative;
    background-color: #1a1a1a;
    overflow: hidden;
  }

  .prints-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity 0.6s ease-in-out;
  }

  .prints-image.loaded {
    opacity: 1;
  }

  .error-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 0.85rem;
    letter-spacing: 0.1em;
    color: rgba(200, 192, 184, 0.35);
  }

  /* ── CTA section ── */
  .cta-section {
    padding: 4rem 5vw 5rem;
  }

  .cta-inner {
    max-width: 680px;
    margin: 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
  }

  .cta-text {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 13px;
    line-height: 1.9;
    color: #c8c0b8;
    margin: 0;
  }

  .cta-links {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-bordered {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 400;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--forest-green, #2D4739);
    border: 1px solid var(--forest-green, #2D4739);
    padding: 0.75rem 2rem;
    text-decoration: none;
    display: inline-block;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .btn-bordered:hover {
    background-color: var(--forest-green, #2D4739);
    color: var(--warm-white, #f0ebe3);
  }

  /* ── Featured work ── */
  .featured {
    width: 100%;
    text-align: center;
  }

  .featured-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: 1.6rem;
    color: #f0ebe3;
    margin: 0 0 1rem 0;
  }

  .featured-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .featured-list li {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 13px;
    color: #c8c0b8;
    margin-bottom: 0.5rem;
  }

  .featured-list a {
    color: #c8c0b8;
    text-decoration: none;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(200, 192, 184, 0.2);
    transition: color 0.2s, border-color 0.2s;
  }

  .featured-list a:hover {
    color: var(--forest-green, #2D4739);
    border-color: var(--forest-green, #2D4739);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .page-header {
      padding: 5rem 1.5rem 2.5rem;
    }

    .page-title {
      font-size: clamp(2.5rem, 10vw, 3.5rem);
    }

    .image-section {
      padding: 2.5rem 1.5rem;
    }

    .cta-section {
      padding: 3rem 1.5rem 4rem;
    }

    .cta-links {
      flex-direction: column;
      align-items: center;
    }

    .btn-bordered {
      width: 100%;
      max-width: 260px;
      text-align: center;
    }
  }
</style>
