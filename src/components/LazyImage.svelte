<script lang="ts">
  import { useImageDimensions, getDimensions } from '$lib/hooks/useImageDimensions';
  import { onMount } from 'svelte';

  let imageLoaded = false;
  let imageError = false;
  export let src: string;
  export let alt: string = "";
  export let className: string = "";
  /**
   * The unique key (filename) of the image used to look up dimensions.
   * Example: "image1.jpg"
   */
  export let imageKey: string;

  // Get the reactive dimensions map store
  const dimensionsMap = useImageDimensions();

  let aspectRatio: string | undefined = undefined;
  let containerStyle: string = "";

  // $: automatically recalculates when dimensionsMap or imageKey changes
  $: {
    const dims = getDimensions($dimensionsMap, imageKey);
    if (dims && dims.width && dims.height) {
      aspectRatio = `${dims.width} / ${dims.height}`;
      // Apply aspect-ratio directly for modern browsers
      // The container needs height: auto or similar if aspect-ratio is set here
      containerStyle = `aspect-ratio: ${aspectRatio};`;
    } else {
      // Fallback if dimensions aren't found yet or error
      // You might want a default aspect ratio or different handling
      aspectRatio = undefined;
      containerStyle = ''; // Or set a default aspect-ratio: e.g., 'aspect-ratio: 16 / 9;'
      if ($dimensionsMap && imageKey) {
        // Only log warning if the map is loaded but the key is missing
        console.warn(`Dimensions not found for imageKey: ${imageKey}`);
      }
    }
  }

  function onImageLoad() {
    imageLoaded = true;
  }

  function onImageError() {
    imageError = true;
    imageLoaded = true;
    console.error(`Failed to load image: ${src}`);
  }
</script>

<div 
  class="image-container" 
  class:loaded={imageLoaded} 
  class:error={imageError}
  style={containerStyle}
>
  {#if !imageLoaded}
    <div class="placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>
  {/if}
  <img
    {src}
    {alt}
    class={className}
    on:load={onImageLoad}
    on:error={onImageError}
    loading="lazy"
    style={aspectRatio ? `aspect-ratio: ${aspectRatio}; width: 100%; height: auto;` : ''}
  />
</div>

<style>
  .image-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  .placeholder svg {
    width: 30%;
    height: 30%;
    color: rgba(0, 0, 0, 0.2);
  }

  .loaded .placeholder {
    display: none;
  }

  img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  .error .placeholder {
    background-color: rgba(255, 0, 0, 0.1);
  }
</style> 