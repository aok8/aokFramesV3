<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment'; // Import browser check
  import { theme } from '../../../theme/theme.js'; // Try .js extension as suggested by linter
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores'; // Import the page store

  export let backgroundColor: string | undefined = undefined;
  export let textColor: string | undefined = undefined;
  
  let isOverPhoto = true;
  let navbar: HTMLElement;
  let isMenuOpen = false;

  // Reactive variables for dynamic mobile menu colors
  let currentMobileBgColor = theme.background.light; // Default
  let currentMobileTextColor = theme.text.primary; // Default

  function updateNavbarStyle() {
    if (!navbar || textColor || isMenuOpen) return; // Don't update if textColor is provided or menu is open
    
    const navbarRect = navbar.getBoundingClientRect();
    const photoSection = document.querySelector('.full-size-image');
    
    if (photoSection) {
      const photoRect = photoSection.getBoundingClientRect();
      isOverPhoto = navbarRect.top < (photoRect.bottom - navbarRect.height);
    }
  }

  function toggleMenu() {
    // Determine colors BEFORE toggling isMenuOpen
    const currentTextColor = textColor || (isOverPhoto ? 'white' : theme.text.primary);
    if (currentTextColor === 'white') {
      // If text was white (over photo), use inverted colors
      currentMobileBgColor = theme.text.primary; // Rosy brown background
      currentMobileTextColor = theme.background.light; // Light gray text
    } else {
      // Otherwise, use standard mobile colors
      currentMobileBgColor = theme.background.light; // Light gray background
      currentMobileTextColor = theme.text.primary; // Rosy brown text
    }

    isMenuOpen = !isMenuOpen;
    // Prevent background scroll when menu is open, only in browser
    if (browser) { 
      if (isMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  onMount(() => {
    // Only add scroll listener if we're using dynamic colors (and in browser)
    if (!textColor) { 
      const handleScroll = () => updateNavbarStyle(); // Define handler once
      window.addEventListener('scroll', handleScroll);
      updateNavbarStyle(); // Initial call

      return () => {
        // Cleanup listener, only in browser
        if (browser) {
          window.removeEventListener('scroll', handleScroll);
        }
      };
    }
  });

  // Reset body overflow when component is destroyed, only in browser
  onDestroy(() => {
    if (browser) {
      document.body.style.overflow = '';
    }
  });
</script>

<nav 
  bind:this={navbar}
  class="navbar {isMenuOpen ? 'menu-open' : ''}"
  style="
    --bg-color: {backgroundColor || 'transparent'}; 
    /* Use theme color when not over photo */
    --text-color: {textColor || (isOverPhoto && !isMenuOpen ? 'white' : theme.text.primary)}; 
    /* Bind to reactive variables */
    --mobile-bg-color: {currentMobileBgColor}; 
    --mobile-text-color: {currentMobileTextColor};
  "
>
  <div class="nav-content">
    <div class="logo">
      <a href="/">AOK<span>Frames</span></a>
    </div>
    <ul class="nav-links desktop-links">
      {#if $page.url.pathname !== '/'}
        <li><a href="/">Home</a></li>
      {/if}
      <li><a href="/works">Works</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/blog">Blog</a></li>
      <li><a href="/prints">Prints/Collabs</a></li>
    </ul>
    <button 
      class="hamburger-menu {isMenuOpen ? 'open' : ''}" 
      on:click={toggleMenu}
      aria-label="Toggle menu"
      aria-expanded={isMenuOpen}
      aria-controls="mobile-menu-overlay"
    >
      <span class="line line-1"></span>
      <span class="line line-2"></span>
    </button>
  </div>

  {#if isMenuOpen}
    <div 
      class="mobile-menu-overlay"
      id="mobile-menu-overlay"
      transition:fade={{ duration: 300 }}
    >
      <ul class="nav-links mobile-links">
        {#if $page.url.pathname !== '/'}
          <li><a href="/" on:click={toggleMenu}>Home</a></li>
        {/if}
        <li><a href="/works" on:click={toggleMenu}>Works</a></li>
        <li><a href="/about" on:click={toggleMenu}>About</a></li>
        <li><a href="/blog" on:click={toggleMenu}>Blog</a></li>
        <li><a href="/prints" on:click={toggleMenu}>Prints/Collabs</a></li>
      </ul>
    </div>
  {/if}
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4rem;
    z-index: 100;
    background-color: var(--bg-color);
    transition: background-color 0.3s ease, color 0.3s ease, height 0.3s ease;
  }

  .nav-content {
    width: 95%;
    margin: 0 auto;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    padding-left: 1rem;
    z-index: 110; /* Ensure logo stays above overlay background */
    display: none; /* Hide logo on mobile */
  }

  .logo a {
    font-family: 'Josefin Sans', sans-serif;
    font-size: 1.5rem;
    text-decoration: none;
    color: var(--text-color);
  }

  .logo a:hover {
    opacity: 0.8;
  }

  .logo span {
    color: color-mix(in srgb, var(--text-color) 80%, transparent);
    margin-left: 0.25rem;
  }

  .nav-links {
    list-style: none;
    margin: 0;
    padding: 0; 
    display: flex; 
  }

  .desktop-links {
    display: flex;
    gap: 2rem;
    padding-right: 2rem;
  }

  .nav-links a {
    color: var(--text-color);
    text-decoration: none;
    font-size: 1rem;
    transition: opacity 0.2s ease;
  }

  .nav-links a:hover {
    opacity: 0.8;
    text-decoration: underline;
  }

  .hamburger-menu {
    display: none; /* Hidden by default */
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    z-index: 110; /* Ensure hamburger stays above overlay background */
    margin-right: 0.5rem; /* Adjusted from padding-right on .nav-links */
  }

  .hamburger-menu .line {
    display: block;
    width: 24px;
    height: 3px; /* Slightly thicker lines */
    background-color: var(--text-color); 
    margin: 5px 0;
    transition: transform 0.3s ease, opacity 0.3s ease, background-color 0.3s ease;
  }

  .mobile-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background-color: var(--mobile-bg-color);
    z-index: 90; /* Below navbar content but above page content */
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.3s ease;
  }

  .mobile-links {
    flex-direction: column;
    text-align: center;
    gap: 2rem;
  }

  .mobile-links a {
    /* Use dynamic mobile text color variable */
    color: var(--mobile-text-color); 
    font-size: 1.8rem; /* Larger for touch */
    font-weight: bold;
  }

  .mobile-links a:hover {
    opacity: 0.8;
    text-decoration: none; /* Optional: remove underline for mobile */
  }

  /* Mobile Styles */
  @media (max-width: 768px) { /* Adjust breakpoint as needed */
    .navbar {
      height: 5rem; /* Thicker navbar */
    }

    .nav-content {
      justify-content: flex-end; /* Keep flex-end for mobile */
      padding-right: 1rem; /* Add padding back for mobile */
    }
    
    .logo {
      display: none; /* Keep logo hidden on mobile */
    }

    .desktop-links {
      display: none; /* Hide desktop links */
    }

    .hamburger-menu {
      display: block; /* Show hamburger */
      margin-right: 0; /* Remove margin, use padding on parent */
    }

    .hamburger-menu.open .line-1 {
      transform: translateY(8px) rotate(45deg); /* Animate to X */
    }

    .hamburger-menu.open .line-2 {
      transform: translateY(-0px) rotate(-45deg); /* Animate to X */
    }

    /* When menu is open, force navbar background and text/icon color using dynamic vars */
    .navbar.menu-open {
      background-color: var(--mobile-bg-color); 
    }
    .navbar.menu-open .logo a, /* Logo is hidden, but keep for potential future use */
    .navbar.menu-open .logo span,
    .navbar.menu-open .hamburger-menu .line {
      color: var(--mobile-text-color); 
      background-color: var(--mobile-text-color); /* Hamburger lines color */
    }
    .navbar.menu-open .logo span {
      color: color-mix(in srgb, var(--mobile-text-color) 80%, transparent);
    }

  }

  /* Hide hamburger on larger screens */
  @media (min-width: 769px) {
    .logo {
      display: block; /* Ensure logo is shown on desktop */
    }
    .mobile-menu-overlay {
        display: none; /* Ensure overlay is hidden */
    }
    .hamburger-menu {
        display: none; /* Ensure hamburger is hidden */
    }
    .desktop-links {
        display: flex; /* Ensure desktop links are shown */
    }
  }
</style>
  