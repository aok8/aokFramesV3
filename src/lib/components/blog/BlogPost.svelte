<script lang="ts">
  import type { BlogPost } from '$lib/types/blog.js';

  let { post }: { post: BlogPost } = $props();

  let imgLoaded = $state(false);

  // Catches images already in the browser cache (complete before onload fires)
  function checkLoaded(node: HTMLImageElement) {
    if (node.complete && node.naturalHeight > 0) imgLoaded = true;
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
</script>

<a href="/blog/{encodeURIComponent(post.id)}" class="post-card" aria-label={post.title}>
  {#if post.image}
    <div class="card-image-wrap">
      <div class="card-shimmer" class:shimmer-done={imgLoaded}></div>
      <img
        src={post.image}
        alt={post.title}
        class="card-image"
        class:img-loaded={imgLoaded}
        loading="lazy"
        use:checkLoaded
        onload={() => { imgLoaded = true; }}
        onerror={() => { imgLoaded = true; }}
      />
    </div>
  {/if}

  <div class="card-body">
    <span class="card-label">{post.label}</span>
    <h2 class="card-title">{post.title}</h2>
    <p class="card-summary">{post.summary}</p>
    <div class="card-meta">
      <span>{post.author}</span>
      <span class="meta-sep">·</span>
      <time datetime={post.published}>{formatDate(post.published)}</time>
    </div>
  </div>
</a>

<style>
  .post-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(200, 192, 184, 0.08);
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.25s ease,
      background 0.25s ease;
    overflow: hidden;
  }

  .post-card:hover {
    border-color: rgba(200, 192, 184, 0.22);
    background: rgba(255, 255, 255, 0.04);
  }

  /* Image */
  .card-image-wrap {
    flex: 0 0 200px;
    width: 200px;
    max-height: 160px;
    overflow: hidden;
    position: relative;
  }

  /* Shimmer */
  .card-shimmer {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      90deg,
      #141414 0%,
      #1e1e1e 40%,
      #252525 50%,
      #1e1e1e 60%,
      #141414 100%
    );
    background-size: 200% 100%;
    animation: card-shimmer-sweep 1.6s ease-in-out infinite;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .card-shimmer.shimmer-done {
    opacity: 0;
  }

  @keyframes card-shimmer-sweep {
    0%   { background-position: 150% 0; }
    100% { background-position: -150% 0; }
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity 0.4s ease, transform 0.35s ease;
    position: relative;
    z-index: 2;
  }

  .card-image.img-loaded {
    opacity: 1;
  }

  .post-card:hover .card-image {
    transform: scale(1.04);
  }

  /* Body */
  .card-body {
    flex: 1;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    justify-content: center;
    min-width: 0;
  }

  /* Label */
  .card-label {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--forest-green);
  }

  /* Title */
  .card-title {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 300;
    line-height: 1.15;
    color: var(--warm-white);
    margin: 0;
    transition: color 0.2s ease;
  }

  .post-card:hover .card-title {
    color: var(--forest-green);
  }

  /* Summary */
  .card-summary {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 300;
    color: var(--text-dim);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.6;
  }

  /* Meta */
  .card-meta {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 300;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.2rem;
  }

  .meta-sep {
    opacity: 0.5;
  }

  /* Mobile: stack vertically */
  @media (max-width: 640px) {
    .post-card {
      flex-direction: column;
    }

    .card-image-wrap {
      flex: none;
      width: 100%;
      max-height: 200px;
    }

    .card-body {
      padding: 1rem 1.25rem;
    }

    .card-title {
      font-size: 1.5rem;
    }
  }
</style>
