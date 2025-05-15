<!-- Works Carousel -->
<script lang="ts">
  import { onMount, tick, afterUpdate, createEventDispatcher, onDestroy } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import type { Work } from '$lib/types/works.js';
  
  export let works: Work[] = [];
  export let onWorkClick: (work: Work) => void;
  export let currentIndex = 0; // Accept external index
  
  // Setup event dispatcher
  const dispatch = createEventDispatcher<{
    indexChange: number;
  }>();
  
  // State variables
  $: carouselItems = updateCarouselItemsCalc(currentIndex);
  let isRotating = false;
  let openingAnimation = false;
  let openingWorkId: string | null = null;
  let openingScale = tweened(1, {
    duration: 300,
    easing: cubicOut
  });
  
  // Track if a rotation was just completed (to prevent immediate opening)
  let justRotated = false;
  let rotationCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  let loadingStates: { [key: string]: boolean } = {}; // Tracks if loading has started
  let loadedStates: { [key: string]: boolean } = {};  // Tracks if loading has finished

  // Store references to image elements
  let imageElements: (HTMLImageElement | null)[] = [];
  
  // Force update flag - will trigger a refresh
  let forceUpdateCounter = 0;

  // Queue for pending navigation actions
  let pendingNavigation: ('next' | 'prev' | null) = null;

  // Touch handling variables
  let touchStartX = 0;
  let touchEndX = 0;
  let touchThreshold = 100; // Increased from 50 to 100 for less sensitivity
  let carouselContainer: HTMLElement;
  let isTouching = false;
  let touchStartTime = 0;
  let touchEndTime = 0;
  let touchTimeThreshold = 300; // Maximum time for a quick tap vs. swipe (ms)
  let touchMoveCount = 0; // Count touchmove events to better distinguish intentional swipes
  
  // Touch event handlers
  function handleTouchStart(e: TouchEvent) {
    if (isRotating || openingAnimation) { 
        isTouching = false; // Prevent touch interaction if carousel is busy
        return;
    }
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isTouching = true;
    touchMoveCount = 0;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isTouching) return;
    touchEndX = e.touches[0].clientX;
    touchMoveCount++;
  }
  
  function handleTouchEnd() {
    if (!isTouching) return;
    
    const swipeDistance = touchEndX - touchStartX;
    const swipeDuration = Date.now() - touchStartTime;
    
    isTouching = false;

    if (
      Math.abs(swipeDistance) < touchThreshold ||
      swipeDuration < 50 || 
      touchMoveCount < touchThreshold
    ) {
      touchStartX = 0;
      touchEndX = 0;
      touchMoveCount = 0;
      return;
    }
    
    if (swipeDistance < 0) {
      nextWork();
    } else {
      prevWork();
    }
    
    touchStartX = 0;
    touchEndX = 0;
    touchMoveCount = 0;
  }
  
  function handleTouchCancel() {
    isTouching = false;
    touchStartX = 0;
    touchEndX = 0;
    touchMoveCount = 0;
  }

  async function handleImageLoad(workId: string) {
    if (!loadedStates[workId]) { // Prevent multiple calls
      console.log(`Image loaded for work: ${workId}`);
      loadedStates = { ...loadedStates, [workId]: true };
      await tick(); 
    }
  }

  function handleImageStartLoad(workId: string) {
    loadingStates = { ...loadingStates, [workId]: true };
    loadedStates = { ...loadedStates, [workId]: false };
  }

  function initializeAllLoadingStates() {
    const newLoadingStates: { [key: string]: boolean } = {};
    const newLoadedStates: { [key: string]: boolean } = {};
    // Initialize imageElements array with the same length as works
    imageElements = new Array(works.length).fill(null);
    works.forEach((work, index) => {
      newLoadingStates[work.id] = true; 
      newLoadedStates[work.id] = false; 
    });
    loadingStates = newLoadingStates;
    loadedStates = newLoadedStates;
  }
  
  // Preload images manually
  function preloadImages() {
    if (!browser) return;
    
    works.forEach((work) => {
      if (!loadedStates[work.id] && !loadingStates[work.id]) { // Check if not already loaded or loading
        const img = new Image();
        img.onload = () => {
          console.log(`Preloaded image for work: ${work.id}`);
          handleImageLoad(work.id);
        };
        img.onerror = () => { 
          console.error(`Failed to preload image for work: ${work.id}, src: ${work.coverImage}`);
          // Consider marking as loaded/errored to prevent spinner from staying indefinitely
          handleImageLoad(work.id); // Or a specific error state
        };
        img.src = work.coverImage;
        handleImageStartLoad(work.id); // Mark as loading
      }
    });
  }

  afterUpdate(() => {
    if (works.length === 0) return;
    works.forEach((work, index) => {
      const imgElement = imageElements[index];
      if (imgElement && imgElement.complete && !loadedStates[work.id]) {
        console.log(`Image ${work.id} found complete in afterUpdate`);
        handleImageLoad(work.id);
      }
    });
  });

  // Calculate positions for carousel items
  function updateCarouselItemsCalc(index: number) {
    return works.map((work, workIndex) => {
      const relativeIndex = (workIndex - index + works.length) % works.length;
      let zIndex = 5 - Math.min(Math.abs(relativeIndex), 2);
      
      // Calculate position and rotation
      let xPos = 0;
      let yPos = 0;
      let scale = 1;
      let opacity = 1;
      let rotateY = 0;
      
      // Special positioning for exactly 2 cards to make them symmetrical
      if (works.length === 2) {
        if (relativeIndex === 0) {
          // Move first card slightly left
          xPos = -150;
          yPos = 0;
          scale = 0.9;
          rotateY = 5;
        } else if (relativeIndex === 1 || relativeIndex === -1) {
          // Move second card slightly right
          xPos = 150;
          yPos = 0;
          scale = 0.9;
          rotateY = -5;
        }
      } else {
        // Standard positioning for 3+ cards
        if (relativeIndex === 0) {
          // Center item
          xPos = 0;
          yPos = 0;
          scale = 1;
        } else if (relativeIndex === 1 || relativeIndex === -works.length + 1) {
          // Right item
          xPos = 250;
          yPos = 50;
          scale = 0.8;
          rotateY = -15;
          opacity = 0.7;
        } else if (relativeIndex === -1 || relativeIndex === works.length - 1) {
          // Left item
          xPos = -250;
          yPos = 50;
          scale = 0.8;
          rotateY = 15;
          opacity = 0.7;
        } else if (relativeIndex === 2 || relativeIndex === -works.length + 2) {
          // Far right item
          xPos = 450;
          yPos = 100;
          scale = 0.6;
          rotateY = -30;
          opacity = 0.4;
        } else if (relativeIndex === -2 || relativeIndex === works.length - 2) {
          // Far left item
          xPos = -450;
          yPos = 100;
          scale = 0.6;
          rotateY = 30;
          opacity = 0.4;
        } else if (relativeIndex === 3 || relativeIndex === -works.length + 3) {
          // Entering from far right
          xPos = 650;
          yPos = 150;
          scale = 0.4;
          rotateY = -45;
          opacity = 0;
        } else if (relativeIndex === -3 || relativeIndex === works.length - 3) {
          // Leaving to far left
          xPos = -650;
          yPos = 150;
          scale = 0.4;
          rotateY = 45;
          opacity = 0;
        } else {
          // Hide other items but keep them in the flow
          xPos = relativeIndex > 0 ? 800 : -800;
          yPos = 200;
          scale = 0.2;
          opacity = 0;
          rotateY = relativeIndex > 0 ? -60 : 60;
        }
      }
      
      // Apply special styling for the opening animation
      if (openingAnimation && work.id === openingWorkId) {
        scale = $openingScale;
        opacity = 1;
        zIndex = 10;
      }
      
      return {
        work,
        style: `
          transform: translate3d(${xPos}px, ${yPos}px, 0) scale(${scale}) rotateY(${rotateY}deg);
          z-index: ${zIndex};
          opacity: ${opacity};
        `,
        zIndex,
        active: relativeIndex === 0 || (works.length === 2 && (relativeIndex === 0 || relativeIndex === 1 || relativeIndex === -1)),
        relativeIndex,
        visible: works.length === 2 || Math.abs(relativeIndex) <= 3 || Math.abs(relativeIndex) >= works.length - 3
      };
    });
  }

  // Process any pending navigation actions when animation completes
  function processPendingNavigation() {
    const action = pendingNavigation;
    pendingNavigation = null; 

    if (action === 'next') {
      nextWork();
    } else if (action === 'prev') {
      prevWork();
    }
  }

  // Navigation functions
  function nextWork(event?: MouseEvent | TouchEvent | KeyboardEvent) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) { 
      if (!pendingNavigation) { 
        pendingNavigation = 'next';
      }
      return; 
    }
    
    isRotating = true; 
    justRotated = true;
    currentIndex = (currentIndex + 1) % works.length;
    dispatch('indexChange', currentIndex);
    
    if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    rotationCompleteTimer = setTimeout(() => {
      isRotating = false; 
      justRotated = false;
      // Process any queued actions once rotation completes
      processPendingNavigation();
    }, 500); 
  }

  function prevWork(event?: MouseEvent | TouchEvent | KeyboardEvent) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) {
      if (!pendingNavigation) {
        pendingNavigation = 'prev';
      }
      return;
    }
    
    isRotating = true;
    justRotated = true;
    currentIndex = (currentIndex - 1 + works.length) % works.length;
    dispatch('indexChange', currentIndex);
    
    if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    rotationCompleteTimer = setTimeout(() => {
      isRotating = false;
      justRotated = false;
      // Process any queued actions once rotation completes
      processPendingNavigation();
    }, 500);
  }
  
  async function rotateToWork(workId: string) {
    const targetIndex = works.findIndex(w => w.id === workId);
    if (targetIndex === -1 || targetIndex === currentIndex) { 
      return false;
    }
    
    isRotating = true; 
    justRotated = true;
    currentIndex = targetIndex;
    dispatch('indexChange', currentIndex);
    
    if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    rotationCompleteTimer = setTimeout(() => {
      isRotating = false;
      justRotated = false;
      // Process any queued actions once rotation completes
      processPendingNavigation();
    }, 500); 
    return true; 
  }

  // Handle work selection
  async function handleWorkClick(item: typeof carouselItems[0]) {
    if (openingAnimation) return; 

    if (isRotating) return; 

    if (item.active) {
      openWorkWithAnimation(item.work);
    } else if (item.visible) {
      if (!justRotated) { 
        await rotateToWork(item.work.id);
      }
    }
  }
  
  // Opening animation
  async function openWorkWithAnimation(work: Work) {
    openingAnimation = true;
    openingWorkId = work.id;
    openingScale.set(1.5);
    
    // Save the current index to restore it later
    const savedIndex = currentIndex;
    
    // Wait for animation to complete
    await tick();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Reset animation state and open the work
    openingAnimation = false;
    openingWorkId = null;
    openingScale.set(1);
    onWorkClick(work);
  }

  // Initialize carousel
  onMount(() => {
    dispatch('indexChange', currentIndex);
    updateCarouselItemsCalc(currentIndex);
    initializeAllLoadingStates();
    
    // Only run client-side code in browser
    if (browser) {
      // Preload images
      preloadImages();
      
      // Force initial focus to enable keyboard navigation
      setTimeout(() => {
        if (carouselContainer) {
          carouselContainer.focus();
        }
      }, 100);
      
      // Force a reactivity trigger after a small delay
      setTimeout(() => {
        console.log('Forcing reactivity update');
        forceUpdateCounter += 1;
      }, 500);
      
      // Set up a polling mechanism to check image status every 250ms
      const checkImagesInterval = setInterval(() => {
        let allLoaded = true;
        works.forEach((work, index) => {
          if (!loadedStates[work.id]) {
            allLoaded = false;
            // Try to find the image element
            const imgElement = imageElements[index];
            if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
              console.log(`Poll detected loaded image for work: ${work.id}`);
              handleImageLoad(work.id);
            }
          }
        });
        
        if (allLoaded || forceUpdateCounter > 5) {
          console.log('All images loaded or max retries reached, clearing interval');
          clearInterval(checkImagesInterval);
        } else {
          forceUpdateCounter += 1;
        }
      }, 250);
      
      // Safety cleanup
      return () => {
        clearInterval(checkImagesInterval);
        if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
      };
    }
  });

  // Update carousel when works change or force update triggers
  $: if (works || forceUpdateCounter) {
    dispatch('indexChange', currentIndex);
    updateCarouselItemsCalc(currentIndex);
    if (works && works.length > 0 && Object.keys(loadingStates).length === 0) {
      initializeAllLoadingStates();
      preloadImages();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Only handle arrow keys for carousel navigation
    // Prevent Space and Enter from triggering navigation
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevWork(event);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextWork(event);
    }
    // Explicitly DON'T handle space or enter here to prevent them from moving the carousel
  }

  onDestroy(() => {
    if (browser) { // Ensure browser context for timers
        if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    }
  });
</script>

<div 
  bind:this={carouselContainer}
  class="carousel-container relative h-[500px] w-full flex items-center justify-center"
  on:touchstart|passive={handleTouchStart} 
  on:touchmove|passive={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchCancel}
  on:keydown={handleKeyDown}
  tabindex="0"
  role="region"
  aria-label="Works Carousel"
>
  {#each carouselItems as item (item.work.id)}
    {#if item.visible}
      <div 
        class="carousel-item absolute transition-all duration-500 ease-out"
        class:cursor-pointer={!openingAnimation} 
        class:highlight-on-hover={!item.active && item.visible && !isRotating && !justRotated && !openingAnimation}
        style={item.style}
        on:click={() => handleWorkClick(item)}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { 
            e.preventDefault(); 
            e.stopPropagation(); // Prevent container keydown from also firing
            handleWorkClick(item); 
          }
        }}
        role="group"
        aria-label={`View details for ${item.work.title}`}
        aria-roledescription="slide"
        tabindex="0"
      >
        <div class="relative overflow-hidden rounded-lg shadow-xl h-[400px] w-[300px] bg-gray-300 dark:bg-gray-700">
          {#if loadingStates[item.work.id] && !loadedStates[item.work.id]}
            <div 
              class="absolute inset-0 bg-gray-200 dark:bg-gray-600 animate-pulse z-10 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg class="w-10 h-10 text-gray-400 dark:text-gray-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          {/if}
          
          <img 
            bind:this={imageElements[works.findIndex(w => w.id === item.work.id)]} 
            src={item.work.coverImage} 
            alt={item.work.title}
            class="w-full h-full object-cover z-20 transition-opacity duration-300"
            class:blur-md={item.work.nsfw && loadedStates[item.work.id]}
            class:opacity-0={!loadedStates[item.work.id]}
            class:opacity-100={loadedStates[item.work.id]}
            class:pointer-events-none={openingAnimation}
            on:load={() => handleImageLoad(item.work.id)}
            on:error={() => { 
              console.error(`Failed to load cover image for ${item.work.title}: ${item.work.coverImage}`);
              handleImageLoad(item.work.id); // Mark as loaded to remove spinner even on error
            }}
            loading="lazy" 
          />

          <div 
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 z-30 transition-opacity duration-300 delay-100"
            class:opacity-0={!loadedStates[item.work.id] || openingAnimation}
            class:opacity-100={loadedStates[item.work.id] && !openingAnimation}
            class:pointer-events-none={openingAnimation}
          >
            <h2 class="text-xl font-bold text-white shadow-sm">{item.work.title}</h2>
            {#if item.work.nsfw}
              <div class="flex items-center mt-1 text-red-300 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1 flex-shrink-0">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
                <span>NSFW</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/each}
  
  {#if works.length > 1}
    <button 
      class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/50"
      on:click={prevWork}
      aria-label="Previous work"
      disabled={isRotating && pendingNavigation !== null && pendingNavigation !== 'prev'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"></path>
      </svg>
    </button>
    
    <button 
      class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/50"
      on:click={nextWork}
      aria-label="Next work"
      disabled={isRotating && pendingNavigation !== null && pendingNavigation !== 'next'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"></path>
      </svg>
    </button>
  {/if}
</div>

<style>
  /* Custom styles */
  .carousel-item {
    user-select: none;
    will-change: transform, opacity;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Smoother easing */
    width: 300px; 
    height: 400px; 
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Add some perspective to the container */
  .carousel-container {
    perspective: 1000px;
    overflow: visible;
    outline: none; 
    -webkit-tap-highlight-color: transparent; /* Prevent tap highlight on mobile */
  }
  
  /* Disable buttons during rotation */
  button[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* Highlight effect on hover for non-active items */
  .highlight-on-hover:hover {
    /* filter: brightness(1.1); Consider if this is too subtle or distracting */
    /* transform: scale(1.02); Minor scale on hover for non-active items */
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .carousel-item:focus-visible {
    outline: 2px solid var(--ring, white); /* Use CSS variable for ring color */
    outline-offset: 2px;
    /* box-shadow: 0 0 0 3px var(--ring-offset-color, transparent), 0 0 0 5px var(--ring-color, white); */
  }
</style> 