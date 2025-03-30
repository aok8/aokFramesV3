<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme } from '../theme/theme.js';
  import { Button } from "$lib/components/ui/button";

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false;
  let contentElement: HTMLElement;
  let observer: IntersectionObserver;
  
  // Get all images from the Portfolio directory
  const portfolioImages = import.meta.glob('/src/images/Portfolio/*', { eager: true });
  const imageUrls = Object.entries(portfolioImages).map(([path]) => {
    // Convert the full path to a URL path (remove /static prefix)
    return path;//.replace('/src/images/Portfolio', '');
  });

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

<div class="after-cover"
    style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};"
>
    <div class="photo-grid">
        {#each imageUrls as imageUrl, i}
            <div class="grid-item">
                <img src={imageUrl} alt={`Portfolio photo ${i + 1}`} class="grid-photo" loading="lazy" />
            </div>
        {/each}
    </div>

    <div class="about-section">
        <div class="about-content">
            <img src="/images/Profile_Pic.jpg" alt="Profile" class="profile-photo" />
            <div class="about-text">
                <h2>About Me</h2>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <!-- <button 
                  class="interactive-button"
                  on:click={() => {
                    window.location.href = '/about';
                  }}
                  on:mouseenter={(e) => {
                    const button = e.currentTarget;
                    const rect = button.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    button.style.setProperty('--x', `${x}px`);
                    button.style.setProperty('--y', `${y}px`);
                    button.classList.add('hovered');
                  }}
                  on:mousemove={(e) => {
                    const button = e.currentTarget;
                    const rect = button.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    button.style.setProperty('--x', `${x}px`);
                    button.style.setProperty('--y', `${y}px`);
                  }}
                  on:mouseleave={(e) => {
                    e.currentTarget.classList.remove('hovered');
                  }}
                >
                  <span class="button-content">More About Me</span>
                  <span class="button-glow"></span>
                </button> -->	
                <Button variant="outline">More About Me</Button>
            </div>
        </div>
    </div>
</div>
<footer class="footer"
    style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};"
>
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
        background-color: var(--bg-color);
        color: var(--text-color);
        z-index: 0;
        padding: 2rem;
    }

    .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
        grid-template-rows: masonry;
        gap: 2rem;
        padding: 2rem;
    }

    .grid-item {
        overflow: hidden;
    }

    .grid-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
    }

    .grid-photo:hover {
        transform: scale(1.05);
    }

    .about-section {
        padding: 4rem 2rem;
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
        background-color: color-mix(in srgb, var(--bg-color) 80%, black);
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
        color: inherit;
        text-decoration: none;
        transition: color 0.2s;
    }

    .email:hover {
        opacity: 0.8;
    }

    .instagram {
        color: inherit;
        transition: color 0.2s;
    }

    .instagram:hover {
        opacity: 0.8;
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