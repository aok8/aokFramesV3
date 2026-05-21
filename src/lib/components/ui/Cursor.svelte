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

		function onMouseMove(e: MouseEvent) {
			x = e.clientX;
			y = e.clientY;
			if (!visible) visible = true;
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

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseover', onMouseOver);
		document.addEventListener('mouseout', onMouseOut);

		return () => {
			document.documentElement.classList.remove('custom-cursor');
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseover', onMouseOver);
			document.removeEventListener('mouseout', onMouseOut);
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
	/* Force cursor: none on everything when custom cursor is active.
	   Without !important, browser UA cursor: pointer on a/button wins. */
	:global(.custom-cursor),
	:global(.custom-cursor) * {
		cursor: none !important;
	}

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
		opacity: 0;
		transition:
			width 0.25s ease,
			height 0.25s ease,
			background 0.25s ease,
			border 0.25s ease,
			transform 0.08s linear,
			opacity 0.3s;
		will-change: transform;
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
