<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  let isSticky = true;
  let isScrollingPaused = false;
  let showText = false;
  let hasPassed = false; // New flag to track if we've passed the sticky point

  // Function to check if the element is still sticky
  function checkStickyState(entry: IntersectionObserverEntry) {
    if (entry.intersectionRatio < 1 && !hasPassed) {
      isSticky = false;
      hasPassed = true; // Mark that we've passed the sticky point
      pauseScrolling();
    }
  }

  function pauseScrolling() {
    if (isScrollingPaused) return; // Prevent multiple triggers
    
    isScrollingPaused = true;
    const currentScroll = window.scrollY;
    document.body.style.overflow = 'hidden';
    showText = true;

    // Lock scroll position
    window.scrollTo(0, currentScroll);

    setTimeout(() => {
      showText = false;
      setTimeout(() => {
        document.body.style.overflow = '';
        isScrollingPaused = false;
      }, 500);
    }, 2000);
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
  <h1>Growth through experience</h1>
  <p>This page serves as a way to showcase the work I've done through the experiences I've had.</p>
  <p>I try best to capture feelings and essence through the images I take, to invoke some sort of emotion in the viewer.
    It's because of this, that I have a hard time categorizing my work, it's more a collection of such. I find joy in being able 
    to see the changes in what caught my eye, and also bring back memories of what exactly it was that excited me. 
    Hopefully, through this, you'll be excited to see what I've been up to.
  </p>
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
        background-color: #10312A;
        z-index: -1;
    }

    .after-cover h1 {
        color: #EFEBE0;
        font-size: 3rem;
        font-weight: 100;
        text-align: center;
        padding-top: 10rem;
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