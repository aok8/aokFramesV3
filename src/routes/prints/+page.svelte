<script lang="ts">
  import { theme } from '../../theme/theme.js'; // Relative path to theme
  import { Footer, Navbar } from "$lib/components/ui/index.js";
  import { onMount, afterUpdate } from 'svelte'; // Import lifecycle hooks

  // Receive data from load function
  export let data: { width: number; height: number };

  // State for image loading
  let imageLoaded = false;
  let imageError = false;
  let imgElement: HTMLImageElement | null = null;

  // Image URLs
  const primaryImageSrc = "/directr2/constants/Prints.jpg";
  const fallbackImageSrc = "/images/constants/Prints.jpg"; // Local fallback

  // Check completion after updates for fast-loading images
  afterUpdate(() => {
    if (!imageError && imgElement?.complete && !imageLoaded) {
      imageLoaded = true;
    }
  });

  onMount(() => {
    // Reset state if component remounts (e.g., navigation)
    imageLoaded = false;
    imageError = false;
  });

</script>

<div class="page-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />
  <div class="content-area">
    <!-- Image Container with aspect ratio -->
    <div 
      class="image-container"
      style:aspect-ratio={data.width && data.height ? `${data.width} / ${data.height}` : '16 / 9'}
    >
      {#if !imageError}
        <img 
          bind:this={imgElement}
          src={primaryImageSrc} 
          alt="Selection of photographic prints" 
          class="prints-image"
          class:loaded={imageLoaded}
          on:load={() => { imageLoaded = true; }}
          on:error={() => {
            console.error('Primary prints image failed to load, trying fallback');
            imageError = true;
            imageLoaded = false; // Reset load state for fallback
          }}
        />
      {:else}
        <!-- Fallback image attempt -->
        <img 
          bind:this={imgElement}
          src={fallbackImageSrc}
          alt="Selection of photographic prints (fallback)" 
          class="prints-image"
          class:loaded={imageLoaded}
          on:load={() => { imageLoaded = true; }}
          on:error={() => {
            console.error('Fallback prints image also failed to load.');
            // Keep imageError true
          }}
        />
      {/if}
      {#if imageError && !imageLoaded}
        <!-- Optional: Display text if both fail -->
        <div class="error-placeholder">Image unavailable</div>
      {/if}
    </div>

    <div class="section">
      <p>
        I have a selection of prints available <a href="https://aokframes.darkroom.com" target="_blank" rel="noopener noreferrer">here</a>.
      </p>
    </div>
    <div class="section">
      <p>
        For professional inquiries, collaborations, or to commission a unique custom print, please feel free to contact me at <a href="mailto:aokframes@gmail.com">aokframes@gmail.com</a>. I look forward to hearing from you!
      </p>
    </div>
    <div class="section">
      <h1>Featured work</h1>
      <p>
        Currently featured works are:
      </p>
      <ul>
        <li><a href="https://www.ephemere.tokyo/publications/p/anarchy2">Ephemere Anarchy2</a></li>
      </ul>
    </div>
  </div>
  <Footer />
</div>

<style>
  .page-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
  }

  .content-area {
    flex: 1; /* Takes up remaining space */
    display: flex;
    flex-direction: column;
    justify-content: center; /* Center vertically */
    align-items: center; /* Center horizontally */
    text-align: center;
    padding: 2rem;
    gap: 1.5rem; /* Adjusted gap between sections */
  }
  
  .section {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 600px; /* Limit width for readability */
  }

  p {
    font-size: 1.2rem; /* Adjust size as needed */
    line-height: 1.6;
    margin: 0;
  }

  h1 {
    font-size: 2rem;
    line-height: 1.6;
    margin: 0;
  }

  a {
    color: color-mix(in srgb, var(--text-color) 85%, black); /* Link color */
    text-decoration: underline;
  }

  a:hover {
    opacity: 0.8;
  }

  @media (max-width: 768px) {
    p {
      font-size: 1rem;
    }
  }

  /* Styles for image container and image */
  .image-container {
    display: block;
    width: 600px; /* Max width matches existing style */
    max-width: 100%;
    position: relative;
    background-color: #f0f0f0; /* Placeholder color */
    background-image: url('/images/constants/placeholder.svg'); /* Use same placeholder */
    background-size: cover;
    background-position: center;
    margin: 0 auto 2rem auto; /* Center horizontally, add bottom margin */
    border-radius: 8px; /* Optional: Add slight rounded corners */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Optional: Add subtle shadow */
    overflow: hidden; /* Needed to contain absolute positioned image */
  }

  .prints-image {
    /* Position absolutely within container */
    position: absolute;
    top: 0;
    left: 0;
    width: 100%; 
    height: 100%; 
    object-fit: cover; /* Cover the container */
    display: block; 
    /* Fade-in transition */
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
    /* Remove conflicting styles that are now on container */
    /* max-width: 100%; */
    /* width: 600px; */
    /* height: auto; */
    /* margin: 0 auto 2rem auto; */
    /* border-radius: 8px; */
    /* box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); */
  }

  .prints-image.loaded {
    opacity: 1;
  }

  .error-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(0,0,0,0.5);
      font-size: 1rem;
  }

</style> 