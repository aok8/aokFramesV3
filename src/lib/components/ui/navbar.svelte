<script lang="ts">
  import { page } from '$app/stores';

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

  let navBg = $derived(
    backgroundColor
      ? backgroundColor
      : isScrolled
        ? 'rgba(14, 14, 14, 0.92)'
        : 'transparent'
  );

  let navTextColor = $derived(textColor || 'var(--warm-white)');

  let currentPath = $derived($page.url.pathname);
</script>

<svelte:window bind:scrollY />

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
        <a href="/works" class:active={currentPath.startsWith('/works')}>Works</a>
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
        <a href="/blog" onclick={closeMenu} class:active={currentPath.startsWith('/blog')}>Blog</a>
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
    transition: background-color 0.4s ease, backdrop-filter 0.4s ease;
  }

  .navbar.scrolled {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
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
    color: var(--forest-green, #2D4739);
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
    font-size: 10px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--warm-white, #f0ebe3);
    transition: color 0.2s ease;
  }

  .desktop-links a:hover,
  .desktop-links a.active {
    color: var(--forest-green, #2D4739);
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
    width: 36px;
    height: 36px;
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
    background-color: #0e0e0e;
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
    color: var(--forest-green, #2D4739);
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
