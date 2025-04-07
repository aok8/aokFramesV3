<script lang="ts">
    import Cover from "./Cover.svelte";
    import MainContent from "./MainContent.svelte";
    
    let mainContent: MainContent;
</script>

<Cover on:coverScrolledAway={() => mainContent.handleCoverScrolledAway()} />

<MainContent bind:this={mainContent} />
