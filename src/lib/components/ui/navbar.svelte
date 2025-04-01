<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '../../../theme/theme.js';

  export let backgroundColor: string | undefined = undefined;
  
  let isOverPhoto = true;
  let navbar: HTMLElement;

  function updateNavbarStyle() {
    if (!navbar) return;
    
    const navbarRect = navbar.getBoundingClientRect();
    const photoSection = document.querySelector('.full-size-image');
    
    if (photoSection) {
      const photoRect = photoSection.getBoundingClientRect();
      isOverPhoto = navbarRect.top < (photoRect.bottom - navbarRect.height);
    }
  }

  onMount(() => {
    window.addEventListener('scroll', updateNavbarStyle);
    updateNavbarStyle();

    return () => {
      window.removeEventListener('scroll', updateNavbarStyle);
    };
  });
</script>

<nav 
  bind:this={navbar}
  class="navbar"
  style="
    --bg-color: {backgroundColor || 'transparent'}; 
    --text-color: {isOverPhoto ? 'white' : theme.text.primary};
  "
>
  <div class="nav-content">
    <div class="logo">
      <a href="/">AOK<span>Frames</span></a>
    </div>
    <ul class="nav-links">
      <li><a href="/portfolio">Portfolio</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4rem;
    z-index: 50;
    background-color: var(--bg-color);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .nav-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo a {
    font-family: 'Josefin Sans', sans-serif;
    font-size: 1.5rem;
    text-decoration: none;
    color: var(--text-color);
  }

  .logo span {
    color: color-mix(in srgb, var(--text-color) 80%, transparent);
    margin-left: 0.25rem;
  }

  .nav-links {
    display: flex;
    gap: 2rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-links a {
    color: var(--text-color);
    text-decoration: none;
    font-size: 1rem;
    transition: opacity 0.2s ease;
  }

  .nav-links a:hover {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    .nav-content {
      padding: 0 1rem;
    }

    .nav-links {
      gap: 1rem;
    }

    .logo a {
      font-size: 1.25rem;
    }
  }
</style>
  