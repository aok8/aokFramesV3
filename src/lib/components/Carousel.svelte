<!-- Works Carousel -->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Work } from '$lib/types/works.js';
  
  export let works: Work[] = [];
  export let onWorkClick: (work: Work) => void;
  
  // State variables
  let currentIndex = 0;
  let carouselItems: {
    work: Work;
    style: string;
    zIndex: number;
    active: boolean;
    relativeIndex: number;
    visible: boolean;
  }[] = [];
  let isRotating = false;
  let openingAnimation = false;
  let openingWorkId: string | null = null;
  let openingScale = tweened(1, {
    duration: 600,
    easing: cubicOut
  });
  
  // Calculate positions for carousel items
  function updateCarouselItems() {
    carouselItems = works.map((work, index) => {
      const relativeIndex = (index - currentIndex + works.length) % works.length;
      let zIndex = 5 - Math.min(Math.abs(relativeIndex), 2);
      
      // Calculate position and rotation
      let xPos = 0;
      let yPos = 0;
      let scale = 1;
      let opacity = 1;
      let rotateY = 0;
      
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
      } else {
        // Hide other items
        opacity = 0;
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
        active: relativeIndex === 0,
        relativeIndex,
        visible: Math.abs(relativeIndex) <= 2 || Math.abs(relativeIndex) >= works.length - 2
      };
    });
  }

  // Navigation functions
  function nextWork() {
    if (isRotating) return;
    currentIndex = (currentIndex + 1) % works.length;
    updateCarouselItems();
  }

  function prevWork() {
    if (isRotating) return;
    currentIndex = (currentIndex - 1 + works.length) % works.length;
    updateCarouselItems();
  }
  
  // Function to rotate to a specific work
  async function rotateToWork(workId: string) {
    if (isRotating) return;
    isRotating = true;
    
    // Find the target index
    const targetIndex = works.findIndex(w => w.id === workId);
    if (targetIndex === -1) {
      isRotating = false;
      return;
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
      const startIndex = currentIndex;
      const startTime = Date.now();
      
      // Set the final index directly
      currentIndex = targetIndex;
      updateCarouselItems();
      
      // Wait for the animation to complete
      await new Promise(resolve => setTimeout(resolve, rotationDuration));
    }
    
    isRotating = false;
    return true;
  }

  // Handle work selection
  async function handleWorkClick(item: typeof carouselItems[0]) {
    if (isRotating || openingAnimation) return;
    
    if (item.active) {
      // If center item, open it directly with animation
      openWorkWithAnimation(item.work);
    } else if (item.visible) {
      // If not center but visible, just rotate to center
      await rotateToWork(item.work.id);
    }
  }
  
  // Opening animation
  async function openWorkWithAnimation(work: Work) {
    openingAnimation = true;
    openingWorkId = work.id;
    openingScale.set(1.5);
    
    // Fade out other works
    updateCarouselItems();
    
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
    updateCarouselItems();
  });

  // Update carousel when works change
  $: if (works) {
    updateCarouselItems();
  }
</script>

<div class="carousel-container relative h-[500px] w-full flex items-center justify-center">
  {#each carouselItems as item (item.work.id)}
    <!-- Only render visible items -->
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
          <!-- Cover Image with NSFW blur if needed -->
          <img 
            src={item.work.coverImage} 
            alt={item.work.title}
            class="w-full h-full object-cover transition-all duration-300"
            class:blur-md={item.work.nsfw}
          />
          
          <!-- Title overlay -->
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <h2 class="text-xl font-bold">{item.work.title}</h2>
            
            <!-- NSFW warning -->
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
  
  <!-- Navigation buttons -->
  <button 
    class="absolute left-4 md:left-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
    on:click={prevWork}
    aria-label="Previous work"
    disabled={isRotating}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  </button>
  
  <button 
    class="absolute right-4 md:right-8 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
    on:click={nextWork}
    aria-label="Next work"
    disabled={isRotating}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  </button>
</div>

<style>
  /* Custom styles */
  .carousel-item {
    user-select: none;
    will-change: transform, opacity;
    transform-style: preserve-3d;
    perspective: 1000px;
    backface-visibility: hidden;
  }
  
  /* Add some perspective to the container */
  .carousel-container {
    perspective: 1000px;
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
</style> 