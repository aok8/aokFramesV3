<!-- Works Carousel -->
<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import type { Work } from '$lib/types/works.js';
  import { logger } from '$lib/utils/logger';
  
  let {
    works = [],
    onWorkClick,
    currentIndex = 0
  }: {
    works?: Work[];
    onWorkClick: (work: Work) => void;
    currentIndex?: number;
  } = $props();
  
  const dispatch = createEventDispatcher<{
    indexChange: number;
  }>();
  
  // Core state
  let isRotating = $state(false);
  let openingAnimation = $state(false);
  let openingWorkId = $state<string | null>(null);
  let justRotated = $state(false);
  let rotationCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Image loading states
  let loadingStates = $state<{ [key: string]: boolean }>({});
  let loadedStates = $state<{ [key: string]: boolean }>({});
  let imageElements = $state<(HTMLImageElement | null)[]>([]);
  let forceUpdateCounter = $state(0);
  
  // Navigation queue
  let pendingNavigation = $state<'next' | 'prev' | null>(null);
  
  // Touch handling
  let touchStartX = $state(0);
  let touchEndX = $state(0);
  let isTouching = $state(false);
  let touchStartTime = $state(0);
  let touchEndTime = $state(0);
  let touchMoveCount = $state(0);
  
  const touchThreshold = 100;
  const touchTimeThreshold = 300;
  let carouselContainer: HTMLElement;
  
  let openingScale = tweened(1, {
    duration: 300,
    easing: cubicOut
  });

  // Calculate carousel items positions
  const carouselItems = $derived.by(() => {
    return works.map((work, workIndex) => {
      const relativeIndex = (workIndex - currentIndex + works.length) % works.length;
      let zIndex = 5 - Math.min(Math.abs(relativeIndex), 2);
      
      let xPos = 0;
      let yPos = 0;
      let scale = 1;
      let opacity = 1;
      let rotateY = 0;
      
      // Special positioning for exactly 2 cards
      if (works.length === 2) {
        if (relativeIndex === 0) {
          xPos = -150;
          yPos = 0;
          scale = 0.9;
          rotateY = 5;
        } else if (relativeIndex === 1 || relativeIndex === -1) {
          xPos = 150;
          yPos = 0;
          scale = 0.9;
          rotateY = -5;
        }
      } else {
        // Standard positioning for 3+ cards
        if (relativeIndex === 0) {
          xPos = 0;
          yPos = 0;
          scale = 1;
        } else if (relativeIndex === 1 || relativeIndex === -works.length + 1) {
          xPos = 250;
          yPos = 50;
          scale = 0.8;
          rotateY = -15;
          opacity = 0.7;
        } else if (relativeIndex === -1 || relativeIndex === works.length - 1) {
          xPos = -250;
          yPos = 50;
          scale = 0.8;
          rotateY = 15;
          opacity = 0.7;
        } else if (relativeIndex === 2 || relativeIndex === -works.length + 2) {
          xPos = 450;
          yPos = 100;
          scale = 0.6;
          rotateY = -30;
          opacity = 0.4;
        } else if (relativeIndex === -2 || relativeIndex === works.length - 2) {
          xPos = -450;
          yPos = 100;
          scale = 0.6;
          rotateY = 30;
          opacity = 0.4;
        } else if (relativeIndex === 3 || relativeIndex === -works.length + 3) {
          xPos = 650;
          yPos = 150;
          scale = 0.4;
          rotateY = -45;
          opacity = 0;
        } else if (relativeIndex === -3 || relativeIndex === works.length - 3) {
          xPos = -650;
          yPos = 150;
          scale = 0.4;
          rotateY = 45;
          opacity = 0;
        } else {
          xPos = relativeIndex > 0 ? 800 : -800;
          yPos = 200;
          scale = 0.2;
          opacity = 0;
          rotateY = relativeIndex > 0 ? -60 : 60;
        }
      }
      
      // Apply opening animation scaling
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
  });

  // Touch event handlers
  function handleTouchStart(e: TouchEvent) {
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
  
  function handleTouchEnd(e: TouchEvent) {
    if (!isTouching) return;
    isTouching = false;
    touchEndTime = Date.now();
    
    const swipeDistance = touchEndX - touchStartX;
    const swipeDuration = touchEndTime - touchStartTime;
    
    if (Math.abs(swipeDistance) < touchThreshold || 
        swipeDuration < 50 || 
        touchMoveCount < 3) {
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
  }

  // Image loading handlers
  async function handleImageLoad(workId: string) {
    if (!loadedStates[workId]) {
      logger.log(`Image loaded for work: ${workId}`);
      loadedStates[workId] = true;
      await tick();
    }
  }

  function handleImageStartLoad(workId: string) {
    loadingStates[workId] = true;
    loadedStates[workId] = false;
  }

  function initializeAllLoadingStates() {
    const newLoadingStates: { [key: string]: boolean } = {};
    const newLoadedStates: { [key: string]: boolean } = {};
    imageElements = new Array(works.length).fill(null);
    
    works.forEach((work) => {
      newLoadingStates[work.id] = true;
      newLoadedStates[work.id] = false;
    });
    
    loadingStates = newLoadingStates;
    loadedStates = newLoadedStates;
  }
  
  function preloadImages() {
    if (!browser) return;
    
    works.forEach((work) => {
      const img = new Image();
      img.onload = () => {
        logger.log(`Preloaded image for work: ${work.id}`);
        handleImageLoad(work.id);
      };
      img.src = work.coverImage;
    });
  }

  function processPendingNavigation() {
    if (pendingNavigation === 'next') {
      pendingNavigation = null;
      nextWork();
    } else if (pendingNavigation === 'prev') {
      pendingNavigation = null;
      prevWork();
    }
  }

  // Navigation functions
  function nextWork(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) {
      pendingNavigation = 'next';
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
      processPendingNavigation();
    }, 500);
  }

  function prevWork(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (isRotating) {
      pendingNavigation = 'prev';
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
      processPendingNavigation();
    }, 500);
  }
  
  async function rotateToWork(workId: string) {
    if (isRotating) return false;
    
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
      processPendingNavigation();
    }, 500);
    return true;
  }

  // Handle work selection
  async function handleWorkClick(item: typeof carouselItems[0]) {
    if (isRotating || openingAnimation || justRotated) return;
    
    // Special handling for two-card layout
    if (works.length === 2) {
      if (item.active) {
        openWorkWithAnimation(item.work);
      } else {
        await rotateToWork(item.work.id);
      }
      return;
    }
    
    // Normal handling for 3+ cards
    if (item.active) {
      openWorkWithAnimation(item.work);
    } else if (item.visible) {
      await rotateToWork(item.work.id);
    }
  }
  
  // Opening animation
  async function openWorkWithAnimation(work: Work) {
    openingAnimation = true;
    openingWorkId = work.id;
    openingScale.set(1.5);
    
    await tick();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    openingAnimation = false;
    openingWorkId = null;
    openingScale.set(1);
    onWorkClick(work);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevWork();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextWork();
    }
  }

  // Effects
  $effect(() => {
    dispatch('indexChange', currentIndex);
  });

  $effect(() => {
    if (works && works.length > 0) {
      initializeAllLoadingStates();
      if (browser) {
        preloadImages();
      }
    }
  });

  $effect(() => {
    if (!browser) return;

    // Force initial focus for keyboard navigation
    const focusTimeout = setTimeout(() => {
      if (carouselContainer) {
        carouselContainer.focus();
      }
    }, 100);

    // Force reactivity update
    const updateTimeout = setTimeout(() => {
      logger.log('Forcing reactivity update');
      forceUpdateCounter += 1;
    }, 500);

    // Image status polling
    const checkImagesInterval = setInterval(() => {
      let allLoaded = true;
      works.forEach((work, index) => {
        if (!loadedStates[work.id]) {
          allLoaded = false;
          const imgElement = imageElements[index];
          if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
            logger.log(`Poll detected loaded image for work: ${work.id}`);
            handleImageLoad(work.id);
          }
        }
      });

      if (allLoaded || forceUpdateCounter > 5) {
        logger.log('All images loaded or max retries reached, clearing interval');
        clearInterval(checkImagesInterval);
      } else {
        forceUpdateCounter += 1;
      }
    }, 250);

    return () => {
      clearTimeout(focusTimeout);
      clearTimeout(updateTimeout);
      clearInterval(checkImagesInterval);
      if (rotationCompleteTimer) clearTimeout(rotationCompleteTimer);
    };
  });
</script>

<div 
  bind:this={carouselContainer}
  class="carousel-container relative h-[500px] w-full flex items-center justify-center"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ontouchcancel={handleTouchCancel}
  onkeydown={handleKeyDown}
  role="region"
  aria-label="Works carousel"
  tabindex="0"
>
  {#each carouselItems as item (item.work.id)}
    {#if item.visible}
      <div 
        class="carousel-item absolute transition-all duration-500 ease-out cursor-pointer"
        class:highlight-on-hover={!item.active && item.visible}
        style={item.style}
        onclick={() => handleWorkClick(item)}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleWorkClick(item);
          } else if (e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (item.active) {
              handleWorkClick(item);
            }
          }
        }}
        role="button"
        tabindex="0"
      >
        <div class="relative overflow-hidden rounded-lg shadow-xl h-[400px] w-[300px]">
          {#if !loadedStates[item.work.id]}
            <div 
              class="absolute inset-0 bg-gray-200 animate-pulse z-10"
              aria-hidden="true"
            ></div>
          {/if}
          
          <img 
            bind:this={imageElements[works.findIndex(w => w.id === item.work.id)]} 
            src={item.work.coverImage} 
            alt={item.work.title}
            class="w-full h-full object-cover z-20 transition-opacity duration-300"
            class:blur-md={item.work.nsfw}
            class:opacity-0={!loadedStates[item.work.id]}
            class:opacity-100={loadedStates[item.work.id]}
            class:pointer-events-none={!loadedStates[item.work.id]}
            onload={() => handleImageLoad(item.work.id)}
          />

          <div 
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30 transition-opacity duration-300 delay-100"
            class:opacity-0={!loadedStates[item.work.id]}
            class:opacity-100={loadedStates[item.work.id]}
            class:pointer-events-none={!loadedStates[item.work.id]}
          >
            <h2 class="text-xl font-bold">{item.work.title}</h2>
            {#if item.work.nsfw}
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
  
  {#if works.length > 1}
    <button 
      class="absolute left-4 md:left-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
      onclick={prevWork}
      aria-label="Previous work"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"></path>
      </svg>
    </button>
    
    <button 
      class="absolute right-4 md:right-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
      onclick={nextWork}
      aria-label="Next work"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"></path>
      </svg>
    </button>
  {/if}
</div>

<style>
  .carousel-item {
    user-select: none;
    will-change: transform, opacity;
    transform-style: preserve-3d;
    perspective: 1000px;
    backface-visibility: hidden;
    transition: transform 0.5s ease-out, opacity 0.5s ease-out;
  }
  
  .carousel-container {
    perspective: 1000px;
    overflow: visible;
    touch-action: pan-y;
    outline: none;
  }
  
  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
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