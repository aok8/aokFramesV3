<script lang="ts">
  import type { PeekImage } from '$lib/types/peek';

  let {
    images = [],
    ghost = false,
    direction = 'forward',
    speed = 40,
    height = 260
  }: {
    images: PeekImage[];
    ghost?: boolean;
    direction?: 'forward' | 'reverse';
    speed?: number;
    height?: number;
  } = $props();

  const HOLES_PER_FRAME = 17;
  const GHOST_FRAMES = 12;

  const doubled = $derived(ghost ? [] : [...images, ...images]);
  const frameCount = $derived(ghost ? GHOST_FRAMES * 2 : doubled.length);
  const perfHoles = $derived(Array(HOLES_PER_FRAME * frameCount).fill(0));

  // Track loaded state per frame — resets whenever the image list changes
  let imgLoaded = $state<boolean[]>([]);

  $effect(() => {
    imgLoaded = new Array(doubled.length).fill(false);
  });

  // Svelte action — catches images that are already cached (complete before onload fires)
  function checkLoaded(node: HTMLImageElement, idx: number) {
    if (node.complete && node.naturalHeight > 0) {
      imgLoaded[idx] = true;
    }
  }
</script>

<section class="strip-section">
  <div class="strip-track">
    <div class="strip-fade-left"></div>
    <div class="strip-fade-right"></div>
    <div
      class="strip-inner"
      style="animation-duration: {speed}s; animation-direction: {direction === 'reverse' ? 'reverse' : 'normal'};"
    >
      <!-- Top perf row -->
      <div class="perf-row">
        {#each perfHoles as _}
          <span class="perf-hole"></span>
        {/each}
      </div>

      <!-- Frames -->
      <div class="frames-row">
        {#if ghost}
          {#each Array(GHOST_FRAMES * 2) as _, i}
            <div class="film-frame ghost-frame" style="height: {height}px;">
              <div class="ghost-panel"></div>
              <span class="frame-num">{String((i % GHOST_FRAMES) + 1).padStart(2, '0')}</span>
            </div>
          {/each}
        {:else}
          {#each doubled as image, i}
            <div class="film-frame" style="height: {height}px;">
              <div class="frame-shimmer" class:shimmer-done={imgLoaded[i]}></div>
              <img
                src={image.url}
                alt=""
                loading={i < 4 ? 'eager' : 'lazy'}
                class:img-loaded={imgLoaded[i]}
                use:checkLoaded={i}
                onload={() => { imgLoaded[i] = true; }}
                onerror={() => { imgLoaded[i] = true; }}
              />
              <span class="frame-num">{String((i % images.length) + 1).padStart(2, '0')}</span>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Bottom perf row -->
      <div class="perf-row">
        {#each perfHoles as _}
          <span class="perf-hole"></span>
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
    display: inline-flex;
    flex-direction: column;
    animation: scroll-strip linear infinite;
    will-change: transform;
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
    flex-shrink: 0;
    overflow: hidden;
    border-right: 1px solid rgba(200, 192, 184, 0.04);
    background: #111;
  }

  /* Shimmer placeholder — sits above the dark frame bg, below the grain */
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
    animation: shimmer-sweep 1.6s ease-in-out infinite;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }

  .frame-shimmer.shimmer-done {
    opacity: 0;
  }

  @keyframes shimmer-sweep {
    0%   { background-position: 150% 0; }
    100% { background-position: -150% 0; }
  }

  .film-frame img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: sepia(6%) contrast(1.05);
    opacity: 0;
    transition: opacity 0.5s ease, filter 0.4s ease;
    pointer-events: none;
  }

  .film-frame img.img-loaded {
    opacity: 1;
  }

  .strip-inner:hover .film-frame:hover img {
    filter: sepia(0%) contrast(1.1);
  }

  .ghost-frame .ghost-panel {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(200, 192, 184, 0.07);
    background: transparent;
  }

  .frame-num {
    position: absolute;
    bottom: 8px;
    left: 10px;
    font-family: var(--font-ui);
    font-size: 8px;
    font-weight: 300;
    letter-spacing: 0.25em;
    color: rgba(200, 192, 184, 0.4);
    pointer-events: none;
    z-index: 2;
  }

  /* Grain overlay */
  .film-frame::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.35;
    pointer-events: none;
    mix-blend-mode: overlay;
    z-index: 1;
  }

  /* Perf rows */
  .perf-row {
    display: flex;
    align-items: center;
    height: 20px;
    background: #050505;
    flex-shrink: 0;
  }

  .perf-hole {
    display: inline-block;
    width: 12px;
    height: 14px;
    border: 1px solid rgba(200, 192, 184, 0.22);
    border-radius: 2px;
    flex-shrink: 0;
    background: #0e0e0e;
    margin: 0 8px 0 0;
  }

  /* Fade edges */
  .strip-fade-left,
  .strip-fade-right {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 120px;
    z-index: 10;
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
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
</style>
