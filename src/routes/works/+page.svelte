<!-- Works Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Work } from '$lib/types/works.js';
  import { Modal } from '$lib/components/ui/index.js';
  import { theme } from '../../theme/theme.js';
  import Carousel from '../../lib/components/Carousel.svelte';
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';

  export let data: { works: Work[] };
  
  let selectedWork: Work | null = null;
  let selectedImageIndex = 0;
  let enlargedImage: { src: string; alt: string } | null = null;
  let showNsfwWarning = false;
  let nsfwWorkToShow: Work | null = null;

  // Calculate a slightly darker tertiary color for the detail view background
  $: darkerTertiary = `color-mix(in srgb, ${theme.tertiary} 90%, black)`;

  function handleWorkClick(work: Work) {
    if (work.nsfw) {
      showNsfwWarning = true;
      nsfwWorkToShow = work;
    } else {
      openWorkDetail(work);
    }
  }

  function openWorkDetail(work: Work) {
    selectedWork = work;
    selectedImageIndex = 0;
    document.body.style.overflow = 'hidden';
  }

  function closeWorkDetail() {
    selectedWork = null;
    enlargedImage = null;
    document.body.style.overflow = '';
  }

  function nextImage() {
    if (!selectedWork) return;
    selectedImageIndex = (selectedImageIndex + 1) % selectedWork.images.length;
  }

  function prevImage() {
    if (!selectedWork) return;
    selectedImageIndex = (selectedImageIndex - 1 + selectedWork.images.length) % selectedWork.images.length;
  }

  function enlargeImage(image: { src: string; alt: string }) {
    enlargedImage = image;
  }

  function closeEnlargedImage() {
    enlargedImage = null;
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

  // Add keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (!selectedWork) return;
    
    if (e.key === 'ArrowLeft') {
      prevImage();
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'Escape') {
      if (enlargedImage) {
        closeEnlargedImage();
      } else {
        closeWorkDetail();
      }
    }
  }

  let imageLoading = false;
  let imageError = false;

  function handleImageLoad() {
    imageLoading = false;
    imageError = false;
  }

  function handleImageError() {
    imageLoading = false;
    imageError = true;
  }

  onMount(() => {
    // Ensure page scrolls to top on initial load
    window.scrollTo(0, 0);
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
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
      
      <!-- Main Carousel -->
      {#if !selectedWork}
        <Carousel 
          works={data.works} 
          onWorkClick={handleWorkClick}
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
        <div>
          <h2 class="text-2xl font-bold text-white">{selectedWork.title}</h2>
          <div class="flex items-center gap-4 text-white/80 text-sm mt-1">
            <time datetime={selectedWork.published}>
              {new Date(selectedWork.published).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            {#if selectedWork.tags.length > 0}
              <span>•</span>
              <div class="flex gap-2">
                {#each selectedWork.tags as tag}
                  <span class="bg-white/10 px-2 py-0.5 rounded">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <button 
          class="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
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
      <div class="px-4 py-2 text-white/80">
        {selectedWork.description}
      </div>
      
      <!-- Main content area -->
      <div class="flex-1 overflow-auto p-4">
        {#if !enlargedImage}
          <!-- Gallery view -->
          <div class="relative flex items-center justify-center h-[60vh]">
            {#each selectedWork.images as image, i}
              {#if i === selectedImageIndex}
                <div 
                  class="w-full h-full flex items-center justify-center cursor-pointer relative"
                  on:click={() => enlargeImage(image)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      enlargeImage(image);
                    }
                  }}
                >
                  {#if imageLoading}
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
                    </div>
                  {/if}
                  {#if imageError}
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="text-red-400 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <p>Failed to load image</p>
                      </div>
                    </div>
                  {/if}
                  <img 
                    src={image.src} 
                    alt={image.alt} 
                    class="max-h-full max-w-full object-contain transition-opacity duration-300"
                    class:opacity-0={imageLoading || imageError}
                    on:load={handleImageLoad}
                    on:error={handleImageError}
                  />
                </div>
              {/if}
            {/each}
            
            <!-- Navigation buttons -->
            <button 
              class="absolute left-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              on:click={prevImage}
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            
            <button 
              class="absolute right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              on:click={nextImage}
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </button>
          </div>
          
          <!-- Thumbnails -->
          <div class="mt-4 flex gap-2 overflow-x-auto pb-2">
            {#each selectedWork.images as image, i}
              <button 
                class="flex-shrink-0 h-20 w-20 rounded overflow-hidden transition-all duration-200 border-2"
                class:border-white={i === selectedImageIndex}
                class:border-transparent={i !== selectedImageIndex}
                on:click={() => selectedImageIndex = i}
              >
                <img 
                  src={image.src} 
                  alt={`Thumbnail ${i+1}`} 
                  class="h-full w-full object-cover"
                />
              </button>
            {/each}
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
          >
            {#if imageLoading}
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
              </div>
            {/if}
            {#if imageError}
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-red-400 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <p>Failed to load image</p>
                </div>
              </div>
            {/if}
            <img 
              src={enlargedImage.src} 
              alt={enlargedImage.alt} 
              class="max-h-[90vh] max-w-[90vw] object-contain transition-opacity duration-300"
              class:opacity-0={imageLoading || imageError}
              on:load={handleImageLoad}
              on:error={handleImageError}
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
  <div class="p-6">
    <h3 class="text-lg font-semibold mb-4">NSFW Content Warning</h3>
    <p class="mb-6">This work contains NSFW (Not Safe For Work) content. Are you sure you want to proceed?</p>
    <div class="flex justify-end gap-4">
      <button
        class="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 transition-colors"
        on:click={handleNsfwCancel}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors"
        on:click={handleNsfwConfirm}
      >
        Proceed
      </button>
    </div>
  </div>
</Modal>

<style>
  .works-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
  }

  .works-main-content {
    flex: 1;
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  .content-wrapper {
    max-width: 80rem;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  @media (min-width: 640px) {
    .content-wrapper {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }

  @media (min-width: 1024px) {
    .content-wrapper {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  @media (max-width: 768px) {
    .works-container {
      padding-top: 4rem;
    }
  }
</style> 