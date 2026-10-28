<script lang="ts">
	import Navbar from '$lib/components/ui/navbar.svelte';
	import Footer from '$lib/components/ui/footer.svelte';
	import FilmStrip from '$lib/components/peek/FilmStrip.svelte';
	import ContactSheet from '$lib/components/peek/ContactSheet.svelte';
	import Lightbox from '$lib/components/ui/Lightbox.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// The strip shows the 35 newest frames; the contact sheet below carries the whole batch.
	const STRIP_MAX = 35;
	const featuredImages = $derived(data.images.slice(0, STRIP_MAX));
	// Keep the cruising pace (~51px/s) the same however many frames are on the roll.
	const stripSeconds = $derived(Math.max(40, featuredImages.length * 6.7));

	let stripOpen = $state(false);
	let stripIndex = $state(0);
	const stripLightbox = $derived(
		featuredImages.map((image, i) => ({
			src: image.url,
			alt: image.alt?.trim() || `Recently processed photograph ${i + 1}`
		}))
	);
</script>

<svelte:head>
	<title>Quick-Peek — AOKFrames</title>
	<meta
		name="description"
		content="A rolling preview of recently processed film — images I'm working through before they become a series or get archived."
	/>
	<meta property="og:title" content="Quick-Peek — AOKFrames" />
	<meta
		property="og:description"
		content="A rolling preview of recently processed film — images I'm working through before they become a series or get archived."
	/>
	<meta property="og:url" content="https://aokframes.com/peek" />
</svelte:head>

<div class="peek-page">
	<Navbar />

	<main id="main" class="peek-main">
		<header class="peek-header">
			<p class="peek-eyebrow enter">Quick-Peek</p>
			<h1 class="peek-title enter" style="--enter-delay: 100ms">On the Table</h1>
			<p class="peek-desc enter" style="--enter-delay: 220ms">
				Images I've processed in the past days, just a peek into what I'm up to.<br />
				Images will either be made into a work, or stored away, archived.<br />
				Check back to see what's on the table.
			</p>
		</header>

		{#if data.loadError}
			<div class="peek-status" role="status">
				<p>The latest frames couldn't be loaded.</p>
				<a href="/peek">Try again</a>
			</div>
		{:else if data.isEmpty}
			<p class="holding-msg">
				I got nothing right now, but I promise I'm working on the next batch. Maybe. Kinda.
			</p>
		{:else}
			<FilmStrip
				images={featuredImages}
				speed={stripSeconds}
				height={260}
				onopen={(i) => ((stripIndex = i), (stripOpen = true))}
			/>
			<Lightbox
				images={stripLightbox}
				index={stripIndex}
				open={stripOpen}
				onclose={() => (stripOpen = false)}
				onprev={() => (stripIndex = Math.max(0, stripIndex - 1))}
				onnext={() => (stripIndex = Math.min(featuredImages.length - 1, stripIndex + 1))}
			/>
			<ContactSheet images={data.images} />
		{/if}
	</main>

	<Footer />
</div>

<style>
	.peek-page {
		min-height: 100vh;
		background-color: var(--near-black);
		color: var(--warm-white);
		display: flex;
		flex-direction: column;
	}

	.peek-main {
		flex: 1;
		padding-bottom: 5rem;
	}

	.peek-header {
		padding: 9rem 5vw 3rem;
		border-bottom: 1px solid rgba(200, 192, 184, 0.08);
		text-align: center;
	}

	.peek-eyebrow {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 300;
		letter-spacing: 0.45em;
		text-transform: uppercase;
		color: var(--green-lit);
		margin-bottom: 1rem;
	}

	.peek-title {
		font-family: var(--font-display);
		font-size: clamp(3rem, 6vw, 6rem);
		font-weight: 300;
		font-style: italic;
		line-height: 1;
		letter-spacing: -0.01em;
		margin-bottom: 1.5rem;
	}

	.peek-desc {
		font-family: var(--font-ui);
		font-size: 14px;
		font-weight: 300;
		letter-spacing: 0.15em;
		line-height: 2;
		color: rgba(200, 192, 184, 0.85);
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.peek-desc {
			font-size: 12px;
			white-space: normal;
		}
	}

	.holding-msg {
		display: grid;
		min-height: clamp(16rem, 42vh, 32rem);
		place-items: center;
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 300;
		font-size: clamp(1rem, 1.8vw, 1.4rem);
		color: rgba(200, 192, 184, 0.68);
		text-align: center;
		padding: 4rem 5vw;
		letter-spacing: 0.02em;
	}

	.peek-status {
		display: grid;
		min-height: clamp(16rem, 42vh, 32rem);
		place-content: center;
		padding: 4rem 5vw;
		text-align: center;
		color: var(--silver);
		font-family: var(--font-ui);
		font-size: 0.875rem;
		letter-spacing: 0.08em;
	}

	.peek-status a {
		display: inline-block;
		margin-top: 0.75rem;
		color: var(--warm-white);
		text-decoration: underline;
		text-underline-offset: 0.3em;
	}
</style>
