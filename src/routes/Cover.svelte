<script lang="ts">
    import { theme } from '../theme/theme';
    import '../app.css';
    let scrollY = 0;
</script>

<svelte:window bind:scrollY={scrollY} />

<div class="cover"
    class:hidden={scrollY > 100}
    style={`transform: translateX(${Math.min(scrollY/10, 100)}%); --primary-color: ${theme.primary};`}
>
    <h1>AOK<span>Frames</span></h1>
</div>


<style>
    .cover {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        background-color: var(--primary-color);
        z-index: 1;
    }
    .cover.hidden {
        transform: translateX(100%);
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
