<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme } from '../theme/theme.js';

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false;
  let contentElement: HTMLElement;
  let observer: IntersectionObserver;

  function resetState() {
    isSticky = true;
    isScrollingPaused = false;
    showText = false;
    hasPassed = false;
  }

  function checkStickyState(entry: IntersectionObserverEntry) {
    // Only use intersection observer to prevent gaps
    if (entry.intersectionRatio < 0.98 && !hasPassed) {
      isSticky = false;
      hasPassed = true;
    }
  }

  function pauseScrolling() {
    if (isScrollingPaused) return;
    
    isScrollingPaused = true;
    const currentScroll = window.scrollY;
    
    // Ensure we're at the right position before pausing
    window.scrollTo(0, currentScroll);
    document.body.style.overflow = 'hidden';
    
    // Small delay before showing text for smoother transition
    setTimeout(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, currentScroll);
        showText = true;
      });
    }, 200);

    setTimeout(() => {
      showText = false;
      setTimeout(() => {
        document.body.style.overflow = '';
        isScrollingPaused = false;
      }, 500);
    }, 2000);
  }

  function initializeObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(checkStickyState);
      },
      { 
        threshold: [0.98, 1],
        rootMargin: '-50px 0px 0px 0px'
      }
    );

    const imageElement = document.querySelector('.full-size-image');
    if (imageElement) {
      observer.observe(imageElement);
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      // Force scroll to top
      window.scrollTo(0, 0);
      
      // Reset all state
      resetState();
      
      // Initialize observer after a small delay to ensure DOM is ready
      setTimeout(() => {
        initializeObserver();
      }, 100);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  export function handleCoverScrolledAway() {
    // Trigger pause directly when cover slides away
    pauseScrolling();
  }
</script>

<div class="content" bind:this={contentElement}>
    <img src="/images/bg.jpg" alt="AOK Frames Star Pic" class="full-size-image" />
    {#if showText}
        <div class="text" transition:fade>
          Growth through experience
        </div>
    {/if}
</div>

<div class="after-cover">
  <div class="photo-grid">
    <!-- Grid will be populated with photos -->
    {#each Array(9) as _, i}
      <div class="grid-item">
        <img src="/images/bg.jpg" alt={`Grid photo ${i + 1}`} class="grid-photo" />
      </div>
    {/each}
  </div>

  <div class="about-section">
    <div class="about-content">
      <img src="/images/bg.jpg" alt="Profile" class="profile-photo" />
      <div class="about-text">
        <h2>About Me</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-content">
      <h3>AOKFrames</h3>
      <a href="mailto:aokframes@gmail.com" class="email">aokframes@gmail.com</a>
      <a href="https://instagram.com/aokframes" target="_blank" rel="noopener noreferrer" class="instagram">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      </a>
    </div>
  </footer>
</div>

<style>
    .content {
      min-height: 220vh;
      padding: 0;
      margin: 0;
      position: relative;
      z-index: 1;
    }

    .full-size-image {
        position: sticky;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        z-index: 2;
        margin: 0;
        display: block;
    }

    .text {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 3;
        font-size: 5rem;
        color: white;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        pointer-events: none;
    }

    .after-cover {
        position: relative;
        width: 100%;
        background-color: var(--primary-color);
        z-index: 0;
        padding: 2rem;
    }

    .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        padding: 2rem;
    }

    .grid-item {
        aspect-ratio: 1;
        overflow: hidden;
    }

    .grid-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .about-section {
        padding: 4rem 2rem;
        color: #EFEBE0;
    }

    .about-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .profile-photo {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        object-fit: cover;
    }

    .about-text {
        flex: 1;
    }

    .about-text h2 {
        font-size: 2rem;
        margin-bottom: 1rem;
        font-weight: 300;
    }

    .footer {
        padding: 2rem;
        background-color: color-mix(in srgb, var(--primary-color) 80%, black);
        color: #EFEBE0;
    }

    .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .footer-content h3 {
        font-size: 1.5rem;
        font-weight: 300;
    }

    .email {
        color: #EFEBE0;
        text-decoration: none;
        transition: color 0.2s;
    }

    .email:hover {
        color: #a39e93;
    }

    .instagram {
        color: #EFEBE0;
        transition: color 0.2s;
    }

    .instagram:hover {
        color: #a39e93;
    }

    @media (max-width: 768px) {
        .about-content {
            flex-direction: column;
            text-align: center;
        }

        .profile-photo {
            width: 150px;
            height: 150px;
        }
    }
</style>