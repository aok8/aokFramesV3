<script lang="ts">
  import { onMount } from 'svelte';
  import { openContact } from '$lib/stores/contact.js';

  let { class_name = '' }: { class_name?: string } = $props();
  const currentYear = new Date().getFullYear();

  // "Last roll developed": the date of the newest upload on Peek. Hidden until it is known.
  let lastRoll = $state<string | null>(null);
  onMount(() => {
    fetch('/api/last-roll')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { lastRoll: string | null } | null) => {
        if (!d?.lastRoll) return;
        lastRoll = new Date(d.lastRoll).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      })
      .catch(() => {});
  });
</script>

<footer class="footer {class_name}">
  <div class="footer-inner">

    <a href="/" class="footer-monogram">
      <em>AOK</em>Frames
    </a>

    <nav class="footer-links" aria-label="Footer navigation">
      <a href="https://instagram.com/aokframes" target="_blank" rel="noopener noreferrer">
        Instagram
      </a>
      <span class="divider" aria-hidden="true">·</span>
      <a href="https://www.newgrain.app/aokframes" target="_blank" rel="noopener noreferrer">
        NewGrain
      </a>
      <span class="divider" aria-hidden="true">·</span>
      <a href="mailto:aokframes@gmail.com" onclick={openContact('Hello')}>
        Contact
      </a>
    </nav>

    {#if lastRoll}
      <a href="/peek" class="last-roll">
        <span class="dot" aria-hidden="true"></span>
        Last roll developed <span class="when">{lastRoll}</span> · see what's on the table
      </a>
    {/if}

    <p class="footer-copy">© {currentYear} AOKFrames</p>

  </div>
</footer>

<style>
  .footer {
    background-color: var(--near-black, #0e0e0e);
    border-top: 1px solid rgba(200, 192, 184, 0.08);
    padding: 48px 32px;
  }

  .footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .footer-monogram {
    display: inline-block;
    padding: 8px 0;
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-size: 1.5rem;
    font-weight: 300;
    letter-spacing: 0.06em;
    color: var(--warm-white, #f0ebe3);
    text-decoration: none;
    transition: color 0.3s ease;
  }

  .footer-monogram em {
    font-style: italic;
    color: var(--green-lit, #86ad93);
  }

  .footer-monogram:hover {
    color: var(--silver, #c8c0b8);
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .footer-links a {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 12px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--text-dim, rgba(200, 192, 184, 0.45));
    text-decoration: none;
    transition: color 0.3s ease;
    display: inline-block;
    padding: 14px 4px;
  }

  .last-roll {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 10px 4px;
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--silver, #c8c0b8);
    text-decoration: none;
    text-align: center;
    transition: color 0.3s ease;
  }

  .last-roll:hover {
    color: var(--warm-white, #f0ebe3);
  }

  .last-roll .when {
    color: var(--warm-white, #f0ebe3);
  }

  /* A safelight that is still on */
  .last-roll .dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b4632a;
    animation: safelight 2.8s ease-in-out infinite;
  }

  @keyframes safelight {
    0%, 100% { box-shadow: 0 0 0 0 rgba(180, 99, 42, 0.5); }
    50% { box-shadow: 0 0 0 6px rgba(180, 99, 42, 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .last-roll .dot {
      animation: none;
    }
  }

  .footer-links a:hover {
    color: var(--silver, #c8c0b8);
  }

  .divider {
    color: var(--text-dim, rgba(200, 192, 184, 0.45));
    font-size: 12px;
  }

  .footer-copy {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 12px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--text-dim, rgba(200, 192, 184, 0.3));
    margin: 0;
  }
</style>
