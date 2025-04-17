<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme } from '../theme/theme.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Footer, Navbar, Modal } from '$lib/components/ui/index.js';
  import { getPortfolioImages } from '$lib/utils/images';

  // Define the expected image structure including dimensions
  interface PortfolioImage {
    url: string;
    fallback: string;
    width: number;
    height: number;
  }

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false;
  let contentElement: HTMLElement;
  let observer: IntersectionObserver;
  let selectedPhoto: string | null = null;
  let photoModalOpen = false;
  let portfolioImages: PortfolioImage[] = []; // Use updated interface
  
  // Constants for background and profile image with fallbacks
  const bgImageConst = '/directr2/constants/bg.jpg';
  const fallbackBgImageConst = '/images/constants/bg.jpg';
  const profileImageConst = '/directr2/constants/Profile_Pic.jpg';
  const fallbackProfileImageConst = '/images/constants/Profile_Pic.jpg';
  
  // Image error handling
  let bgImageError = false;
  let profileImageError = false;
  
  // Keep element references for the bind:this attempt
  let bgImageElement: HTMLImageElement | null = null;
  let fallbackBgImageElement: HTMLImageElement | null = null;
  let profileImageElement: HTMLImageElement | null = null;
  let fallbackProfileImageElement: HTMLImageElement | null = null;
  
  // Portfolio item image errors tracking
  // Reactive declarations needed for array updates to trigger changes
  $: imageErrors = Array(portfolioImages.length).fill(false);
  $: imageFallbackErrors = Array(portfolioImages.length).fill(false);

  // Load status reporting - state for fade-in animations
  let bgLoaded = false;
  let profileLoaded = false;
  $: portfolioLoaded = Array(portfolioImages.length).fill(false); // Reactive

  // Additional function to get cloudflare-specific public URL format if needed
  // function getCloudflarePublicUrl(key: string): string {
    // Format for r2 usually includes account ID
    // return `/directr2/${key}`;
  // }
  
  // Function to handle an image load success - No longer needed for count
  // function onImageLoad() {
    // imagesLoaded++;
    // console.log(`Loaded ${imagesLoaded}/${totalImages} images`);
  // }

  function resetState() {
    isSticky = true;
    isScrollingPaused = false;
    showText = false;
    hasPassed = false;
    // Reset loaded states if re-running logic
    bgLoaded = false;
    profileLoaded = false;
    bgImageError = false;
    profileImageError = false;
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
        console.error('DEBUG: Portfolio images loaded:', portfolioImages);
        if (portfolioImages && Array.isArray(portfolioImages)) {
          console.error(`DEBUG: Got ${portfolioImages.length} portfolio images`);
          // Show first two URLs if available
          if (portfolioImages.length > 0) {
            console.error(`DEBUG: First image URL: ${portfolioImages[0].url}`);
            if (portfolioImages.length > 1) {
              console.error(`DEBUG: Second image URL: ${portfolioImages[1].url}`);
            }
          }
        } else {
          console.error('DEBUG: Portfolio images is not an array:', typeof portfolioImages);
        }
        // Initialize loaded array after images are fetched
        portfolioLoaded = Array(portfolioImages.length).fill(false);
        
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

  // Add back afterUpdate logic for checking .complete
  afterUpdate(() => {
      // Check background image completion
      if (!bgImageError && bgImageElement?.complete && !bgLoaded) {
          // console.log('BG image already complete, setting loaded state.');
          bgLoaded = true;
      } else if (bgImageError && fallbackBgImageElement?.complete && !bgLoaded) {
          // console.log('Fallback BG image already complete, setting loaded state.');
          bgLoaded = true;
      }

      // Check profile image completion
      if (!profileImageError && profileImageElement?.complete && !profileLoaded) {
          // console.log('Profile image already complete, setting loaded state.');
          profileLoaded = true;
      } else if (profileImageError && fallbackProfileImageElement?.complete && !profileLoaded) {
          // console.log('Fallback Profile image already complete, setting loaded state.');
          profileLoaded = true;
      }
  });

  export function handleCoverScrolledAway() {
    // Trigger pause directly when cover slides away
    pauseScrolling();
  }
</script>

<div class="content" bind:this={contentElement}>
    <Navbar />
    <div class="background-image-container">
      {#if !bgImageError}
        <img
          bind:this={bgImageElement}
          src={bgImageConst}
          alt="Night sky with stars"
          class="full-size-image"
          class:loaded={bgLoaded}
          on:load={() => { bgLoaded = true; }}
          on:error={() => {
            console.log('Background image failed to load, trying fallback');
            bgImageError = true;
            bgLoaded = false;
          }}
        />
      {:else}
        <img
          bind:this={fallbackBgImageElement}
          src={fallbackBgImageConst}
          alt="Night sky with stars"
          class="full-size-image"
          class:loaded={bgLoaded}
          on:load={() => { bgLoaded = true; }}
          on:error={() => {
            console.error('Both background image paths failed');
          }}
        />
      {/if}
    </div>
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
        {#each portfolioImages as image, i (image.url)}
            <div class="grid-item">
                <button
                  class="image-button"
                  on:click={() => {
                    selectedPhoto = !imageErrors[i] ? image.url : (!imageFallbackErrors[i] ? image.fallback : null);
                    if (selectedPhoto) photoModalOpen = true;
                  }}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectedPhoto = !imageErrors[i] ? image.url : (!imageFallbackErrors[i] ? image.fallback : null);
                      if (selectedPhoto) photoModalOpen = true;
                    }
                  }}
                >
                  <div
                    class="image-container"
                    style:aspect-ratio={image.width && image.height ? `${image.width} / ${image.height}` : '1 / 1'}
                  >
                    {#if !imageErrors[i]}
                      <img
                        src={image.url}
                        alt="Portfolio work"
                        class="grid-photo"
                        class:loaded={portfolioLoaded[i]}
                        loading="lazy"
                        on:load={() => { portfolioLoaded[i] = true; }}
                        on:error={() => {
                          console.log(`Image failed to load, trying fallback: ${image.url}`);
                          imageErrors[i] = true;
                          portfolioLoaded[i] = false;
                        }}
                      />
                    {:else if !imageFallbackErrors[i]}
                      <img
                        src={image.fallback}
                        alt="Portfolio work"
                        class="grid-photo"
                        class:loaded={portfolioLoaded[i]}
                        loading="lazy"
                        on:load={() => { portfolioLoaded[i] = true; }}
                        on:error={() => {
                          console.error(`Both image paths failed: ${image.url}`);
                          imageFallbackErrors[i] = true;
                        }}
                      />
                    {:else}
                      <div class="error-placeholder">Image unavailable</div>
                    {/if}
                  </div>
                </button>
            </div>
        {/each}
    </div>

    <div class="about-section">
        <div class="about-content">
            <div class="profile-photo-wrapper">
              {#if !profileImageError}
                <img
                  bind:this={profileImageElement}
                  src={profileImageConst}
                  alt="Profile"
                  class="profile-photo"
                  class:loaded={profileLoaded}
                  on:load={() => { profileLoaded = true; }}
                  on:error={() => {
                    console.log('Profile image failed to load, trying fallback');
                    profileImageError = true;
                    profileLoaded = false;
                  }}
                />
              {:else}
                <img
                  bind:this={fallbackProfileImageElement}
                  src={fallbackProfileImageConst}
                  alt="Profile"
                  class="profile-photo"
                  class:loaded={profileLoaded}
                  on:load={() => { profileLoaded = true; }}
                  on:error={() => {
                    console.error('Both profile image paths failed');
                  }}
                />
              {/if}
            </div>
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

    .background-image-container {
        position: sticky;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2;
        margin: 0;
        display: block;
        background-color: #222; /* Dark placeholder for bg */
    }

    .full-size-image {
        position: absolute; /* Position within container */
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }

    .full-size-image.loaded {
        opacity: 1;
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
        position: relative; /* Needed for absolute positioning of img */
        overflow: hidden;
        margin-bottom: 2rem;
        /* Ensure grid items don't jump columns during load */
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .image-button {
        display: block; /* Ensure button takes up block space */
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

    .image-container {
        display: block; /* Ensure div takes up block space */
        width: 100%;
        position: relative; /* Context for absolute positioned image */
        background-color: #f0f0f0; /* Placeholder color */
        background-image: url('/images/constants/placeholder.svg');
        background-size: cover;
        background-position: center;
    }

    .grid-photo {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }

    .grid-photo.loaded {
        opacity: 1;
    }

    .error-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%; /* Fill the container */
        background-color: rgba(0, 0, 0, 0.1);
        color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
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

    .profile-photo-wrapper {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        overflow: hidden; /* Clip the absolute image */
        position: relative; /* Context for absolute image */
        flex-shrink: 0; /* Prevent shrinking */
        background-color: #f0f0f0; /* Placeholder */
        background-image: url('/images/constants/placeholder.svg');
        background-size: cover;
        background-position: center;
    }

    .profile-photo {
        display: block; /* Remove potential extra space */
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%; /* Keep the circular shape */
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }

     .profile-photo.loaded {
        opacity: 1;
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

        .about-content {
          flex-direction: column; /* Stack vertically on smaller screens */
          text-align: center;
          gap: 1rem; /* Adjust gap */
        }

        .profile-photo-wrapper { /* Adjust size for smaller screens */
            width: 120px;
            height: 120px;
        }

        .about-text {
            font-size: 0.9rem; /* Slightly larger for readability */
        }
        .about-text h2{
          font-size: 1.5rem; /* Adjust heading size */
          margin-bottom: 0.5rem;
        }

        .modal-photo {
          max-width: 100%;
          max-height: 95vh;
        }
    }
</style>