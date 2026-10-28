<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getPortfolioImages } from '$lib/utils/images.js';
	import { initFadeUpReveal, killScrollTriggers } from '$lib/utils/animations.js';
	import { reveal } from '$lib/utils/reveal.js';
	import Lightbox from '$lib/components/ui/Lightbox.svelte';

	interface PortfolioImage {
		url: string;
		fallback: string;
		width: number;
		height: number;
		alt: string;
	}

	let images = $state<PortfolioImage[]>([]);
	let loading = $state(true);
	let error = $state(false);

	// Lightbox state
	let lbOpen  = $state(false);
	let lbIndex = $state(0);

	const lbImages = $derived(images.map(img => ({ src: img.url, alt: img.alt })));

	// "Developing print" reveal: each photo comes up from underexposed once it has both loaded
	// and scrolled into view. Tiles hold their true aspect ratio, so nothing shifts as they develop.
	const reducedMotion = browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let loadedAt = $state<Record<number, boolean>>({});
	let inView = $state<Record<number, boolean>>({});
	let delays = $state<Record<number, number>>({});
	let io: IntersectionObserver | undefined;

	function watchTile(node: HTMLElement, i: number) {
		node.dataset.i = String(i);
		if (reducedMotion) return {};
		io ??= new IntersectionObserver(
			(entries) => {
				// Tiles entering together develop in reading order, a short beat apart.
				const entering = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
				entering.forEach((entry, order) => {
					const idx = Number((entry.target as HTMLElement).dataset.i);
					delays[idx] = Math.min(order * 90, 540);
					inView[idx] = true;
					io?.unobserve(entry.target);
				});
			},
			{ rootMargin: '0px 0px -4% 0px' }
		);
		io.observe(node);
		return { destroy: () => io?.unobserve(node) };
	}

	function trackLoad(node: HTMLImageElement, i: number) {
		if (node.complete && node.naturalHeight > 0) loadedAt[i] = true;
	}

	const isDeveloped = (i: number) => reducedMotion || (!!loadedAt[i] && !!inView[i]);

	function openLightbox(idx: number) {
		lbIndex = idx;
		lbOpen  = true;
	}

	function closeLightbox() { lbOpen = false; }

	function prevImage() { if (lbIndex > 0) lbIndex--; }

	function nextImage() { if (lbIndex < images.length - 1) lbIndex++; }

	onMount(() => {
		if (!browser) return () => {};

		// Run async work in an IIFE so onMount can return a sync cleanup
		(async () => {
			try {
				const result = await getPortfolioImages(window.innerWidth);
				images = result;
				// Tick so Svelte has flushed the new image nodes into the DOM
				await Promise.resolve();
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
		<h2 class="gallery-label">Selected Works</h2>
	</header>

	{#if loading}
		<div class="gallery-grid skeleton-grid" aria-busy="true" aria-label="Loading images">
			{#each Array(9) as _, i}
				<div class="skeleton" style="aspect-ratio: {["4 / 5", "3 / 2", "1 / 1", "2 / 3", "3 / 2", "4 / 5"][i % 6]}; animation-delay: {i * 140}ms"></div>
			{/each}
		</div>
	{:else if error || images.length === 0}
		<div class="gallery-empty">
			<p>Images unavailable</p>
		</div>
	{:else}
		<div class="gallery-grid">
			{#each images as image, i}
				<button
					class="gallery-item"
					class:developed={isDeveloped(i)}
					style:aspect-ratio={image.width && image.height ? `${image.width} / ${image.height}` : undefined}
					style:--develop-delay={`${delays[i] ?? 0}ms`}
					use:watchTile={i}
					onclick={() => openLightbox(i)}
					aria-label={image.alt ? `View photo: ${image.alt}` : 'View photo'}
				>
					<img
						use:trackLoad={i}
						onload={() => (loadedAt[i] = true)}
						onerror={() => (loadedAt[i] = true)}
						src={image.url}
						width={image.width}
						height={image.height}
						alt={image.alt}
						loading="lazy"
						decoding="async"
					/>
					{#if image.alt}
						<span class="photo-label">{image.alt}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<Lightbox images={lbImages} index={lbIndex} open={lbOpen} onclose={closeLightbox} onprev={prevImage} onnext={nextImage} />

	<div class="gallery-cta">
		<a href="/works" class="view-all-link">
			<span class="view-all-text">View All Works</span>
			<span class="view-all-line" aria-hidden="true"></span>
		</a>
	</div>

	<div class="gallery-inquiry" use:reveal>
		<p class="inquiry-line">Prints, portraits and commissions.</p>
		<div class="inquiry-actions">
			<a class="inquiry-primary" href="mailto:aokframes@gmail.com?subject=Inquiry%20from%20aokframes.com">Get in touch</a>
			<a class="inquiry-secondary" href="/prints">See prints</a>
		</div>
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
		font-weight: 300;
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 12px;
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
		/* Reset button defaults */
		appearance: none;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		/* Layout */
		display: block;
		width: 100%;
		break-inside: avoid;
		margin-bottom: 10px;
		overflow: hidden;
		position: relative;
		cursor: zoom-in;
		background: #111;
		--develop-delay: 0ms;
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* Undeveloped: dark, sepia, soft, as a print looks before it comes up in the tray */
		opacity: 0.08;
		filter: sepia(0.6) brightness(0.4) contrast(0.85) blur(5px);
		transform: scale(1.03);
	}

	.gallery-item.developed img {
		opacity: 1;
		filter: brightness(0.9);
		transform: none;
		transition:
			opacity 0.9s ease var(--develop-delay),
			filter 1.5s cubic-bezier(0.16, 1, 0.3, 1) var(--develop-delay),
			transform 1.5s cubic-bezier(0.16, 1, 0.3, 1) var(--develop-delay);
	}

	/* Once developed, hover responds immediately */
	.gallery-item.developed:hover img,
	.gallery-item.developed:focus-visible img {
		transform: scale(1.02);
		filter: brightness(1.05);
		transition: transform 0.4s ease, filter 0.4s ease;
	}

	.photo-label {
		position: absolute;
		bottom: 10px;
		left: 12px;
		font-family: var(--font-ui);
		font-size: 12px;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: rgba(240, 235, 227, 0.85);
		text-shadow: 0 1px 8px rgba(14, 14, 14, 0.9);
		pointer-events: none;
		user-select: none;
		opacity: 0;
		transition: color 0.4s ease, opacity 0.8s ease 0.6s;
		z-index: 1;
	}

	.gallery-item.developed .photo-label {
		opacity: 1;
	}

	.gallery-item:hover .photo-label,
	.gallery-item:focus .photo-label {
		color: var(--warm-white, #f0ebe3);
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
		animation: shimmer 2.4s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.8; }
	}

	/* CTA link */
	.gallery-cta {
		max-width: 1400px;
		margin: 3rem auto 0;
		display: flex;
		justify-content: center;
	}

	.view-all-link {
		padding: 14px 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		color: var(--silver, #c8c0b8);
		transition: color 0.3s ease;
	}

	.view-all-link:hover {
		color: var(--green-lit, #86ad93);
	}

	.view-all-text {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 12px;
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

	/* Inquiry — the buyer's next step after the gallery */
	.gallery-inquiry {
		max-width: 1400px;
		margin: 6rem auto 0;
		text-align: center;
	}

	.inquiry-line {
		font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
		font-size: clamp(1.75rem, 3.2vw, 2.75rem);
		font-weight: 300;
		font-style: italic;
		color: var(--warm-white, #f0ebe3);
		margin: 0 0 2rem;
	}

	.inquiry-actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.inquiry-primary {
		display: inline-block;
		padding: 14px 28px;
		border: 1px solid var(--green-lit, #86ad93);
		color: var(--green-lit, #86ad93);
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 12px;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.inquiry-primary:hover {
		background: var(--green-lit, #86ad93);
		color: var(--near-black, #0e0e0e);
	}

	.inquiry-secondary {
		padding: 14px 0;
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 12px;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		color: var(--silver, #c8c0b8);
		border-bottom: 1px solid transparent;
		transition: color 0.3s ease, border-color 0.3s ease;
	}

	.inquiry-secondary:hover {
		color: var(--warm-white, #f0ebe3);
		border-color: currentColor;
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
		font-size: 12px;
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
		.gallery-item img,
		.gallery-item.developed img {
			transition: none;
			opacity: 1;
			filter: brightness(0.9);
			transform: none;
		}
		.photo-label {
			opacity: 1;
			transition: none;
		}
		.skeleton {
			animation: none;
			opacity: 0.5;
		}
	}
</style>
