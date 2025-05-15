<!-- Works Page -->
<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import type { Work } from '$lib/types/works.js';
  import { Modal } from '$lib/components/ui/index.js';
  import { theme } from '../../theme/theme.js';
  import Carousel from '../../lib/components/Carousel.svelte';
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  // Import Swiper JS
  import Swiper from 'swiper';
  import { Navigation, Pagination } from 'swiper/modules';
  import 'swiper/css';
  import 'swiper/css/navigation'; // If using Swiper's navigation buttons
  import 'swiper/css/pagination'; // If using Swiper's pagination

  export let data: { works: Work[] };
  
  let selectedWork: Work | null = null;
  let selectedImageIndex = 0;
  let enlargedImage: { src: string; alt: string } | null = null;
  let showNsfwWarning = false;
  let nsfwWorkToShow: Work | null = null;
  // Updated sortedImages declaration
  $: sortedImages = selectedWork ? [...selectedWork.images].sort((a, b) => {
    const aNum = parseInt(a.alt.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.alt.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  }) : [];
  let carouselIndex = 0;
  
  // Swiper instances
  let imageSwiper: Swiper | null = null;
  let imageSwiperContainer: HTMLElement;
  
  // Sort works by published date (newest first)
  $: sortedWorks = [...(data.works || [])].sort((a, b) => {
    // Helper function to check if a date is valid
    const isValidDate = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    };
    
    // Check if both works have valid published dates
    const aHasValidDate = isValidDate(a.published);
    const bHasValidDate = isValidDate(b.published);
    
    // If either date is invalid, sort accordingly
    if (!aHasValidDate && !bHasValidDate) return 0; // Both invalid, maintain order
    if (!aHasValidDate) return 1; // a is invalid, put at end
    if (!bHasValidDate) return -1; // b is invalid, put at end
    
    // Both dates are valid, sort normally
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });
  
  // References for scrolling
  let thumbnailContainerRef: HTMLDivElement;
  let thumbnailButtonRefs: HTMLButtonElement[] = [];
  let thumbnailScrollLeft = 0; // Store scroll position

  // Calculate a slightly darker tertiary color for the detail view background
  $: darkerTertiary = `color-mix(in srgb, ${theme.tertiary} 90%, black)`;

  // When selectedImageIndex changes, scroll the thumbnail into view (if not enlarged)
  $: if (browser && selectedWork && !enlargedImage && thumbnailContainerRef && thumbnailButtonRefs[selectedImageIndex]) {
    const targetThumbnail = thumbnailButtonRefs[selectedImageIndex];
    if (targetThumbnail) {
      targetThumbnail.scrollIntoView({
        behavior: 'auto', 
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  // Loading state tracking
  let mainImageLoading = true;
  let mainImageLoaded = false;
  let thumbnailLoading: boolean[] = [];
  let thumbnailLoaded: boolean[] = [];
  
  // References to image elements
  let mainImageElement: HTMLImageElement | null = null;
  let slideImageElements: (HTMLImageElement | null)[] = [];
  let thumbnailElements: (HTMLImageElement | null)[] = [];

  function handleWorkClick(work: Work) {
    if (work.nsfw) {
      showNsfwWarning = true;
      nsfwWorkToShow = work;
    } else {
      openWorkDetail(work);
    }
  }

  function openWorkDetail(work: Work) {
    // Find the index of the work to store before showing details
    const workIndex = sortedWorks.findIndex(w => w.id === work.id);
    if (workIndex >= 0) {
      carouselIndex = workIndex;
    }
    
    selectedWork = work;
    selectedImageIndex = 0;
    if (browser) {
        document.body.style.overflow = 'hidden';
    }
    
    // Reset loading states for the new work's images
    resetImageLoadingStates();
    
    // Reset thumbnail refs array
    thumbnailButtonRefs = [];
    
    // Initialize Swiper in the next tick after the DOM has updated
    setTimeout(() => {
      initImageSwiper();
    }, 0);
  }

  function resetImageLoadingStates() {
    if (!selectedWork) return;
    
    mainImageLoading = true;
    mainImageLoaded = false;
    thumbnailLoading = Array(sortedImages.length).fill(true);
    thumbnailLoaded = Array(sortedImages.length).fill(false);
    slideImageElements = Array(sortedImages.length).fill(null);
    thumbnailElements = Array(sortedImages.length).fill(null);
    thumbnailButtonRefs = Array(sortedImages.length).fill(null);
    
    // Preload all images if in browser environment
    if (browser) {
      // Preload main image
      if (sortedImages.length > 0 && sortedImages[selectedImageIndex]) {
        const mainImg = new Image();
        mainImg.onload = () => handleMainImageLoad();
        mainImg.src = sortedImages[selectedImageIndex].src;
      }
      
      // Preload thumbnails
      sortedImages.forEach((image, i) => {
        if (image && image.src) {
          const thumbImg = new Image();
          thumbImg.onload = () => handleThumbnailLoad(i);
          thumbImg.src = image.src;
        }
      });
    }
  }

  function closeWorkDetail() {
    // Destroy swiper instance
    if (imageSwiper) {
      imageSwiper.destroy();
      imageSwiper = null;
    }
    
    // Make sure carouselIndex is set to the current work's index before closing
    const currentWork = selectedWork;
    if (currentWork) {
      const workIndex = sortedWorks.findIndex(w => w.id === currentWork.id);
      if (workIndex !== -1) {
        carouselIndex = workIndex;
      }
    }
    
    selectedWork = null;
    enlargedImage = null; // Also ensure enlargedImage is reset here
    if (browser) {
      document.body.style.overflow = '';
    }
  }

  function nextImage() {
    if (!selectedWork || !imageSwiper || sortedImages.length === 0) return;
    
    imageSwiper.slideNext(400); // Standard speed
  }

  function prevImage() {
    if (!selectedWork || !imageSwiper || sortedImages.length === 0) return;

    imageSwiper.slidePrev(400); // Standard speed
  }

  function enlargeImage(image: { src: string; alt: string }) {
    if (thumbnailContainerRef) {
      thumbnailScrollLeft = thumbnailContainerRef.scrollLeft; // Save scroll position
    }
    enlargedImage = image;
    mainImageLoading = true;
    mainImageLoaded = false;
  }

  async function closeEnlargedImage() {
    enlargedImage = null;
    mainImageLoading = true; // Reset loading state for the main image in the gallery view
    mainImageLoaded = false;

    await tick(); // Wait for the DOM to update (modal is removed, gallery view is visible)

    if (thumbnailContainerRef) {
      // Restore the scroll position of the thumbnail list.
      // This should be an instantaneous operation.
      thumbnailContainerRef.scrollLeft = thumbnailScrollLeft;
    }
    
    // Re-initialize Swiper for the main image view.
    // This ensures the main image is on the correct slide.
    // The `on:init` handler in `initImageSwiper` uses speed 0 for positioning, so it should be instant.
    initImageSwiper(); 
    
    // By removing the subsequent `scrollIntoView` call for the active thumbnail,
    // we rely on the `thumbnailContainerRef.scrollLeft` assignment to restore
    // the thumbnail list's state precisely as it was, without any further animated scrolling.
    // This aims to prevent the "reset and then scroll" animation on the thumbnail list.
  }

  function handleNsfwConfirm() {
    showNsfwWarning = false;
    if (nsfwWorkToShow) {
      openWorkDetail(nsfwWorkToShow);
      nsfwWorkToShow = null;
    }
  }

  function handleNsfwCancel() {
    showNsfwWarning = false;
    nsfwWorkToShow = null;
  }

  // Image loading handlers
  function handleMainImageLoad() {
    mainImageLoaded = true;
    mainImageLoading = false;
  }
  
  function handleThumbnailLoad(index: number) {
    thumbnailLoaded[index] = true;
    thumbnailLoading[index] = false;
    // Force reactivity
    thumbnailLoaded = [...thumbnailLoaded];
    thumbnailLoading = [...thumbnailLoading];
  }
  
  // Handle slide image load
  function handleSlideImageLoad(index: number) {
    if (index === selectedImageIndex) {
      handleMainImageLoad();
    }
  }

  // Add keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (!selectedWork) return;

    // Stop keyboard navigation if it's being handled by form elements
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling
      prevImage();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling
      nextImage();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling
      if (enlargedImage) {
        closeEnlargedImage();
      } else {
        closeWorkDetail();
      }
    }
  }
  
  // Initialize image swiper for touch navigation
  function initImageSwiper() {
    if (!imageSwiperContainer || !selectedWork || sortedImages.length === 0) {
      if (imageSwiper) {
          imageSwiper.destroy();
          imageSwiper = null;
      }
      return;
    }

    if (imageSwiper) {
      imageSwiper.destroy();
      imageSwiper = null;
    }

    imageSwiper = new Swiper(imageSwiperContainer, {
      modules: [Navigation, Pagination],
      initialSlide: selectedImageIndex,
      slidesPerView: 1,
      spaceBetween: 0,
      grabCursor: true,
      threshold: 10,
      resistance: false,
      loop: true, // ENABLE LOOP PERMANENTLY
      speed: 400, // Default transition speed for normal swiping/arrows
      touchStartPreventDefault: false,
      touchMoveStopPropagation: false,
      touchStartForcePreventDefault: false,
      cssMode: false,
      keyboard: {
        enabled: false,
      },
      navigation: { // Optional: if you want Swiper's built-in nav buttons
        nextEl: '.swiper-button-next-custom', // Custom class for next button
        prevEl: '.swiper-button-prev-custom', // Custom class for prev button
      },
      on: {
        slideChange: (swiper) => {
          // Set the new index using swiper's realIndex from the new active slide
          const newIndex = swiper.realIndex;
          
          // If a real change is detected
          if (selectedImageIndex !== newIndex) {
             selectedImageIndex = newIndex; 
          }
          
          mainImageLoading = true;
          mainImageLoaded = false;
        },
        init: (swiper) => {
          if (swiper.params.loop) {
            selectedImageIndex = swiper.realIndex;
          }
          // Use slideToLoop when loop is true, ensure speed 0 for no animation on init correction
          if (swiper.activeIndex !== selectedImageIndex) { // activeIndex can be used here if loop slides not yet fully calc'd
            swiper.slideToLoop(selectedImageIndex, 0, false); 
          }
          mainImageLoading = true;
          mainImageLoaded = false;
        }
      }
    });
  }

  // Check for images that are already loaded on mount/update
  afterUpdate(() => {
    if (!selectedWork) return;
    
    // Check slide images for current index
    const currentSlideImage = slideImageElements[selectedImageIndex];
    if (selectedImageIndex >= 0 && 
        currentSlideImage && 
        currentSlideImage.complete && 
        currentSlideImage.naturalWidth > 0 && 
        !mainImageLoaded) {
      handleMainImageLoad();
    }
    
    // Check thumbnails
    thumbnailElements.forEach((img, i) => {
      if (img?.complete && img?.naturalWidth > 0 && !thumbnailLoaded[i]) {
        handleThumbnailLoad(i);
      }
    });
  });

  onMount(() => {
    // Ensure page scrolls to top on initial load
    window.scrollTo(0, 0);
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      // Clean up swiper instances
      if (imageSwiper) {
        imageSwiper.destroy();
      }
    };
  });
</script>

<div class="works-container" style="--bg-color: {theme.tertiary}; --text-color: {theme.text.primary};">
  {#if !selectedWork}
    <Navbar 
      backgroundColor={theme.text.primary}
      textColor={theme.background.light}
    />
  {/if}

  <main class="works-main-content">
    <div class="content-wrapper">
      {#if !selectedWork}
        <h1 class="text-4xl md:text-5xl font-bold mb-12 text-center" style="color: {theme.text.primary};">Works</h1>
      {/if}
      
      <!-- No works message -->
      {#if !selectedWork && (!data.works || data.works.length === 0)}
        <div class="flex flex-col items-center justify-center py-16">
          <p class="text-xl text-center" style="color: {theme.secondary};">
            There are currently no works added. Please come back later!
          </p>
        </div>
      {/if}
      
      <!-- Main Carousel -->
      {#if !selectedWork && data.works && data.works.length > 0}
        <Carousel 
          works={sortedWorks} 
          onWorkClick={handleWorkClick}
          currentIndex={carouselIndex}
          on:indexChange={(e) => carouselIndex = e.detail}
        />
      {/if}
    </div>
  </main>

  {#if !selectedWork}
    <Footer />
  {/if}
  
  <!-- Work Detail View -->
  {#if selectedWork}
    <div class="fixed inset-0 z-[100] flex flex-col" style="background-color: {darkerTertiary};">
      <!-- Header with title and close button -->
      <div class="p-4 flex items-center justify-between" style="background-color: {theme.secondary};">
        <div class="overflow-hidden">
          <h2 class="text-2xl font-bold text-white truncate">{selectedWork.title}</h2>
          <div class="flex items-center text-white/80 text-sm mt-1 space-x-2">
            <time datetime={selectedWork.published} class="flex-shrink-0">
              {new Date(selectedWork.published).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            {#if selectedWork.tags.length > 0}
              <span class="flex-shrink-0">•</span>
              <div class="flex gap-2 overflow-x-auto pb-1 snap-x scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent max-w-[calc(100vw-12rem)]">
                {#each selectedWork.tags as tag}
                  <span class="bg-white/10 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 snap-start">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <button 
          class="p-2 rounded-full hover:bg-white/10 transition-colors text-white flex-shrink-0"
          on:click={closeWorkDetail}
          aria-label="Close detail view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Description -->
      <div class="px-4 py-2 text-sm sm:text-base"
      style="color: {theme.secondary};"
      >
        {selectedWork.description}
      </div>
      
      <!-- Main content area -->
      <div class="flex-1 overflow-auto p-4">
        {#if !enlargedImage}
          <!-- Gallery view with swiper -->
          <div class="relative flex items-center justify-center h-[60vh]">
            <div bind:this={imageSwiperContainer} class="swiper w-full h-full">
              <div class="swiper-wrapper">
                {#each sortedImages as image, i}
                  <div class="swiper-slide">
                    <div 
                      class="w-full h-full flex items-center justify-center cursor-pointer relative"
                      on:click={() => enlargeImage(image)}
                      on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          enlargeImage(image);
                        }
                      }}
                      role="button"
                      tabindex="0"
                      aria-label={`View enlarged image of ${image.alt}`}
                    >
                      <!-- Loading skeleton -->
                      {#if (i === selectedImageIndex && mainImageLoading && !mainImageLoaded)}
                        <div class="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
                          <div class="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
                        </div>
                      {/if}
                      
                      <!-- Slide image -->
                      <img 
                        bind:this={slideImageElements[i]}
                        src={image.src} 
                        alt={image.alt} 
                        class="max-h-full max-w-full object-contain transition-opacity duration-300"
                        class:opacity-0={i === selectedImageIndex && !mainImageLoaded}
                        class:opacity-100={i !== selectedImageIndex || mainImageLoaded}
                        on:load={() => handleSlideImageLoad(i)}
                        on:error={() => {
                          if (i === selectedImageIndex) mainImageLoading = false;
                        }}
                      />
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Navigation buttons - only shown when multiple images -->
            {#if sortedImages.length > 1}
              <button 
                class="swiper-button-prev-custom absolute left-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Previous image"
                on:click|preventDefault|stopPropagation={prevImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
              </button>
              
              <button 
                class="swiper-button-next-custom absolute right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Next image"
                on:click|preventDefault|stopPropagation={nextImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Thumbnails -->
          <div class="mt-2 md:mt-4 fixed bottom-4 left-0 right-0 flex justify-center">
            <div class="inline-block rounded-lg bg-black/20 backdrop-blur-sm py-4 px-4 max-w-[90vw] w-auto mx-auto">
              <div 
                bind:this={thumbnailContainerRef}
                class="flex gap-2 overflow-x-auto scroll-smooth scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent max-w-full snap-x snap-mandatory" 
                style="scrollbar-width: thin;">
                {#each sortedImages as image, i}
                  <button 
                    bind:this={thumbnailButtonRefs[i]}
                    class="flex-shrink-0 h-16 sm:h-20 w-16 sm:w-20 rounded-lg overflow-hidden transition-all duration-200 border-2 hover:brightness-110 relative snap-center"
                    class:border-white={i === selectedImageIndex}
                    class:border-transparent={i !== selectedImageIndex}
                    on:click={() => {
                      if (imageSwiper) {
                        imageSwiper.slideToLoop(i, 0);
                      } else {
                        selectedImageIndex = i; 
                      }
                    }}
                  >
                    <!-- Thumbnail loading skeleton -->
                    {#if thumbnailLoading[i] && !thumbnailLoaded[i]}
                      <div class="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-3 border-white/20 border-t-white"></div>
                      </div>
                    {/if}
                    
                    <!-- Thumbnail image -->
                    <img 
                      bind:this={thumbnailElements[i]}
                      src={image.src} 
                      alt={`Thumbnail ${i+1}`} 
                      class="h-full w-full object-cover transition-opacity duration-300"
                      class:opacity-0={!thumbnailLoaded[i]}
                      class:opacity-100={thumbnailLoaded[i]}
                      on:load={() => handleThumbnailLoad(i)}
                      on:error={() => {
                        thumbnailLoading[i] = false;
                        thumbnailLoading = [...thumbnailLoading];
                      }}
                    />
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <!-- Enlarged image view -->
          <div 
            class="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            on:click={closeEnlargedImage}
            on:keydown={(e) => {
              if (e.key === 'Escape') {
                closeEnlargedImage();
              }
            }}
            role="dialog"
            tabindex="-1"
            aria-modal="true"
            aria-label="Enlarged image view"
          >
            <!-- Loading skeleton -->
            {#if mainImageLoading && !mainImageLoaded}
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
              </div>
            {/if}
            
            <!-- Enlarged image -->
            <img 
              bind:this={mainImageElement}
              src={enlargedImage.src} 
              alt={enlargedImage.alt} 
              class="max-h-[90vh] max-w-[90vw] object-contain transition-opacity duration-300"
              class:opacity-0={!mainImageLoaded}
              class:opacity-100={mainImageLoaded}
              on:load={handleMainImageLoad}
              on:error={() => {
                mainImageLoading = false;
              }}
            />
            
            <button 
              class="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close enlarged view"
              on:click|stopPropagation={closeEnlargedImage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- NSFW Warning Modal -->
<Modal
  bind:open={showNsfwWarning}
  onClose={handleNsfwCancel}
>
  <div class="p-4 sm:p-6 rounded-lg w-[90vw] sm:w-auto max-w-md mx-auto" style="background-color: {theme.secondary};">
    <h3 class="text-lg font-semibold mb-3 sm:mb-4 text-white">NSFW Content Warning</h3>
    <p class="mb-3 text-white/90">This work contains NSFW (Not Safe For Work) content. Are you sure you want to proceed?</p>
    
    {#if nsfwWorkToShow?.nsfw_tags && nsfwWorkToShow.nsfw_tags.length > 0}
      <div class="mb-4 sm:mb-6">
        <p class="text-white/90 mb-1.5">Content may contain:</p>
        <div class="flex flex-wrap gap-2">
          {#each nsfwWorkToShow.nsfw_tags as tag}
            <span class="bg-white/10 px-2 py-0.5 rounded text-white/80 text-sm">{tag}</span>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="flex justify-end gap-3 sm:gap-4">
      <button
        class="px-3 sm:px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white transition-colors text-sm sm:text-base"
        on:click={handleNsfwCancel}
      >
        Cancel
      </button>
      <button
        class="px-3 sm:px-4 py-2 rounded transition-colors hover:brightness-110 text-sm sm:text-base"
        style="background-color: {theme.tertiary}; color: {theme.secondary};"
        on:click={handleNsfwConfirm}
      >
        Proceed
      </button>
    </div>
  </div>
</Modal>

<style>
  /* Import Swiper CSS */
  :global(.swiper) {
    width: 100%;
    height: 100%;
  }

  :global(.swiper-slide) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .works-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    overflow-x: hidden; /* Prevent horizontal scroll */
  }

  .works-main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 4rem 0;
  }

  .content-wrapper {
    width: 100%;
    max-width: 80rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  @media (max-width: 768px) {
    .works-container {
      padding-top: 0; /* Remove top padding as navbar handles it */
    }

    .works-main-content {
      padding: 6rem 0 2rem; /* Increased top padding for mobile to account for navbar */
    }

    .content-wrapper {
      padding: 0 1rem;
    }
  }

  /* Tablet-specific adjustments */
  @media (min-width: 769px) and (max-width: 1023px) {
    .works-main-content {
      padding-bottom: 2rem; /* Reduce space below carousel for tablets */
    }
  }

  @media (min-width: 640px) {
    .content-wrapper {
      padding: 0 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .content-wrapper {
      padding: 0 2rem;
    }
  }

  /* Default styling for swiper navigation buttons if you aren't using Flowbite's or custom ones */
  :global(.swiper-button-next),
  :global(.swiper-button-prev) {
    color: white; /* Example color */
    background-color: rgba(0,0,0,0.3);
    padding: 8px;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.swiper-button-next::after),
  :global(.swiper-button-prev::after) {
    font-size: 16px; /* Adjust size of arrow icon */
  }
</style> 