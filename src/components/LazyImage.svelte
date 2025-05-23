<script lang="ts">
  import { useImageDimensions, getDimensions } from '$lib/hooks/useImageDimensions';

  let {
    src,
    alt = "",
    className = "",
    imageKey
  }: {
    src: string;
    alt?: string;
    className?: string;
    imageKey: string;
  } = $props();

  let imageLoaded = $state(false);
  let imageError = $state(false);

  const dimensionsMap = useImageDimensions();

  // Calculate aspect ratio reactively
  const aspectRatio = $derived.by(() => {
    const dims = getDimensions($dimensionsMap, imageKey);
    if (dims && dims.width && dims.height) {
      return `${dims.width} / ${dims.height}`;
    }
    return undefined;
  });

  // Generate container style based on aspect ratio
  const containerStyle = $derived.by(() => {
    if (aspectRatio) {
      return `aspect-ratio: ${aspectRatio};`;
    }
    return '';
  });

  // Log warning if dimensions not found
  $effect(() => {
    const dims = getDimensions($dimensionsMap, imageKey);
    if ($dimensionsMap && imageKey && !dims) {
      console.warn(`Dimensions not found for imageKey: ${imageKey}`);
    }
  });

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
    onload={onImageLoad}
    onerror={onImageError}
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