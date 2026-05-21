<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import type { PageData } from './$types';

  const { data }: { data: PageData } = $props();
</script>

<div class="peek-page">
  <Navbar />

  <main class="peek-main">
    <header class="peek-header">
      <p class="peek-eyebrow">Quick-Peek</p>
      <h1 class="peek-title">On the Table</h1>
      <p class="peek-desc">
        Images I've processed in the past days, just a peek into what I'm up to.<br />
        Images will either be made into a work, or stored away, archived.<br />
        Check back to see what's on the table.
      </p>
    </header>

    <div class="strips-placeholder">Film strips load here — Sprint 2</div>
  </main>

  <Footer />
</div>

<style>
  .peek-page {
    min-height: 100vh;
    background-color: var(--near-black);
    color: var(--warm-white);
    display: flex;
    flex-direction: column;
  }

  .peek-main {
    flex: 1;
    padding-bottom: 5rem;
  }

  .peek-header {
    padding: 9rem 5vw 3rem;
    border-bottom: 1px solid rgba(200, 192, 184, 0.08);
    text-align: center;
  }

  .peek-eyebrow {
    font-family: var(--font-ui);
    font-size: 8px;
    font-weight: 300;
    letter-spacing: 0.45em;
    text-transform: uppercase;
    color: var(--green-light);
    margin-bottom: 1rem;
  }

  .peek-title {
    font-family: var(--font-display);
    font-size: clamp(3rem, 6vw, 6rem);
    font-weight: 300;
    font-style: italic;
    line-height: 1;
    letter-spacing: -0.01em;
    margin-bottom: 1.5rem;
  }

  .peek-desc {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 300;
    letter-spacing: 0.15em;
    line-height: 2;
    color: rgba(200, 192, 184, 0.85);
    white-space: nowrap;
  }

  .strips-placeholder {
    padding: 4rem 0;
    text-align: center;
    font-family: var(--font-ui);
    font-size: 9px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.2);
  }
</style>
