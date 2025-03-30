<script lang="ts">
    import { theme } from '../theme/theme.js';
    import '../app.css';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    let scrollY = 0;
    let hasCoverScrolledAway = false;

    $: {
        // Check if cover has scrolled away (100% translated)
        const coverTranslation = Math.min(scrollY/10, 100);
        if (coverTranslation >= 99.5 && !hasCoverScrolledAway) {  // Slightly earlier trigger for smoother transition
            hasCoverScrolledAway = true;
            // Small delay to ensure cover is fully away
            setTimeout(() => {
                dispatch('coverScrolledAway');
            }, 50);
        }
    }
</script>

<svelte:window bind:scrollY={scrollY} />

<div class="cover"
    style={`transform: translateX(${Math.min(scrollY/10, 100)}%); --primary-color: ${theme.primary};`}
>
    <h1>AOK<span>Frames</span></h1>
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
</style>
