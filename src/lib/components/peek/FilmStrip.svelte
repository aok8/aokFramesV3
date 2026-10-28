<script lang="ts">
	import { onMount } from 'svelte';
	import type { PeekImage } from '$lib/types/peek.js';

	let {
		images = [],
		speed = 40,
		height = 260,
		onopen
	}: {
		images: PeekImage[];
		/** Seconds for the strip to advance one full roll. */
		speed?: number;
		height?: number;
		/** Called with the frame index when a frame is clicked / activated. */
		onopen?: (index: number) => void;
	} = $props();

	// Enough copies of the roll that the strip never runs out of film on wide screens.
	// Server render uses 2; the client raises it after measuring.
	let copies = $state(2);
	const total = $derived(images.length * copies);
	const frames = $derived(Array.from({ length: total }, (_, i) => images[i % images.length]));

	let imgLoaded = $state<boolean[]>([]);
	$effect(() => {
		imgLoaded = new Array(total).fill(false);
	});

	function checkLoaded(node: HTMLImageElement, index: number) {
		if (node.complete && node.naturalHeight > 0) imgLoaded[index] = true;
	}

	function imageAlt(image: PeekImage, index: number) {
		return image.alt?.trim() || `Recently processed photograph ${index + 1}`;
	}

	// ── Motion state (not reactive — updated every frame) ──────────────────────
	let trackEl: HTMLElement | undefined = $state();
	let innerEl: HTMLElement | undefined = $state();

	let reduced = $state(false);
	let userPaused = $state(false);
	let hovering = false;
	let focused = false;
	let dragging = false;
	let visible = true;
	let docVisible = true;

	let offset = 0; // px the film has advanced, wrapped to [0, setWidth)
	let velocity = 0; // current px/s, eased toward the target
	let frameW = 340;
	let setWidth = 0;
	let trackW = 0;
	let seekTarget: number | null = null;

	let rafId = 0;
	let last = 0;
	let dragMoved = 0;
	let dragLastX = 0;
	let dragLastT = 0;
	let suppressClick = false;

	const baseVelocity = () => (setWidth && speed ? setWidth / speed : 0);
	const targetVelocity = () =>
		userPaused || hovering || focused || dragging || seekTarget !== null ? 0 : baseVelocity();
	const running = () => !reduced && visible && docVisible && images.length > 0;

	function wrap(n: number) {
		return setWidth ? ((n % setWidth) + setWidth) % setWidth : 0;
	}

	function paint() {
		if (!innerEl) return;
		innerEl.style.transform = `translate3d(${-offset}px,0,0)`;
		// Frames near the middle of the viewport are "exposed"; the edges sink into the dark.
		const half = trackW / 2 || 1;
		const kids = innerEl.querySelectorAll<HTMLElement>('.film-frame');
		for (let i = 0; i < kids.length; i++) {
			const cx = i * frameW + frameW / 2 - offset;
			if (cx < -frameW || cx > trackW + frameW) continue;
			const d = Math.min(1, Math.abs(cx - half) / half);
			kids[i].style.setProperty('--lit', (1 - 0.45 * d * d).toFixed(3));
		}
	}

	function tick(now: number) {
		rafId = 0;
		if (!running()) return;
		const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
		last = now;

		if (!dragging) {
			if (seekTarget !== null) {
				let diff = seekTarget - offset;
				// Take the short way round the loop.
				if (diff > setWidth / 2) diff -= setWidth;
				if (diff < -setWidth / 2) diff += setWidth;
				offset = wrap(offset + diff * (1 - Math.exp(-dt * 7)));
				velocity = 0;
				if (Math.abs(diff) < 0.5) seekTarget = null;
			} else {
				// Ease toward the target so hover/pause feel like a hand on the reel, not a brick wall.
				velocity += (targetVelocity() - velocity) * (1 - Math.exp(-dt * 5));
				offset = wrap(offset + velocity * dt);
			}
		}
		paint();

		const settled = Math.abs(velocity - targetVelocity()) < 0.05 && seekTarget === null && !dragging;
		if (settled && targetVelocity() === 0) return; // fully stopped: sleep until something wakes us
		rafId = requestAnimationFrame(tick);
	}

	function wake() {
		if (rafId || !running()) return;
		last = performance.now();
		rafId = requestAnimationFrame(tick);
	}

	function measure() {
		if (!trackEl || !innerEl || images.length === 0) return;
		const frame = innerEl.querySelector<HTMLElement>('.film-frame');
		frameW = frame?.offsetWidth || frameW;
		trackW = trackEl.clientWidth;
		setWidth = frameW * images.length;
		const needed = Math.max(2, Math.ceil(trackW / setWidth) + 1);
		if (needed !== copies) copies = needed;
		offset = wrap(offset);
		paint();
		wake();
	}

	// ── Pointer: drag to scrub, flick for momentum ─────────────────────────────
	function onPointerDown(e: PointerEvent) {
		if (reduced || (e.pointerType === 'mouse' && e.button !== 0)) return;
		dragging = true;
		dragMoved = 0;
		dragLastX = e.clientX;
		dragLastT = performance.now();
		trackEl?.setPointerCapture(e.pointerId);
		wake();
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const now = performance.now();
		const dx = e.clientX - dragLastX;
		const dtMs = Math.max(1, now - dragLastT);
		dragMoved += Math.abs(dx);
		offset = wrap(offset - dx);
		// Remember the release speed so a flick carries on, then eases back to cruising.
		velocity = velocity * 0.6 + (-dx / dtMs) * 1000 * 0.4;
		dragLastX = e.clientX;
		dragLastT = now;
		paint();
	}
	function onPointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		if (dragMoved > 6) suppressClick = true;
		if (trackEl?.hasPointerCapture(e.pointerId)) trackEl.releasePointerCapture(e.pointerId);
		wake();
	}

	function openFrame(i: number) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		onopen?.(i % images.length);
	}

	function onFrameFocus(i: number) {
		focused = true;
		if (reduced || !setWidth) return;
		// Glide the focused frame to the middle so keyboard users never lose it off-screen.
		seekTarget = wrap(i * frameW + frameW / 2 - trackW / 2);
		wake();
	}
	function onFrameBlur() {
		focused = false;
		wake();
	}

	function toggleMotion() {
		userPaused = !userPaused;
		wake();
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = mq.matches;
		const onMq = () => {
			reduced = mq.matches;
			if (reduced && innerEl) innerEl.style.transform = '';
			else measure();
		};
		mq.addEventListener('change', onMq);

		const ro = new ResizeObserver(measure);
		if (trackEl) ro.observe(trackEl);

		// Don't spend frames on film nobody can see.
		const io = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) wake();
		});
		if (trackEl) io.observe(trackEl);

		const onVis = () => {
			docVisible = !document.hidden;
			if (docVisible) wake();
		};
		document.addEventListener('visibilitychange', onVis);

		measure();

		return () => {
			cancelAnimationFrame(rafId);
			mq.removeEventListener('change', onMq);
			ro.disconnect();
			io.disconnect();
			document.removeEventListener('visibilitychange', onVis);
		};
	});

	// Re-measure when the number of copies changes the DOM.
	$effect(() => {
		void copies;
		queueMicrotask(measure);
	});
</script>

<section class="strip-section" aria-label="Current film roll">
	<div
		class="strip-track"
		class:is-reduced={reduced}
		bind:this={trackEl}
		role="presentation"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onmouseenter={() => ((hovering = true), wake())}
		onmouseleave={() => ((hovering = false), wake())}
	>
		<div class="strip-fade strip-fade-left"></div>
		<div class="strip-fade strip-fade-right"></div>
		<div class="strip-inner" bind:this={innerEl} style:--frame-height={`${height}px`}>
			<div class="frames-row">
				{#each frames as image, i}
					{@const dup = i >= images.length}
					<button
						type="button"
						class="film-frame"
						class:duplicate-frame={dup}
						aria-hidden={dup}
						tabindex={dup ? -1 : 0}
						aria-label={dup ? undefined : `Open frame ${i + 1}: ${imageAlt(image, i)}`}
						onclick={() => openFrame(i)}
						onfocus={() => onFrameFocus(i)}
						onblur={onFrameBlur}
					>
						<span class="frame-shimmer" class:shimmer-done={imgLoaded[i]}></span>
						<img
							src={image.url}
							alt=""
							loading="eager"
							decoding="async"
							draggable="false"
							fetchpriority={i === 0 ? 'high' : 'auto'}
							class:img-loaded={imgLoaded[i]}
							use:checkLoaded={i}
							onload={() => (imgLoaded[i] = true)}
							onerror={() => (imgLoaded[i] = true)}
						/>
						<span class="frame-num" aria-hidden="true"
							>{String((i % images.length) + 1).padStart(2, '0')}</span
						>
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if !reduced}
		<button
			type="button"
			class="strip-toggle"
			onclick={toggleMotion}
			aria-pressed={userPaused}
			aria-label={userPaused ? 'Play film strip' : 'Pause film strip'}
		>
			<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
				{#if userPaused}
					<path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
				{:else}
					<rect x="1.5" y="1" width="2.5" height="8" fill="currentColor" />
					<rect x="6" y="1" width="2.5" height="8" fill="currentColor" />
				{/if}
			</svg>
			<span>{userPaused ? 'Play' : 'Pause'}</span>
		</button>
	{/if}
</section>

<style>
	.strip-section {
		padding: 2rem 0 1rem;
		position: relative;
	}
	.strip-track {
		position: relative;
		overflow: hidden;
		background: #080808;
		cursor: grab;
		touch-action: pan-y;
		user-select: none;
	}
	.strip-track:active {
		cursor: grabbing;
	}
	.strip-inner {
		--frame-w: 340px;
		position: relative;
		display: inline-flex;
		padding-block: 20px;
		background: #050505;
		will-change: transform;
	}
	/* Sprocket holes: exactly 12 per frame so the pattern is seamless when the roll loops. */
	.strip-inner::before,
	.strip-inner::after {
		content: '';
		position: absolute;
		z-index: 2;
		left: 0;
		width: 100%;
		height: 20px;
		background-image: linear-gradient(
			90deg,
			transparent 0 27.5%,
			rgba(200, 192, 184, 0.22) 27.5% 31%,
			#0e0e0e 31% 69%,
			rgba(200, 192, 184, 0.22) 69% 72.5%,
			transparent 72.5% 100%
		);
		background-size: calc(var(--frame-w) / 12) 100%;
		background-repeat: repeat-x;
	}
	.strip-inner::before {
		top: 0;
	}
	.strip-inner::after {
		bottom: 0;
	}
	.frames-row {
		display: flex;
		align-items: stretch;
	}
	.film-frame {
		--lit: 1;
		position: relative;
		display: block;
		width: var(--frame-w);
		height: var(--frame-height);
		flex-shrink: 0;
		overflow: hidden;
		padding: 0;
		border: 0;
		border-right: 1px solid rgba(200, 192, 184, 0.04);
		background: #111;
		cursor: inherit;
	}
	.film-frame:focus-visible {
		outline-offset: -4px;
		z-index: 4;
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
		filter: sepia(6%) contrast(1.05) brightness(var(--lit));
		opacity: 0;
		transform: scale(1.04);
		transition:
			opacity 0.6s ease,
			transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
		pointer-events: none;
	}
	.film-frame img.img-loaded {
		opacity: 1;
		transform: scale(1);
	}
	@media (hover: hover) {
		.film-frame:hover img {
			transform: scale(1.03);
		}
	}
	.frame-num {
		position: absolute;
		z-index: 2;
		bottom: 8px;
		left: 10px;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 300;
		letter-spacing: 0.25em;
		color: rgba(240, 235, 227, 0.75);
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
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

	.strip-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0.75rem 5vw 0 auto;
		padding: 12px 8px;
		font-family: var(--font-ui);
		font-size: 11px;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(200, 192, 184, 0.75);
		transition: color 0.2s ease;
	}
	.strip-toggle:hover {
		color: var(--warm-white);
	}

	@media (max-width: 768px) {
		.strip-inner {
			--frame-w: 280px;
		}
		.strip-fade {
			width: 40px;
		}
	}

	/* Reduced motion: no autoplay. The roll becomes a plain scrollable strip. */
	.strip-track.is-reduced {
		overflow-x: auto;
		overscroll-behavior-inline: contain;
		cursor: auto;
	}
	.strip-track.is-reduced .strip-inner {
		will-change: auto;
	}
	.strip-track.is-reduced .duplicate-frame {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.strip-track {
			overflow-x: auto;
			cursor: auto;
		}
		.duplicate-frame {
			display: none;
		}
		.film-frame img {
			transition: opacity 0.3s ease;
			transform: none;
		}
	}
</style>
