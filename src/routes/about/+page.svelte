<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';

  const profileImage = '/directr2/constants/Profile_Pic.webp';
  const fallbackProfileImage = '/images/constants/Profile_Pic.webp';
  let profileImageError = $state(false);
</script>

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
          "I try best to capture feelings and essence through the images I take, to invoke some sort of emotion in the viewer."
        </blockquote>
      </div>

      <div class="bio-body">
        <p>
          Alain is a photographer with a love for visual storytelling.
          Originally from New Jersey and now based in Seattle, he brings four years of photographic experience to his work,
          including three years immersed in the art of film.
          Whether in vivid color or classic black and white, he seeks to capture a collection of awe-inspiring images.
        </p>
        <p>
          It's because of this that he has a hard time categorizing his work — it's more a collection of moments.
          He finds joy in being able to see the changes in what caught his eye, and in bringing back memories of what
          exactly it was that excited him. Hopefully, through this, you'll be excited to see what he's been up to.
        </p>
      </div>
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
    color: rgba(200, 192, 184, 0.55);
    margin: 0;
  }

  /* ── Bio ── */
  .bio {
    padding: 5rem 5vw;
  }

  .bio-inner {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 5rem;
    max-width: 1100px;
    margin: 0 auto;
    align-items: start;
  }

  .pull-quote {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(1.5rem, 2.2vw, 2.1rem);
    line-height: 1.45;
    color: var(--forest-green, #2D4739);
    margin: 0;
    padding: 0;
    border: none;
  }

  .bio-body p {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 13px;
    line-height: 1.9;
    color: #c8c0b8;
    margin: 0 0 1.4em 0;
  }

  .bio-body p:last-child {
    margin-bottom: 0;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .bio-inner {
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
  }

  @media (max-width: 768px) {
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
