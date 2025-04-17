<script lang="ts">
    import { theme } from '../theme/theme.js';
    import '../app.css';
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment'; // Import browser check

    const dispatch = createEventDispatcher();
    let scrollY = 0;
    let hasCoverScrolledAway = false;
    let isMobile = false; // Track mobile state
    let transformStyle = ''; // Reactive style string

    function resetState() {
        scrollY = 0;
        hasCoverScrolledAway = false;
        if (browser) { // Check if running in browser
            checkMobile(); // Re-check mobile state on reset
        }
    }

    let mediaQueryList: MediaQueryList | null = null;

    function checkMobile() {
        if (!browser) return; // Guard against SSR
        isMobile = window.matchMedia('(max-width: 768px)').matches;
    }

    function handleResize() {
        checkMobile();
    }

    onMount(() => {
        if (browser) { // Ensure this runs only in the browser
            checkMobile(); // Initial check
            mediaQueryList = window.matchMedia('(max-width: 768px)');
            mediaQueryList.addEventListener('change', handleResize);
            resetState(); // Initial reset
        }
    });

    onDestroy(() => {
        if (browser && mediaQueryList) { // Cleanup listener
            mediaQueryList.removeEventListener('change', handleResize);
        }
    });

    $: {
        // Calculate the translation percentage based on scrollY
        // Adjusted sensitivity for vertical scroll (translateY) for potentially better feel
        const scrollSensitivity = isMobile ? 8 : 10;
        const translationPercentage = Math.min(scrollY / scrollSensitivity, 100);

        // Update the transform style reactively
        if (isMobile) {
            transformStyle = `transform: translateY(-${translationPercentage}%);`;
        } else {
            transformStyle = `transform: translateX(${translationPercentage}%);`;
        }

        // Check if cover has scrolled away (100% translated)
        if (translationPercentage >= 99.5 && !hasCoverScrolledAway) {  // Slightly earlier trigger
            hasCoverScrolledAway = true;
            // Small delay to ensure cover is fully away
            setTimeout(() => {
                dispatch('coverScrolledAway');
            }, 50);
        } else if (translationPercentage < 99.5 && hasCoverScrolledAway) {
             // Reset if user scrolls back up before it's fully gone
             hasCoverScrolledAway = false;
        }
    }
</script>

<svelte:window bind:scrollY={scrollY} />

<div class="cover"
    style={`${transformStyle} --primary-color: ${theme.primary};`}
>
    <h1>AOK<span>Frames</span></h1>
    
    <!-- Down arrow for mobile -->
    <svg class="down-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
    </svg>
</div>


<style>
    .cover {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--primary-color);
        z-index: 10; /* Highest z-index to be above everything initially */
        transition: transform 0.3s ease-out;  /* Slightly longer transition */
        padding-bottom: 60px; /* Add padding to prevent overlap with arrow */
    }
    .cover h1 {
        color: white;
        font-size: clamp(2rem, 5vw, 4rem); /* min: 2rem, scales with 5% of viewport width, max: 4rem */
        font-weight: bold;
        justify-content: center;
        align-items: center;
        display: flex;
        height: 100%;
        width: 100%;
        gap: 0.5rem; /* Add some spacing between text and span */
        font-family: 'Josefin Sans', sans-serif;
    }
    .cover h1 span {
        color: rgb(208, 204, 204);
        font-family: 'Josefin Sans', sans-serif;
    }

    .down-arrow {
        position: absolute;
        bottom: 25px; 
        left: 50%;
        transform: translateX(-50%);
        width: 35px; 
        height: 35px;
        fill: white;
        animation: pulseDown 1.8s infinite ease-in-out;
        display: none; /* Hidden by default */
    }

    /* Show only on mobile */
    @media (max-width: 768px) {
       .down-arrow { 
           display: block; 
        }
    }

    @keyframes pulseDown {
        0%, 100% {
            transform: translateX(-50%) translateY(0);
            opacity: 0.7;
        }
        50% {
            transform: translateX(-50%) translateY(10px); 
            opacity: 1;
        }
    }
</style>
