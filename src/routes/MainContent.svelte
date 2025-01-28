<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;

  // Function to check if the element is still sticky
  function checkStickyState(entry: IntersectionObserverEntry) {
    if (entry.intersectionRatio < 1) {
      isSticky = false;
      pauseScrolling();
    }
  }

  function pauseScrolling() {
    isScrollingPaused = true;
    document.body.style.overflow = 'hidden'; // Disable scrolling
    showText = true; // Show the text

    // After the text fades in and out, resume scrolling
    setTimeout(() => {
      showText = false;
      setTimeout(() => {
        document.body.style.overflow = ''; // Re-enable scrolling
        isScrollingPaused = false;
      }, 500); // Wait for fade-out animation to complete
    }, 2000); // Adjust timing as needed
  }

  onMount(() => {
    window.scrollTo(0, 0);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(checkStickyState);
      },
      { threshold: 1 } // Trigger when the element is fully visible
    );

    const imageElement = document.querySelector('.full-size-image');
    if (imageElement) {
      observer.observe(imageElement);
    }

    return () => observer.disconnect();
  });
</script>

<div class="content">
    <img src="/images/bg.jpg" alt="AOK Frames Star Pic" class="full-size-image" />
    {#if showText}
        <div class="text" transition:fade>
          Growth through experience
        </div>
    {/if}
</div>
<div class="after-cover">
</div>

<style>
    .content {
      min-height: 220vh; /* Scroll past cover and be able to scroll further */
      padding: 0; /* Changed from 20px to 0 to remove potential padding */
      margin: 0; /* Ensure no margin */
      position: relative; /* Add this for proper sticky positioning */
    }

    .full-size-image {
        position: sticky;
        top: 0; /* Stick to the top of the viewport */
        left: 0;
        width: 100vw; /* Changed from 100% to 100vw to ensure full viewport width */
        height: 100vh; /* Make it full viewport height */
        object-fit: cover;
        z-index: 0;
        filter: drop-shadow(0 0 10px white);
        transition: top 0.3s ease; /* Smooth transition for sticky effect */
        margin: 0; /* Ensure no margin */
        display: block; /* Ensure proper block-level behavior */
    }

    .after-cover {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: #36454F;
        z-index: -1;
    }

    .text {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2; /* Higher than the image */
        font-size: 5rem;
        color: white;
        text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        pointer-events: none; /* Prevent text from blocking interactions */
    }
</style>