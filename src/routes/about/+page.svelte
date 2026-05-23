<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import { assetUrl } from '$lib/utils/r2.js';

  const profileImage = assetUrl('constants/Profile_Pic.webp');
  const fallbackProfileImage = '/images/constants/Profile_Pic.webp';
  let profileImageError = $state(false);
</script>

<svelte:head>
  <title>About — AOKFrames</title>
  <meta name="description" content="Alain Kouassi is a Seattle-based photographer working in film and digital — capturing the moments just before and after things happen." />
  <meta property="og:title" content="About — AOKFrames" />
  <meta property="og:description" content="Alain Kouassi is a Seattle-based photographer working in film and digital — capturing the moments just before and after things happen." />
  <meta property="og:url" content="https://aokframes.com/about" />
</svelte:head>

<div class="about-page">
  <Navbar />

  <!-- Hero -->
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-image-wrap">
        {#if !profileImageError}
          <img
            src={profileImage}
            alt="Alain"
            class="hero-img"
            onerror={() => { profileImageError = true; }}
          />
        {:else}
          <img
            src={fallbackProfileImage}
            alt="Alain"
            class="hero-img"
            onerror={() => { console.error('Both profile image paths failed'); }}
          />
        {/if}
      </div>

      <div class="hero-text">
        <h1 class="hero-name">Alain Kouassi</h1>
        <p class="hero-subtitle">Seattle Photographer · Film &amp; Digital</p>
      </div>
    </div>
  </section>

  <hr class="divider" />

  <!-- Bio -->
  <section class="bio">
    <div class="bio-inner">
      <div class="bio-pull">
        <blockquote class="pull-quote">
          "I try best to capture feelings and essence through the images I take, to invoke some sort of emotion in the viewer.
          It's because of this, that I have a hard time categorizing my work, it's more a collection of such.
          I find joy in being able to see the changes in what caught my eye, and also bring back memories of what exactly it was that excited me.
          Hopefully, through this, you'll be excited to see what I've been up to."
        </blockquote>
      </div>

      <div class="bio-body">
        <p>
          Alain is a photographer with a love for visual storytelling.
          Originally from New Jersey and now based in Seattle, he brings four years of photographic experience to his work,
          including three years immersed in the art of film.
          Whether in vivid color or classic black and white, he seeks to capture a collection of awe inspiring images.
        </p>
      </div>
    </div>
  </section>

  <hr class="divider" />

  <!-- Featured Work -->
  <section class="featured">
    <div class="featured-inner">
      <p class="featured-eyebrow">Featured</p>
      <h2 class="featured-title">Work</h2>
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
  </section>

  <hr class="divider" />

  <Footer />
</div>

<style>
  /* ── Page shell ── */
  .about-page {
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

  /* ── Hero ── */
  .hero {
    min-height: 65vh;
    display: flex;
    align-items: center;
    padding: 6rem 5vw 4rem;
  }

  .hero-inner {
    display: flex;
    align-items: center;
    gap: 5rem;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
  }

  .hero-image-wrap {
    flex: 0 0 auto;
  }

  .hero-img {
    width: 420px;
    height: 520px;
    object-fit: cover;
    display: block;
    filter: sepia(8%) contrast(1.04);
  }

  .hero-text {
    flex: 1;
  }

  .hero-name {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: clamp(3rem, 5vw, 5rem);
    line-height: 1.05;
    margin: 0 0 1.25rem 0;
    color: #f0ebe3;
    letter-spacing: -0.01em;
  }

  .hero-subtitle {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 100;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.35em;
    color: rgba(200, 192, 184, 0.85);
    margin: 0;
  }

  /* ── Bio ── */
  .bio {
    padding: 5rem 5vw;
  }

  .bio-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6rem;
    max-width: 1100px;
    margin: 0 auto;
    align-items: center;
  }

  .pull-quote {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(1rem, 1.35vw, 1.3rem);
    line-height: 1.75;
    color: #6a9e82;
    margin: 0;
    padding: 0 0 0 1.5rem;
    border: none;
    border-left: 1px solid rgba(45, 71, 57, 0.4);
  }

  .bio-body p {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: clamp(0.875rem, 1.05vw, 1rem);
    line-height: 1.9;
    color: #c8c0b8;
    margin: 0 0 1.4em 0;
  }

  .bio-body p:last-child {
    margin-bottom: 0;
  }

  /* ── Featured Work ── */
  .featured {
    padding: 5rem 5vw;
  }

  .featured-inner {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
  }

  .featured-eyebrow {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 0.45em;
    text-transform: uppercase;
    color: var(--forest-green, #2D4739);
    margin: 0 0 0.5rem 0;
  }

  .featured-title {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(2rem, 3.5vw, 3rem);
    color: #f0ebe3;
    margin: 0 0 2rem 0;
    line-height: 1;
  }

  .featured-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .featured-list li {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 13px;
    color: #c8c0b8;
  }

  .featured-list a {
    color: #c8c0b8;
    text-decoration: none;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(200, 192, 184, 0.2);
    padding-bottom: 1px;
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  .featured-list a:hover {
    color: var(--forest-green, #2D4739);
    border-color: var(--forest-green, #2D4739);
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .bio-inner {
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
  }

  @media (max-width: 768px) {
    .featured {
      padding: 3rem 1.5rem;
    }

    .hero {
      padding: 5rem 1.5rem 3rem;
      min-height: unset;
    }

    .hero-inner {
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
      text-align: center;
    }

    .hero-img {
      width: 100%;
      max-width: 340px;
      height: 380px;
    }

    .hero-name {
      font-size: 2.8rem;
    }

    .bio {
      padding: 3rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .hero-img {
      max-width: 280px;
      height: 320px;
    }

    .hero-name {
      font-size: 2.2rem;
    }
  }
</style>
