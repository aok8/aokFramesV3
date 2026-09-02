<script lang="ts">
	import Navbar from '$lib/components/ui/navbar.svelte';
	import Footer from '$lib/components/ui/footer.svelte';
	import FilmStrip from '$lib/components/peek/FilmStrip.svelte';
	import ContactSheet from '$lib/components/peek/ContactSheet.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	const featuredImages = $derived(data.images.slice(0, 6));
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

	<main class="peek-main">
		<header class="peek-header">
			<p class="peek-eyebrow">Quick-Peek</p>
			<h1 class="peek-title">On the Table</h1>
			<p class="peek-desc">
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
			<FilmStrip images={[]} ghost={true} speed={40} height={260} />
		{:else if data.isEmpty}
			<p class="holding-msg">
				I got nothing right now, but I promise I'm working on the next batch. Maybe. Kinda.
			</p>
			<FilmStrip images={[]} ghost={true} speed={40} height={260} />
		{:else}
			<FilmStrip images={featuredImages} speed={40} height={260} />
			<ContactSheet images={data.images} />
		{/if}

		<div class="bottom-meta">
			<div>
				<p class="bottom-meta-label motion-label-default">Hover to pause</p>
				<p class="bottom-meta-label motion-label-reduced">Scroll to explore</p>
				<p class="hover-hint motion-label-default">← Auto-scrolling current roll →</p>
				<p class="hover-hint motion-label-reduced">← Static filmstrip →</p>
			</div>
			<div class="bottom-meta-count">{data.images.length}</div>
		</div>
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
		font-size: 8px;
		font-weight: 300;
		letter-spacing: 0.45em;
		text-transform: uppercase;
		color: var(--forest-green);
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
			font-size: 10px;
			white-space: normal;
		}
	}

	.holding-msg {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 300;
		font-size: clamp(1rem, 1.8vw, 1.4rem);
		color: rgba(200, 192, 184, 0.4);
		text-align: center;
		padding: 2.5rem 0 3rem;
		letter-spacing: 0.02em;
	}

	.peek-status {
		padding: 2.5rem 5vw 3rem;
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

	.motion-label-reduced {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.motion-label-default {
			display: none;
		}
		.motion-label-reduced {
			display: block;
		}
	}

	.bottom-meta {
		padding: 2rem 5vw 4rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-top: 1px solid rgba(200, 192, 184, 0.06);
	}

	.bottom-meta-label {
		font-size: 9px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(200, 192, 184, 0.35);
	}

	.hover-hint {
		font-size: 9px;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: var(--forest-green);
		opacity: 0.6;
		margin-top: 0.5rem;
	}

	.bottom-meta-count {
		font-family: var(--font-display);
		font-size: 4rem;
		font-weight: 300;
		font-style: italic;
		color: rgba(200, 192, 184, 0.08);
		line-height: 1;
	}
</style>
