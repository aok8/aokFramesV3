<!-- Works Carousel -->
<script lang="ts">
  import { onMount, tick, afterUpdate, createEventDispatcher } from 'svelte';
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
    duration: 600,
    easing: cubicOut
  });
  
  // Track if a rotation was just completed (to prevent immediate opening)
  let justRotated = false;
  let rotationCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArrowClickTime = 0; // Track time of last arrow click to prevent double-clicks
  let arrowClickDebounceTime = 600; // Minimum time between arrow clicks in ms
  
  // Add loading state tracking for each card
  let loadingStates: { [key: string]: boolean } = {}; // Tracks if loading has started
  let loadedStates: { [key: string]: boolean } = {};  // Tracks if loading has finished

  // Store references to image elements
  let imageElements: (HTMLImageElement | null)[] = [];
  
  // Force update flag - will trigger a refresh
  let forceUpdateCounter = 0;

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
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isTouching = true;
    touchMoveCount = 0; // Reset move counter on new touch
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isTouching) return;
    touchEndX = e.touches[0].clientX;
    touchMoveCount++; // Increment move counter
  }
  
  function handleTouchEnd(e: TouchEvent) {
    if (!isTouching) return;
    isTouching = false;
    touchEndTime = Date.now();
    
    const swipeDistance = touchEndX - touchStartX;
    const swipeDuration = touchEndTime - touchStartTime;
    
    // More strict conditions for swipe detection - needs sufficient distance, 
    // reasonable duration, and enough touchmove events
    if (Math.abs(swipeDistance) < touchThreshold || 
        swipeDuration < 50 || // Too fast might be a glitch
        touchMoveCount < 3) { // Need at least a few move events for a real swipe
      // This was just a tap or not an intentional swipe
      return;
    }
    
    // Right to left swipe (next)
    if (swipeDistance < 0) {
      nextWork();
    }
    // Left to right swipe (previous)
    else {
      prevWork();
    }
    
    // Reset touch positions
    touchStartX = 0;
    touchEndX = 0;
    touchMoveCount = 0;
  }
  
  // Cancel the swipe if touch is cancelled
  function handleTouchCancel() {
    isTouching = false;
    touchStartX = 0;
    touchEndX = 0;
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
      const img = new Image();
      img.onload = () => {
        console.log(`Preloaded image for work: ${work.id}`);
        handleImageLoad(work.id);
      };
      img.src = work.coverImage;
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

  // Helper to prevent rapid arrow clicks
  function debounceArrowClick() {
    const now = Date.now();
    if (now - lastArrowClickTime < arrowClickDebounceTime) {
      return false;
    }
    lastArrowClickTime = now;
    return true;
  }

  // Navigation functions
  function nextWork(event?: MouseEvent) {
    // Stop propagation if event was provided
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) return;
    // Prevent rapid clicking
    if (!debounceArrowClick()) return;
    
    isRotating = true;
    justRotated = true;
    
    // Move one card at a time
    currentIndex = (currentIndex + 1) % works.length;
    dispatch('indexChange', currentIndex);
    
    // Clear any existing timer
    if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    
    // Set a timer to clear the justRotated flag after animation completes
    rotationCompleteTimer = setTimeout(() => {
      isRotating = false;
      justRotated = false;
    }, 500);
  }

  function prevWork(event?: MouseEvent) {
    // Stop propagation if event was provided
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) return;
    // Prevent rapid clicking
    if (!debounceArrowClick()) return;
    
    isRotating = true;
    justRotated = true;
    
    // Move one card at a time
    currentIndex = (currentIndex - 1 + works.length) % works.length;
    dispatch('indexChange', currentIndex);
    
    // Clear any existing timer
    if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    
    // Set a timer to clear the justRotated flag after animation completes
    rotationCompleteTimer = setTimeout(() => {
      isRotating = false;
      justRotated = false;
    }, 500);
  }
  
  // Function to rotate to a specific work
  async function rotateToWork(workId: string) {
    if (isRotating) return false;
    // Prevent rapid actions
    if (!debounceArrowClick()) return false;
    
    isRotating = true;
    justRotated = true;
    
    // Find the target index
    const targetIndex = works.findIndex(w => w.id === workId);
    if (targetIndex === -1) {
      isRotating = false;
      justRotated = false;
      return false;
    }
    
    // Calculate the shortest path to rotate
    let diff = (targetIndex - currentIndex + works.length) % works.length;
    
    // If diff is more than half the length, go the other way
    if (diff > works.length / 2) {
      diff = diff - works.length;
    }
    
    // Animate the rotation
    if (diff !== 0) {
      const direction = diff > 0 ? 1 : -1;
      const steps = Math.abs(diff);
      
      // Perform all rotations at once with animation
      const rotationDuration = 500; // ms
      
      // Set the final index directly
      currentIndex = targetIndex;
      dispatch('indexChange', currentIndex);
      
      // Clear any existing timer
      if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
      
      // Wait for the animation to complete
      rotationCompleteTimer = setTimeout(() => {
        isRotating = false;
        justRotated = false;
      }, rotationDuration);
    } else {
      isRotating = false;
      justRotated = false;
    }
    
    return true;
  }

  // Handle work selection
  async function handleWorkClick(item: typeof carouselItems[0]) {
    if (isRotating || openingAnimation) return;
    
    // If touch events were just processed, prevent additional actions
    if (justRotated) return;
    
    // Special handling for two-card layout - both cards are considered "active"
    if (works.length === 2) {
      // For 2-card layout, active items should always open directly
      if (item.active) {
        openWorkWithAnimation(item.work);
      } else {
        // First rotate, then user will need to click again to open
        await rotateToWork(item.work.id);
      }
      return;
    }
    
    // Normal handling for 3+ cards
    if (item.active) {
      // If center item, open it directly with animation
      openWorkWithAnimation(item.work);
    } else if (item.visible) {
      // If not center but visible, just rotate to center without opening
      await rotateToWork(item.work.id);
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
    await new Promise(resolve => setTimeout(resolve, 600));
    
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
</script>

<div 
  bind:this={carouselContainer}
  class="carousel-container relative h-[500px] w-full flex items-center justify-center"
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchCancel}
>
  {#each carouselItems as item (item.work.id)}
    {#if item.visible}
      <div 
        class="carousel-item absolute transition-all duration-500 ease-out"
        class:cursor-pointer={true}
        class:highlight-on-hover={!item.active && item.visible}
        style={item.style}
        on:click={() => handleWorkClick(item)}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleWorkClick(item);
          }
        }}
        role="button"
        tabindex="0"
      >
        <div class="relative overflow-hidden rounded-lg shadow-xl h-[400px] w-[300px]">
          {#if !loadedStates[item.work.id]}
            <!-- Loading skeleton -->
            <div 
              class="absolute inset-0 bg-gray-200 animate-pulse z-10"
              aria-hidden="true"
            ></div>
          {/if}
          
          <!-- Cover Image (always rendered, visibility controlled by opacity) -->
          <img 
            bind:this={imageElements[works.findIndex(w => w.id === item.work.id)]} 
            src={item.work.coverImage} 
            alt={item.work.title}
            class="w-full h-full object-cover z-20 transition-opacity duration-300"
            class:blur-md={item.work.nsfw}
            class:opacity-0={!loadedStates[item.work.id]}
            class:opacity-100={loadedStates[item.work.id]}
            class:pointer-events-none={!loadedStates[item.work.id]}
            on:load={() => handleImageLoad(item.work.id)}
          />

          <!-- Title overlay (always rendered, visibility controlled by opacity) -->
          <div 
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30 transition-opacity duration-300 delay-100"
            class:opacity-0={!loadedStates[item.work.id]}
            class:opacity-100={loadedStates[item.work.id]}
            class:pointer-events-none={!loadedStates[item.work.id]}
          >
            <h2 class="text-xl font-bold">{item.work.title}</h2>
            {#if item.work.nsfw}
              <!-- NSFW warning -->
              <div class="flex items-center mt-1 text-red-400 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
                <span>NSFW content</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/each}
  
  <!-- Navigation buttons - only shown when multiple works -->
  {#if works.length > 1}
    <button 
      class="absolute left-4 md:left-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
      on:click|preventDefault|stopPropagation={prevWork}
      aria-label="Previous work"
      disabled={isRotating}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"></path>
      </svg>
    </button>
    
    <button 
      class="absolute right-4 md:right-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
      on:click|preventDefault|stopPropagation={nextWork}
      aria-label="Next work"
      disabled={isRotating}
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
    perspective: 1000px;
    backface-visibility: hidden;
    transition: transform 0.5s ease-out, opacity 0.5s ease-out;
  }
  
  /* Add some perspective to the container */
  .carousel-container {
    perspective: 1000px;
    overflow: visible;
    touch-action: pan-y; /* Enable vertical scrolling but handle horizontal swipes */
  }
  
  /* Disable buttons during rotation */
  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Highlight effect on hover for non-active items */
  .highlight-on-hover:hover {
    filter: brightness(1.2);
    transform: scale(1.05);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style> 