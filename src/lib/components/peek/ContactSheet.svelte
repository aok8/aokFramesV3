<script lang="ts">
	import Lightbox from '$lib/components/ui/Lightbox.svelte';
	import type { PeekImage } from '$lib/types/peek.js';

	let { images = [] }: { images: PeekImage[] } = $props();
	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let loaded = $state<boolean[]>([]);

	const lightboxImages = $derived(
		images.map((image, index) => ({ src: image.url, alt: imageAlt(image, index) }))
	);
	$effect(() => {
		loaded = new Array(images.length).fill(false);
	});

	function imageAlt(image: PeekImage, index: number) {
		return image.alt?.trim() || `Recently processed photograph ${index + 1}`;
	}

	function checkLoaded(node: HTMLImageElement, index: number) {
		if (node.complete && node.naturalHeight > 0) loaded[index] = true;
	}

	function openImage(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

<section class="contact-sheet" aria-labelledby="contact-sheet-title">
	<header class="sheet-header">
		<div>
			<p class="sheet-kicker">The whole batch</p>
			<h2 id="contact-sheet-title">Contact Sheet</h2>
		</div>
		<p class="sheet-note">Select a frame to inspect</p>
	</header>

	<div class="sheet-grid">
		{#each images as image, i}
			<button
				type="button"
				class="sheet-frame"
				onclick={() => openImage(i)}
				aria-label={`View ${imageAlt(image, i)}`}
			>
				<span class="sheet-shimmer" class:shimmer-done={loaded[i]} aria-hidden="true"></span>
				<img
					src={image.url}
					alt={imageAlt(image, i)}
					loading="lazy"
					decoding="async"
					class:img-loaded={loaded[i]}
					use:checkLoaded={i}
					onload={() => (loaded[i] = true)}
					onerror={() => (loaded[i] = true)}
				/>
				<span class="sheet-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
			</button>
		{/each}
	</div>
</section>

<Lightbox
	images={lightboxImages}
	index={lightboxIndex}
	open={lightboxOpen}
	onclose={() => (lightboxOpen = false)}
	onprev={() => (lightboxIndex = Math.max(0, lightboxIndex - 1))}
	onnext={() => (lightboxIndex = Math.min(images.length - 1, lightboxIndex + 1))}
/>

<style>
	.contact-sheet {
		padding: clamp(4rem, 8vw, 8rem) 5vw 2rem;
		content-visibility: auto;
		contain-intrinsic-size: auto 1200px;
	}
	.sheet-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(200, 192, 184, 0.12);
	}
	.sheet-kicker,
	.sheet-note {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 300;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgba(200, 192, 184, 0.62);
	}
	h2 {
		margin: 0.4rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.25rem, 4vw, 4rem);
		font-style: italic;
		font-weight: 300;
		line-height: 1;
	}
	.sheet-note {
		color: #6f8f7b;
	}
	.sheet-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: clamp(0.45rem, 1vw, 0.9rem);
	}
	.sheet-frame {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: #111;
		contain: layout paint;
	}
	.sheet-frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		filter: sepia(7%) contrast(1.04);
		transition:
			opacity 0.35s ease,
			filter 0.3s ease,
			transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.sheet-frame img.img-loaded {
		opacity: 1;
	}
	.sheet-frame:hover img,
	.sheet-frame:focus-visible img {
		filter: sepia(0%) contrast(1.08);
		transform: scale(1.025);
	}
	.sheet-shimmer {
		position: absolute;
		z-index: 1;
		inset: 0;
		background: linear-gradient(100deg, #111 20%, #1d1c1b 48%, #111 76%);
		background-size: 220% 100%;
		animation: sheet-shimmer 1.4s ease-in-out 2;
		transition: opacity 0.35s ease;
		pointer-events: none;
	}
	.sheet-shimmer.shimmer-done {
		opacity: 0;
		animation: none;
	}
	.sheet-index {
		position: absolute;
		z-index: 2;
		right: 0.6rem;
		bottom: 0.45rem;
		font-family: var(--font-ui);
		font-size: 8px;
		letter-spacing: 0.2em;
		color: rgba(240, 235, 227, 0.72);
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
	}
	@keyframes sheet-shimmer {
		from {
			background-position: 150% 0;
		}
		to {
			background-position: -150% 0;
		}
	}
	@media (max-width: 900px) {
		.sheet-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 600px) {
		.contact-sheet {
			padding-inline: 1rem;
		}
		.sheet-header {
			align-items: start;
			flex-direction: column;
			gap: 0.75rem;
		}
		.sheet-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet-frame img,
		.sheet-shimmer {
			animation: none;
			transition: none;
		}
		.sheet-frame:hover img,
		.sheet-frame:focus-visible img {
			transform: none;
		}
	}
</style>
