<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let scrollY = $state(0);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	let parallaxOffset = $derived(scrollY * 0.35);
</script>

<svelte:window bind:scrollY />

<section class="hero" aria-label="Hero">
	<div
		class="hero-bg"
		style="transform: translateY({parallaxOffset}px)"
	>
		<img
			src="/directr2/constants/bg.jpg"
			alt=""
			aria-hidden="true"
			fetchpriority="high"
			decoding="async"
		/>
		<div class="hero-overlay"></div>
	</div>

	<div class="hero-content" class:visible={mounted}>
		<p class="hero-eyebrow">Film &amp; Digital · Seattle</p>
		<h1 class="hero-headline">Moments<br /><em>in Light</em></h1>
		<p class="hero-sub">Photography by Alain Okou</p>
	</div>

	<div class="scroll-indicator" aria-hidden="true">
		<span class="scroll-line"></span>
		<span class="scroll-dot"></span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		height: 100vh;
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
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(14, 14, 14, 0.25) 0%,
			rgba(14, 14, 14, 0.5) 60%,
			rgba(14, 14, 14, 0.8) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 2;
		text-align: center;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.9s ease, transform 0.9s ease;
	}

	.hero-content.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-eyebrow {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 9px;
		font-weight: 300;
		letter-spacing: 0.45em;
		text-transform: uppercase;
		color: var(--text-dim, rgba(200, 192, 184, 0.55));
		margin: 0 0 1.5rem;
	}

	.hero-headline {
		font-family: var(--font-display, 'Cormorant Garamond', Georgia, serif);
		font-size: clamp(4rem, 9vw, 9rem);
		font-weight: 300;
		line-height: 0.95;
		letter-spacing: -0.01em;
		color: var(--warm-white, #f0ebe3);
		margin: 0 0 2rem;
	}

	.hero-headline em {
		font-style: italic;
		color: var(--gold, #b8936a);
	}

	.hero-sub {
		font-family: var(--font-ui, 'Josefin Sans', sans-serif);
		font-size: 10px;
		font-weight: 100;
		letter-spacing: 0.4em;
		text-transform: uppercase;
		color: var(--silver, #c8c0b8);
		margin: 0;
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
		height: 40px;
		background: linear-gradient(to bottom, transparent, var(--silver, #c8c0b8));
		animation: scroll-pulse 2s ease-in-out infinite;
	}

	.scroll-dot {
		display: block;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--gold, #b8936a);
		animation: scroll-pulse 2s ease-in-out infinite 0.3s;
	}

	@keyframes scroll-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-content {
			transition: none;
			opacity: 1;
			transform: none;
		}
		.scroll-line,
		.scroll-dot {
			animation: none;
			opacity: 0.6;
		}
		.hero-bg {
			transform: none !important;
		}
	}
</style>
