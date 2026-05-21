<script lang="ts">
  let { class_name = '' }: { class_name?: string } = $props();
  const currentYear = new Date().getFullYear();
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
      <a href="https://vsco.co/aokframes" target="_blank" rel="noopener noreferrer">
        VSCO
      </a>
      <span class="divider" aria-hidden="true">·</span>
      <a href="mailto:aokframes@gmail.com">
        Contact
      </a>
    </nav>

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
    color: var(--gold, #b8936a);
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
    font-size: 9px;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--text-dim, rgba(200, 192, 184, 0.45));
    text-decoration: none;
    transition: color 0.3s ease;
  }

  .footer-links a:hover {
    color: var(--silver, #c8c0b8);
  }

  .divider {
    color: var(--text-dim, rgba(200, 192, 184, 0.45));
    font-size: 9px;
  }

  .footer-copy {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 9px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--text-dim, rgba(200, 192, 184, 0.3));
    margin: 0;
  }
</style>
