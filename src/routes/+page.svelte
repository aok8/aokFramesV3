<script lang="ts">
	import Navbar from '$lib/components/ui/navbar.svelte';
	import Footer from '$lib/components/ui/footer.svelte';
	import Hero from './Hero.svelte';
	import Gallery from './Gallery.svelte';
</script>

<Navbar />

<main>
	<Hero />
	<Gallery />
</main>

<Footer />

<style>
	main {
		background-color: var(--near-black, #0e0e0e);
		min-height: 100vh;
	}
</style>
