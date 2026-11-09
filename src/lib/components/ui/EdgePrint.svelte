<script lang="ts">
	import type { FilmMeta } from '$lib/utils/filmMeta.js';

	let { meta }: { meta: FilmMeta } = $props();

	const parts = $derived(
		[meta.stock, meta.camera, meta.date, meta.frame ? `Fr. ${meta.frame}` : undefined].filter(
			(part): part is string => Boolean(part)
		)
	);
</script>

<!-- A photo's film data, printed on a strip of base like the markings on a negative -->
{#if meta.digital}
	<span class="edge digital">Digital</span>
{:else}
	<span class="edge" class:bw={meta.bw}>
		<span class="arrow" aria-hidden="true"></span>
		{#each parts as part, i}
			{#if i > 0}<span aria-hidden="true">·</span>{/if}
			<span>{part}</span>
		{/each}
	</span>
{/if}

<style>
	/* Colour stocks sit on the amber base used on Peek; black-and-white stocks on a silver base. */
	.edge {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.55em;
		padding: 6px 10px 5px;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #240f03;
		background: #b4632a;
	}

	.edge.bw {
		color: #1a1816;
		background: #b9b3aa;
	}

	/* Digital files aren't film, so no film base: just a quiet outlined label */
	.edge.digital {
		color: rgba(200, 192, 184, 0.85);
		background: transparent;
		box-shadow: inset 0 0 0 1px rgba(200, 192, 184, 0.35);
	}

	.arrow {
		width: 0;
		height: 0;
		border-block: 4px solid transparent;
		border-left: 6px solid currentColor;
	}
</style>
