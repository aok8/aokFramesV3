<script lang="ts">
  import { page } from '$app/stores';
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';

  const status = $derived($page.status);
  const message = $derived(
    status === 404
      ? "This page doesn't exist."
      : "Something went wrong."
  );
</script>

<svelte:head>
  <title>{status} — AOKFrames</title>
</svelte:head>

<div class="error-page">
  <Navbar />

  <main class="error-main">
    <p class="error-eyebrow">Error</p>
    <h1 class="error-code">{status}</h1>
    <div class="error-message">
      {#if status === 404}
        <p>Sorry, this page doesn't exist. It's probably hidden somewhere with Kodak Aerochrome.</p>
        <p>There may be a typo in the URL or the page may have been moved.</p>
      {:else}
        <p>{message}</p>
      {/if}
    </div>
    <a href="/" class="btn-bordered">Back to Home</a>
  </main>

  <Footer />
</div>

<style>
  .error-page {
    min-height: 100vh;
    background-color: #0e0e0e;
    color: #f0ebe3;
    display: flex;
    flex-direction: column;
  }

  .error-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8rem 2rem 6rem;
    gap: 1.5rem;
  }

  .error-eyebrow {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 0.45em;
    text-transform: uppercase;
    color: var(--forest-green, #2D4739);
    margin: 0;
  }

  .error-code {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(6rem, 18vw, 14rem);
    line-height: 1;
    letter-spacing: -0.02em;
    color: rgba(200, 192, 184, 0.12);
    margin: 0;
  }

  .error-message {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
  }

  .error-message p {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-weight: 300;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    color: rgba(200, 192, 184, 0.7);
    margin: 0;
    line-height: 1.8;
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
    margin-top: 1rem;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .btn-bordered:hover {
    background-color: var(--forest-green, #2D4739);
    color: var(--warm-white, #f0ebe3);
  }
</style>
