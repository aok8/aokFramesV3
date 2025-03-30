<script lang="ts">
  let imageLoaded = false;
  let imageError = false;
  export let src: string;
  export let alt: string = "";
  export let className: string = "";

  function onImageLoad() {
    imageLoaded = true;
  }

  function onImageError() {
    imageError = true;
    imageLoaded = true;
    console.error(`Failed to load image: ${src}`);
  }
</script>

<div class="image-container" class:loaded={imageLoaded} class:error={imageError}>
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
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .error .placeholder {
    background-color: rgba(255, 0, 0, 0.1);
  }
</style> 