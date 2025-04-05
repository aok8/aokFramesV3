<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme } from '../theme/theme.js';
  import { Button } from "$lib/components/ui/button";
  import { Footer } from "$lib/components/ui";
  import { Navbar } from "$lib/components/ui";
  import Modal from "$lib/components/ui/modal.svelte";

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false;
  let contentElement: HTMLElement;
  let observer: IntersectionObserver;
  let selectedPhoto: string | null = null;
  let photoModalOpen = false;
  
  // Portfolio images from R2
  const portfolioImages = [
    // Add your portfolio images here
    '/images/portfolio/Ektar100_Mamiya6_09_15_24_11.jpg',
    '/images/portfolio/Portra800_R4m_01_03_25_11.jpg',
    '/images/portfolio/Acrosii_Bessa_09_12_23_1.jpg',
    '/images/portfolio/Trix400_BessaR_08_12_24_29.jpg',
    '/images/portfolio/Trix400_Mamiya6_06_22_24_1.jpg',
    '/images/portfolio/Trix400_2_BessaR_08_12_24_6.jpg',
    '/images/portfolio/Trix400_2_Mamiya6_08_08_24_12.jpg',
    '/images/portfolio/Trix400_Mamiya6_03_24_24_11.jpg',
    '/images/portfolio/Trix400_BessaR_08_12_24_24.jpg',
    '/images/portfolio/Acros100_Mamiya6_08_10_24_12.jpg',
    '/images/portfolio/Portra800_F100_09_14_24_6.jpg',
    '/images/portfolio/Trix400_Mamiya6_08_08_24_5.jpg',
    '/images/portfolio/Trix400_BessaR_08_12_24_25.jpg',
    '/images/portfolio/Trix400_F100_08_17_24_11.jpg',
    '/images/portfolio/Trix400_BessaR_08_12_24_20.jpg',
    '/images/portfolio/Acros100_Mamiya6_08_09_24_8.jpg',
    '/images/portfolio/Gold200_Mamiya6_07_13_24_9.jpg',
    '/images/portfolio/Portra800_BessaR_07_13_24_14.jpg',
    '/images/portfolio/Lomo800_Mamiya6_06_09_24_8.jpg',
    '/images/portfolio/Ektar100_Mamiya6_09_12_23_6.jpg',
    '/images/portfolio/Lomo800_Mamiya6_06_09_24_1.jpg',
    '/images/portfolio/Cinestill800t_MamiyaSix_07_16_23_12.jpg',
    '/images/portfolio/Ektar100_Mamiya6_09_12_23_1.jpg',
    '/images/portfolio/Portra400_Mamiya6_09_12_23_10.jpg',
    '/images/portfolio/Provia_Mamiya6_09_12_23_15.jpg',
    '/images/portfolio/Provia_Mamiya6_09_12_23_1.jpg'
  ];

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
    <Navbar />
    <img src="/constants/bg.jpg" alt="Night sky with stars" class="full-size-image" />
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
        />
      {/if}
    </Modal>
</div>

<div class="after-cover"
    style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};"
>
    <div class="photo-grid">
        {#each portfolioImages as imageUrl, i}
            <div class="grid-item">
                <button 
                  class="image-button"
                  on:click={() => {
                    selectedPhoto = imageUrl;
                    photoModalOpen = true;
                  }}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectedPhoto = imageUrl;
                      photoModalOpen = true;
                    }
                  }}
                >
                  <img 
                    src={imageUrl} 
                    alt="Portfolio work" 
                    class="grid-photo" 
                    loading="lazy"
                  />
                </button>
            </div>
        {/each}
    </div>

    <div class="about-section">
        <div class="about-content">
            <img src="/constants/Profile_Pic.jpg" alt="Profile" class="profile-photo" />
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
</style>