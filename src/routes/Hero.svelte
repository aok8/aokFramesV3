<script lang="ts">
	import { onMount } from 'svelte';
	import { assetUrl } from '$lib/utils/r2.js';

	let bgEl: HTMLDivElement | undefined = $state();

	// Parallax runs outside Svelte reactivity: one rAF-throttled transform write per scroll frame,
	// and nothing at all once the hero has left the screen.
	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let ticking = false;
		const update = () => {
			ticking = false;
			const y = window.scrollY;
			if (bgEl && y < window.innerHeight * 1.2) bgEl.style.transform = `translate3d(0, ${y * 0.35}px, 0)`;
		};
		const onScroll = () => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<section class="hero" aria-label="Hero">
	<div class="hero-bg" bind:this={bgEl}>
		<img
			src={assetUrl('constants/w1920/bg.webp')}
			srcset="{assetUrl('constants/w1024/bg.webp')} 1024w, {assetUrl('constants/w1920/bg.webp')} 1920w, {assetUrl('constants/w3000/bg.webp')} 3000w"
			sizes="100vw"
			alt=""
			aria-hidden="true"
			fetchpriority="high"
			decoding="async"
		/>
		<div class="hero-overlay"></div>
	</div>

	<div class="hero-content">
		<h1 class="hero-headline enter" style="--enter-delay: 250ms">Moments{' '}<br aria-hidden="true" /><em>in Light</em></h1>
		<p class="hero-sub enter" style="--enter-delay: 600ms">Film &amp; digital photography by Alain Kouassi</p>
		<a class="hero-cta enter" style="--enter-delay: 800ms" href="/works">View works</a>
	</div>

	<div class="scroll-indicator" aria-hidden="true">
		<span class="scroll-line"></span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		height: 100vh;
		height: 100svh;
		min-height: 600px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero-bg {
		position: absolute;
		inset: -15% 0 -15% 0;
		will-change: transform;
	}

	.hero-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		animation: hero-settle 2.6s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes hero-settle {
		from { transform: scale(1.07); opacity: 0.7; }
		to   { transform: scale(1);    opacity: 1; }
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(14, 14, 14, 0.45) 0%,
			rgba(14, 14, 14, 0.6) 55%,
			rgba(14, 14, 14, 0.85) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 2;
		text-align: center;
		padding: 0 1.5rem;
	}

	.hero-headline {
		font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
		font-size: clamp(4rem, 9vw, 9rem);
		font-weight: 300;
		line-height: 0.95;
		letter-spacing: -0.01em;
		color: var(--warm-white, #f0ebe3);
		margin: 0 0 2rem;
		text-shadow: 0 2px 24px rgba(14, 14, 14, 0.55);
	}

	.hero-headline em {
		font-style: italic;
		color: var(--green-lit, #86ad93);
		text-shadow: 0 2px 20px rgba(14, 14, 14, 0.6);
	}

	.hero-sub {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 13px;
		font-weight: 300;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: var(--warm-white, #f0ebe3);
		margin: 0 0 2.5rem;
		text-shadow: 0 1px 12px rgba(14, 14, 14, 0.7);
	}

	.hero-cta {
		display: inline-block;
		padding: 14px 28px;
		border: 1px solid var(--warm-white, #f0ebe3);
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 12px;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		color: var(--warm-white, #f0ebe3);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.hero-cta:hover {
		background: var(--warm-white, #f0ebe3);
		color: var(--near-black, #0e0e0e);
	}

	/* Scroll indicator */
	.scroll-indicator {
		position: absolute;
		bottom: 2.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		z-index: 2;
	}

	.scroll-line {
		display: block;
		width: 1px;
		height: 48px;
		background: var(--silver, #c8c0b8);
		transform-origin: top;
		animation: scroll-draw 2.6s cubic-bezier(0.65, 0, 0.35, 1) 1.6s infinite;
	}

	@keyframes scroll-draw {
		0%   { transform: scaleY(0); transform-origin: top; opacity: 0.8; }
		45%  { transform: scaleY(1); transform-origin: top; opacity: 0.8; }
		55%  { transform: scaleY(1); transform-origin: bottom; opacity: 0.8; }
		100% { transform: scaleY(0); transform-origin: bottom; opacity: 0.8; }
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-line {
			animation: none;
			transform: none;
			opacity: 0.6;
		}
		.hero-bg img {
			animation: none;
		}
		.hero-bg {
			transform: none !important;
		}
	}
</style>
