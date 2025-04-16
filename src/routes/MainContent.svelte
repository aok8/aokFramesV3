<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme } from '../theme/theme.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Footer, Navbar, Modal } from '$lib/components/ui/index.js';
  import { getPortfolioImages } from '$lib/utils/images.js';

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false;
  let contentElement: HTMLElement;
  let observer: IntersectionObserver;
  let selectedPhoto: string | null = null;
  let photoModalOpen = false;
  let portfolioImages: { url: string; fallback: string }[] = [];
  
  // Constants for background and profile image with fallbacks
  const bgImage = '/directr2/constants/bg.jpg'; // Direct R2 as primary now
  const fallbackBgImage = '/images/constants/bg.jpg'; // Local fallback
  const profileImage = '/directr2/constants/Profile_Pic.jpg'; // Direct R2 as primary
  const fallbackProfileImage = '/images/constants/Profile_Pic.jpg'; // Local fallback
  
  // Image error handling
  let bgImageError = false;
  let profileImageError = false;
  
  // Portfolio item image errors tracking
  const imageErrors = Array(portfolioImages.length).fill(false);
  const imageFallbackErrors = Array(portfolioImages.length).fill(false);

  // Load status reporting
  let imagesLoaded = 0;
  let totalImages = portfolioImages.length + 2; // +2 for bg and profile
  
  // Additional function to get cloudflare-specific public URL format if needed
  function getCloudflarePublicUrl(key: string): string {
    // Format for r2 usually includes account ID
    return `/directr2/${key}`;
  }
  
  // Function to handle an image load success
  function onImageLoad() {
    imagesLoaded++;
    console.log(`Loaded ${imagesLoaded}/${totalImages} images`);
  }

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
    /*
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
    */
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
    const loadImages = async () => {
      if (typeof window !== 'undefined') {
        // Force scroll to top
        window.scrollTo(0, 0);
        
        // Reset all state
        resetState();
        
        // Load portfolio images
        portfolioImages = await getPortfolioImages();
        totalImages = portfolioImages.length + 2;
        
        // Initialize observer after a small delay to ensure DOM is ready
        setTimeout(() => {
          initializeObserver();
        }, 100);
      }
    };

    loadImages();

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
    <Navbar />
    {#if !bgImageError}
      <img 
        src={bgImage} 
        alt="Night sky with stars" 
        class="full-size-image" 
        on:error={() => {
          console.log('Background image failed to load, trying fallback');
          bgImageError = true;
        }}
      />
    {:else}
      <img 
        src={fallbackBgImage} 
        alt="Night sky with stars" 
        class="full-size-image" 
        on:error={() => {
          console.error('Both background image paths failed');
        }}
      />
    {/if}
    {#if showText}
        <div class="text" transition:fade>
          Growth through experience
        </div>
    {/if}
    <Modal
      bind:open={photoModalOpen}
      onClose={() => photoModalOpen = false}
    >
      {#if selectedPhoto}
        <img 
          src={selectedPhoto} 
          alt="Selected portfolio work" 
          class="modal-photo"
          on:error={(e) => {
            console.error(`Failed to load image: ${selectedPhoto}`);
          }}
        />
      {/if}
    </Modal>
</div>

<div class="after-cover"
    style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};"
>
    <div class="photo-grid">
        {#each portfolioImages as image, i}
            <div class="grid-item">
                <button 
                  class="image-button"
                  on:click={() => {
                    // For modal view, select the URL that hasn't errored first, fallback second
                    selectedPhoto = !imageErrors[i] ? image.url : (!imageFallbackErrors[i] ? image.fallback : null);
                    photoModalOpen = true;
                  }}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      // For modal view, select the URL that hasn't errored first, fallback second
                      selectedPhoto = !imageErrors[i] ? image.url : (!imageFallbackErrors[i] ? image.fallback : null);
                      photoModalOpen = true;
                    }
                  }}
                >
                  {#if !imageErrors[i]}
                    <img 
                      src={image.url} 
                      alt="Portfolio work" 
                      class="grid-photo" 
                      loading="lazy"
                      on:error={() => {
                        console.log(`Image failed to load, trying fallback: ${image.url}`);
                        imageErrors[i] = true;
                      }}
                    />
                  {:else if !imageFallbackErrors[i]}
                    <img 
                      src={image.fallback} 
                      alt="Portfolio work" 
                      class="grid-photo" 
                      loading="lazy"
                      on:error={() => {
                        console.error(`Both image paths failed: ${image.url}`);
                        imageFallbackErrors[i] = true;
                      }}
                    />
                  {:else}
                    <div class="error-placeholder">Image unavailable</div>
                  {/if}
                </button>
            </div>
        {/each}
    </div>

    <div class="about-section">
        <div class="about-content">
            {#if !profileImageError}
              <img 
                src={profileImage} 
                alt="Profile" 
                class="profile-photo" 
                on:error={() => {
                  console.log('Profile image failed to load, trying fallback');
                  profileImageError = true;
                }}
              />
            {:else}
              <img 
                src={fallbackProfileImage} 
                alt="Profile" 
                class="profile-photo" 
                on:error={() => {
                  console.error('Both profile image paths failed');
                }}
              />
            {/if}
            <div class="about-text">
                <h2>About Me</h2>
                <p>I'm a Seattle based photographer who shoots both film and digital. I have a passion for capturing moments and telling stories through images as well as trying to continuously improve while experiencing life to the fullest.</p>
                <Button href="/about" variant="outline">More About Me</Button>
            </div>
        </div>
    </div>
</div>

<Footer />

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
        white-space: nowrap;
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
        columns: 4;
        column-gap: 2rem;
        padding: 2rem;
    }

    .grid-item {
        overflow: hidden;
        margin-bottom: 2rem;
    }

    .image-button {
        width: 100%;
        padding: 0;
        margin: 0;
        border: none;
        background: none;
        cursor: pointer;
        transition: transform 0.3s ease;
    }

    .image-button:hover {
        transform: scale(1.05);
    }

    .grid-photo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
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

    .modal-photo {
      max-width: 95%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 1500px) {
        .photo-grid {
            columns: 3;
        }
    }

    @media (max-width: 1200px) {
        .photo-grid {
            columns: 2;
        }
    }

    @media (max-width: 900px) {
        .photo-grid {
            columns: 1;
        }
        .text {
            font-size: 6vw;
        }
        .about-text {
            font-size: 0.8rem;
        }
        .about-text h2{
          font-size: 1.2rem;
          margin-bottom: 0.4rem;
        }

        .profile-photo {
            width: 10vh;
            height: 10vh;
            border-radius: 50%;
            object-fit: cover;
        }
        .about-content{
          gap: 0.5rem;
        }
    }

    .error-placeholder {
        width: 100%;
        aspect-ratio: 1 / 1;
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }
</style>