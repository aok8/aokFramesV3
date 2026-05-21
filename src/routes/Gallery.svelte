<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getPortfolioImages } from '$lib/utils/images.js';
	import { initScrollReveal, initImageHoverEffect, initFadeUpReveal, killScrollTriggers } from '$lib/utils/animations.js';

	interface PortfolioImage {
		url: string;
		fallback: string;
		width: number;
		height: number;
	}

	let images = $state<PortfolioImage[]>([]);
	let loading = $state(true);
	let error = $state(false);

	onMount(() => {
		if (!browser) return () => {};

		// Run async work in an IIFE so onMount can return a sync cleanup
		(async () => {
			try {
				const result = await getPortfolioImages(window.innerWidth);
				images = result;
				// Tick so Svelte has flushed the new image nodes into the DOM
				await Promise.resolve();
				initScrollReveal('.gallery-item', { stagger: 0.06, duration: 1.0 });
				initImageHoverEffect('.gallery-item');
				initFadeUpReveal('.gallery-header', { duration: 0.7, y: 16 });
			} catch {
				error = true;
			} finally {
				loading = false;
			}
		})();

		return () => killScrollTriggers();
	});
</script>

<section class="gallery" aria-label="Selected works">
	<header class="gallery-header">
		<p class="gallery-label">Selected Works</p>
	</header>

	{#if loading}
		<div class="gallery-grid skeleton-grid" aria-busy="true" aria-label="Loading images">
			{#each Array(9) as _, i}
				<div class="skeleton" style="height: {120 + (i % 3) * 60}px"></div>
			{/each}
		</div>
	{:else if error || images.length === 0}
		<div class="gallery-empty">
			<p>Images unavailable</p>
		</div>
	{:else}
		<div class="gallery-grid">
			{#each images as image}
				<a href="/works" class="gallery-item" tabindex="0">
					<img
						src={image.url}
						width={image.width}
						height={image.height}
						alt=""
						loading="lazy"
						decoding="async"
					/>
				</a>
			{/each}
		</div>
	{/if}

	<div class="gallery-cta">
		<a href="/works" class="view-all-link">
			<span class="view-all-text">View All Works</span>
			<span class="view-all-line" aria-hidden="true"></span>
		</a>
	</div>
</section>

<style>
	.gallery {
		background-color: var(--near-black, #0e0e0e);
		padding: 6rem 2rem 8rem;
	}

	.gallery-header {
		max-width: 1400px;
		margin: 0 auto 3rem;
	}

	.gallery-label {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 9px;
		font-weight: 300;
		letter-spacing: 0.45em;
		text-transform: uppercase;
		color: var(--text-dim, rgba(200, 192, 184, 0.45));
		margin: 0;
	}

	/* Masonry columns grid */
	.gallery-grid {
		max-width: 1400px;
		margin: 0 auto;
		columns: 3;
		column-gap: 10px;
	}

	.gallery-item {
		display: block;
		break-inside: avoid;
		margin-bottom: 10px;
		overflow: hidden;
		position: relative;
	}

	.gallery-item img {
		width: 100%;
		height: auto;
		display: block;
		transition: transform 0.4s ease, filter 0.4s ease;
		filter: brightness(0.9);
	}

	.gallery-item:hover img,
	.gallery-item:focus img {
		transform: scale(1.02);
		filter: brightness(1.05);
	}

	/* Skeleton loaders */
	.skeleton-grid {
		columns: 3;
		column-gap: 10px;
	}

	.skeleton {
		break-inside: avoid;
		margin-bottom: 10px;
		background: rgba(200, 192, 184, 0.06);
		border-radius: 1px;
		animation: shimmer 1.8s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.7; }
	}

	/* CTA link */
	.gallery-cta {
		max-width: 1400px;
		margin: 3rem auto 0;
		display: flex;
		justify-content: center;
	}

	.view-all-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		color: var(--silver, #c8c0b8);
		transition: color 0.3s ease;
	}

	.view-all-link:hover {
		color: var(--gold, #b8936a);
	}

	.view-all-text {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 9px;
		font-weight: 300;
		letter-spacing: 0.45em;
		text-transform: uppercase;
	}

	.view-all-line {
		display: block;
		width: 40px;
		height: 1px;
		background: currentColor;
		transition: width 0.3s ease;
	}

	.view-all-link:hover .view-all-line {
		width: 60px;
	}

	/* Empty state */
	.gallery-empty {
		max-width: 1400px;
		margin: 0 auto;
		text-align: center;
		padding: 4rem 0;
	}

	.gallery-empty p {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 10px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--text-dim, rgba(200, 192, 184, 0.45));
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.gallery-grid,
		.skeleton-grid {
			columns: 2;
		}
	}

	@media (max-width: 600px) {
		.gallery {
			padding: 4rem 1rem 5rem;
		}

		.gallery-grid,
		.skeleton-grid {
			columns: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-item img {
			transition: none;
		}
		.skeleton {
			animation: none;
			opacity: 0.5;
		}
	}
</style>
