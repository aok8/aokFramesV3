<script lang="ts">
	import type { PeekImage } from '$lib/types/peek.js';

	let {
		images = [],
		speed = 40,
		height = 260
	}: { images: PeekImage[]; speed?: number; height?: number } = $props();

	const frames = $derived([...images, ...images]);
	let imgLoaded = $state<boolean[]>([]);

	$effect(() => {
		imgLoaded = new Array(frames.length).fill(false);
	});

	function checkLoaded(node: HTMLImageElement, index: number) {
		if (node.complete && node.naturalHeight > 0) imgLoaded[index] = true;
	}

	function imageAlt(image: PeekImage, index: number) {
		return image.alt?.trim() || `Recently processed photograph ${index + 1}`;
	}
</script>

<section class="strip-section" aria-label="Current film roll">
	<div class="strip-track">
		<div class="strip-fade strip-fade-left"></div>
		<div class="strip-fade strip-fade-right"></div>
		<div class="strip-inner" style:--strip-speed={`${speed}s`} style:--frame-height={`${height}px`}>
			<div class="frames-row">
				{#each frames as image, i}
					<div
						class="film-frame"
						class:duplicate-frame={i >= images.length}
						aria-hidden={i >= images.length}
					>
						<div class="frame-shimmer" class:shimmer-done={imgLoaded[i]}></div>
						<img
							src={image.url}
							alt={i < images.length ? imageAlt(image, i) : ''}
							loading="eager"
							decoding="async"
							fetchpriority={i === 0 ? 'high' : 'auto'}
							class:img-loaded={imgLoaded[i]}
							use:checkLoaded={i}
							onload={() => (imgLoaded[i] = true)}
							onerror={() => (imgLoaded[i] = true)}
						/>
						<span class="frame-num">{String((i % images.length) + 1).padStart(2, '0')}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.strip-section {
		padding: 2rem 0;
		position: relative;
	}
	.strip-track {
		position: relative;
		overflow: hidden;
		background: #080808;
	}
	.strip-inner {
		position: relative;
		display: inline-flex;
		padding-block: 20px;
		background: #050505;
		animation: scroll-strip var(--strip-speed) linear infinite;
		will-change: transform;
	}
	.strip-inner::before,
	.strip-inner::after {
		content: '';
		position: absolute;
		z-index: 2;
		left: 0;
		width: 100%;
		height: 20px;
		background-image: repeating-linear-gradient(
			90deg,
			transparent 0 8px,
			rgba(200, 192, 184, 0.22) 8px 9px,
			#0e0e0e 9px 20px,
			rgba(200, 192, 184, 0.22) 20px 21px,
			transparent 21px 29px
		);
		background-position: 0 3px;
		background-repeat: repeat-x;
	}
	.strip-inner::before {
		top: 0;
	}
	.strip-inner::after {
		bottom: 0;
	}
	.strip-inner:hover {
		animation-play-state: paused;
	}
	.frames-row {
		display: flex;
		align-items: stretch;
	}
	.film-frame {
		position: relative;
		width: 340px;
		height: var(--frame-height);
		flex-shrink: 0;
		overflow: hidden;
		border-right: 1px solid rgba(200, 192, 184, 0.04);
		background: #111;
	}
	.frame-shimmer {
		position: absolute;
		inset: 0;
		z-index: 3;
		background: linear-gradient(
			90deg,
			#141414 0%,
			#1e1e1e 40%,
			#252525 50%,
			#1e1e1e 60%,
			#141414 100%
		);
		background-size: 200% 100%;
		animation: shimmer-sweep 1.4s ease-in-out 2;
		transition: opacity 0.35s ease;
		pointer-events: none;
	}
	.frame-shimmer.shimmer-done {
		opacity: 0;
		animation: none;
	}
	@keyframes shimmer-sweep {
		from {
			background-position: 150% 0;
		}
		to {
			background-position: -150% 0;
		}
	}
	.film-frame img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: sepia(6%) contrast(1.05);
		opacity: 0;
		transition:
			opacity 0.35s ease,
			filter 0.3s ease;
		pointer-events: none;
	}
	.film-frame img.img-loaded {
		opacity: 1;
	}
	.strip-inner:hover .film-frame:hover img {
		filter: sepia(0%) contrast(1.1);
	}
	.frame-num {
		position: absolute;
		z-index: 2;
		bottom: 8px;
		left: 10px;
		font-family: var(--font-ui);
		font-size: 8px;
		font-weight: 300;
		letter-spacing: 0.25em;
		color: rgba(200, 192, 184, 0.5);
		pointer-events: none;
	}
	.film-frame::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
		opacity: 0.35;
		pointer-events: none;
		mix-blend-mode: overlay;
	}
	.strip-fade {
		position: absolute;
		z-index: 10;
		top: 0;
		bottom: 0;
		width: 120px;
		pointer-events: none;
	}
	.strip-fade-left {
		left: 0;
		background: linear-gradient(to right, var(--near-black), transparent);
	}
	.strip-fade-right {
		right: 0;
		background: linear-gradient(to left, var(--near-black), transparent);
	}
	@keyframes scroll-strip {
		to {
			transform: translateX(-50%);
		}
	}
	@media (max-width: 768px) {
		.strip-fade {
			width: 40px;
		}
		.film-frame {
			width: 280px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.strip-track {
			overflow-x: auto;
			overscroll-behavior-inline: contain;
		}
		.strip-inner {
			animation: none;
			transform: none;
			will-change: auto;
		}
		.duplicate-frame {
			display: none;
		}
	}
</style>
