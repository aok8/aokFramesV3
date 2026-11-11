<script lang="ts">
  import { page } from '$app/stores';
  import { prefetchWorkCovers } from '$lib/utils/prefetch.js';

  let { backgroundColor, textColor }: { backgroundColor?: string; textColor?: string } = $props();

  let scrollY = $state(0);
  let isMenuOpen = $state(false);

  let isScrolled = $derived(scrollY >= 80);

  $effect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  });

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }

  // Solid once scrolled (was 92% black with a blur). Stopgap for iOS 26 Safari, which draws the
  // page behind the status bar and won't let sites paint that strip yet
  // (https://bugs.webkit.org/show_bug.cgi?id=306465); a solid fixed header is the workaround that
  // keeps scrolled titles from showing through there. Other browsers look the same either way.
  // Revisit (and bring the translucent blur back if wanted) once Safari lets sites control it.
  let navBg = $derived(
    backgroundColor
      ? backgroundColor
      : isScrolled
        ? 'var(--near-black, #0e0e0e)'
        : 'transparent'
  );

  let navTextColor = $derived(textColor || 'var(--warm-white)');

  let currentPath = $derived($page.url.pathname);
</script>

<svelte:window bind:scrollY onkeydown={(e) => e.key === 'Escape' && isMenuOpen && closeMenu()} />

<nav
  class="navbar"
  class:scrolled={!backgroundColor && isScrolled}
  style="--nav-bg: {navBg}; --nav-text: {navTextColor};"
>
  <div class="nav-content">
    <div class="logo">
      <a href="/" onclick={isMenuOpen ? closeMenu : undefined}>
        <span class="logo-bold">AOK</span><span class="logo-light">Frames</span>
      </a>
    </div>

    <ul class="nav-links desktop-links">
      {#if currentPath !== '/'}
        <li>
          <a href="/" class:active={currentPath === '/'}>Home</a>
        </li>
      {/if}
      <li>
        <a href="/works" class:active={currentPath.startsWith('/works')} onpointerenter={prefetchWorkCovers} onfocus={prefetchWorkCovers}>Works</a>
      </li>
      <li>
        <a href="/about" class:active={currentPath.startsWith('/about')}>About</a>
      </li>
      <li>
        <a href="/peek" class:active={currentPath.startsWith('/peek')}>Peek</a>
      </li>
      <li>
        <a href="/blog" class:active={currentPath.startsWith('/blog')}>Journal</a>
      </li>
      <li>
        <a href="/prints" class:active={currentPath.startsWith('/prints')}>Prints/Collabs</a>
      </li>
    </ul>

    <button
      class="hamburger"
      class:open={isMenuOpen}
      onclick={toggleMenu}
      aria-label="Toggle navigation"
      aria-expanded={isMenuOpen}
      aria-controls="mobile-overlay"
    >
      <span class="bar bar-1"></span>
      <span class="bar bar-2"></span>
    </button>
  </div>
</nav>

{#if isMenuOpen}
  <div class="mobile-overlay" id="mobile-overlay" role="dialog" aria-modal="true">
    <ul class="mobile-links">
      <li>
        <a href="/" onclick={closeMenu} class:active={currentPath === '/'}>Home</a>
      </li>
      <li>
        <a href="/works" onclick={closeMenu} class:active={currentPath.startsWith('/works')}>Works</a>
      </li>
      <li>
        <a href="/about" onclick={closeMenu} class:active={currentPath.startsWith('/about')}>About</a>
      </li>
      <li>
        <a href="/peek" onclick={closeMenu} class:active={currentPath.startsWith('/peek')}>Peek</a>
      </li>
      <li>
        <a href="/blog" onclick={closeMenu} class:active={currentPath.startsWith('/blog')}>Journal</a>
      </li>
      <li>
        <a href="/prints" onclick={closeMenu} class:active={currentPath.startsWith('/prints')}>Prints/Collabs</a>
      </li>
    </ul>
  </div>
{/if}

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 64px;
    z-index: 100;
    background-color: var(--nav-bg);
    transition: background-color 0.4s ease;
  }

  /*
   * Phone browsers can draw the page behind the status bar (the clock), above the top of the
   * viewport. Without this, titles scrolled past the bar showed through up there. A solid band
   * the site's own black extends the bar upward, out of sight on desktop.
   */
  .navbar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    height: 200px;
    background: var(--near-black, #0e0e0e);
    pointer-events: none;
  }

  .nav-content {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    box-sizing: border-box;
  }

  /* Logo */
  .logo {
    z-index: 110;
  }

  .logo a {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 1.25rem;
    text-decoration: none;
    color: var(--nav-text);
    display: flex;
    align-items: baseline;
    gap: 0.1em;
    letter-spacing: 0.05em;
  }

  .logo-bold {
    font-weight: 700;
    color: var(--green-lit, #86ad93);
  }

  .logo-light {
    font-weight: 300;
  }

  /* Desktop nav links */
  .desktop-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 2.5rem;
    align-items: center;
  }

  .desktop-links a {
    font-family: var(--font-ui, 'Josefin Sans', sans-serif);
    font-size: 12px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--warm-white, #f0ebe3);
    transition: color 0.2s ease;
    display: inline-block;
    padding: 14px 0;
  }

  .desktop-links a:hover,
  .desktop-links a.active {
    color: var(--green-lit, #86ad93);
  }

  /* Hamburger */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    z-index: 110;
    width: 44px;
    height: 44px;
  }

  .bar {
    display: block;
    width: 24px;
    height: 1.5px;
    background-color: var(--nav-text);
    transition: transform 0.3s ease, opacity 0.3s ease;
    transform-origin: center;
  }

  .hamburger.open .bar-1 {
    transform: translateY(3.75px) rotate(45deg);
  }

  .hamburger.open .bar-2 {
    transform: translateY(-3.75px) rotate(-45deg);
  }

  /* Mobile overlay */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    background-color: #0e0e0e;
    /* cover the phone's status bar and toolbar areas too */
    box-shadow: 0 0 0 100vmax #0e0e0e;
    z-index: 99;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .mobile-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.5rem;
    text-align: center;
  }

  .mobile-links a {
    font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
    font-size: 2.5rem;
    font-weight: 300;
    letter-spacing: 0.1em;
    text-decoration: none;
    color: var(--warm-white, #f0ebe3);
    transition: color 0.2s ease;
  }

  .mobile-links a:hover,
  .mobile-links a.active {
    color: var(--green-lit, #86ad93);
  }

  /* Mobile breakpoint */
  @media (max-width: 768px) {
    .desktop-links {
      display: none;
    }

    .hamburger {
      display: flex;
    }

    .nav-content {
      padding: 0 1.25rem;
    }
  }

  /* Desktop: ensure overlay hidden */
  @media (min-width: 769px) {
    .mobile-overlay {
      display: none;
    }

    .hamburger {
      display: none;
    }
  }
</style>
