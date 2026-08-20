<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let x = $state(0);
	let y = $state(0);
	let isHovering = $state(false);
	let visible = $state(false);
	let enabled = $state(false);

	onMount(() => {
		if (!browser) return;

		if (window.matchMedia('(hover: none)').matches) {
			return;
		}

		enabled = true;
		// Class-based approach ensures cursor: none wins over pointer on a/button
		document.documentElement.classList.add('custom-cursor');

		let latestX = 0;
		let latestY = 0;
		let rafId: number | null = null;

		function scheduleUpdate() {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				x = latestX;
				y = latestY;
				if (!visible) visible = true;
				rafId = null;
			});
		}

		function onMouseMove(e: MouseEvent) {
			latestX = e.clientX;
			latestY = e.clientY;
			scheduleUpdate();
		}

		function onMouseOver(e: MouseEvent) {
			const target = e.target as Element | null;
			if (target && (target.closest('a') || target.closest('button') || target.closest('img'))) {
				isHovering = true;
			}
		}

		function onMouseOut(e: MouseEvent) {
			const target = e.target as Element | null;
			if (target && (target.closest('a') || target.closest('button') || target.closest('img'))) {
				const relatedTarget = e.relatedTarget as Element | null;
				if (!relatedTarget || (
					!relatedTarget.closest('a') &&
					!relatedTarget.closest('button') &&
					!relatedTarget.closest('img')
				)) {
					isHovering = false;
				}
			}
		}

		document.addEventListener('mousemove', onMouseMove, { passive: true });
		document.addEventListener('mouseover', onMouseOver, { passive: true });
		document.addEventListener('mouseout', onMouseOut, { passive: true });

		return () => {
			document.documentElement.classList.remove('custom-cursor');
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseover', onMouseOver);
			document.removeEventListener('mouseout', onMouseOut);
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	});
</script>

{#if enabled}
	<div
		class="cursor"
		class:hovering={isHovering}
		class:visible
		style="transform: translate({x}px, {y}px) translate(-50%, -50%)"
	></div>
{/if}

<style>
	.cursor {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 9999;
		pointer-events: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--warm-white);
		border: 1.5px solid transparent;
		mix-blend-mode: difference;
		/* isolate gives this fixed + blended element its own stacking context,
		   mitigating a Safari-specific stacking-context bug for position:fixed
		   elements using mix-blend-mode. */
		isolation: isolate;
		opacity: 0;
		/* transform is intentionally NOT transitioned here: position updates are
		   now rAF-throttled in script, and a CSS transition racing the same
		   property causes visible stutter in Safari (two competing timing
		   systems fighting over transform). */
		transition:
			width 0.25s ease,
			height 0.25s ease,
			background 0.25s ease,
			border 0.25s ease,
			opacity 0.3s;
		/* will-change: transform removed — combined with mix-blend-mode it forces
		   a persistent compositing layer that Safari must continuously
		   re-blend against the backdrop every frame, worsening jank rather
		   than helping. */
	}

	.cursor.visible {
		opacity: 1;
	}

	.cursor.hovering {
		width: 38px;
		height: 38px;
		background: transparent;
		border: 1.5px solid var(--warm-white);
	}
</style>
