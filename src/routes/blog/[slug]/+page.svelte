<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import { assetUrl } from '$lib/utils/r2.js';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import { theme } from '../../../theme/theme.js';
  import { marked } from 'marked';

  export let data: { post: BlogPostType };

  // Get tertiary color for inline style
  $: tertiaryColor = theme.tertiary;

  // Render markdown content to HTML, rewriting relative img srcs to CDN URLs
  $: htmlContent = (() => {
    if (!data.post?.content) return '';
    const raw = marked.parse(data.post.content, { gfm: true, breaks: true, async: false }) as string;
    // Any src that isn't absolute (http/https// /data:) belongs to this post's R2 folder
    const withCdn = raw.replace(
      /(<img[^>]+src=")(?!https?:\/\/|\/\/|\/|data:)([^"]+)(")/gi,
      (_, pre, src, post) => `${pre}${assetUrl(`blog/posts/${data.post.id}/${src}`)}${post}`
    );
    // Strip the leading <h1> — the title is already rendered above as .post-title
    return withCdn.replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  })();
</script>

<svelte:head>
  <title>{data.post.title} — AOKFrames</title>
  <meta name="description" content={data.post.summary ?? `${data.post.title} — AOKFrames Journal`} />
  <meta property="og:title" content="{data.post.title} — AOKFrames" />
  <meta property="og:description" content={data.post.summary ?? `${data.post.title} — AOKFrames Journal`} />
  <meta property="og:url" content="https://aokframes.com/blog/{data.post.id}" />
  <meta property="og:image" content="https://assets.aokframes.com/blog/posts/{data.post.id}/header.webp" />
  <meta name="twitter:title" content="{data.post.title} — AOKFrames" />
  <meta name="twitter:image" content="https://assets.aokframes.com/blog/posts/{data.post.id}/header.webp" />
</svelte:head>

<div class="post-page">
  <Navbar />

  <main class="post-main">

    <!-- Back nav -->
    <div class="post-nav-bar">
      <div class="post-nav-inner">
        <a href="/blog" class="back-link">← Journal</a>
      </div>
    </div>

    <!-- Hero image -->
    <div class="post-hero">
      <img
        src={assetUrl(`blog/posts/${data.post.id}/header.webp`)}
        alt={data.post.title}
        class="post-hero-img"
        loading="eager"
      />
      <div class="post-hero-overlay"></div>
    </div>

    <!-- Article -->
    <div class="post-article-wrap">
      <article class="post-article">

        <!-- Meta above title -->
        <div class="post-meta">
          <span class="post-label">{data.post.label}</span>
          <span class="meta-sep">·</span>
          <span class="post-author">{data.post.author}</span>
          <span class="meta-sep">·</span>
          <time class="post-date" datetime={data.post.published}>
            {new Date(data.post.published).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </div>

        <h1 class="post-title">{data.post.title}</h1>

        <!-- Prose content -->
        <div class="post-prose">
          {@html htmlContent}
        </div>

      </article>
    </div>

  </main>

  <Footer />
</div>

<style>
  .post-page {
    min-height: 100vh;
    background-color: var(--near-black);
    color: var(--warm-white);
    display: flex;
    flex-direction: column;
  }

  .post-main {
    flex: 1;
    padding-top: 4.5rem; /* navbar offset */
  }

  /* Back nav */
  .post-nav-bar {
    padding: 1.25rem 0 0;
  }

  .post-nav-inner {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .back-link {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 300;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--text-dim);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .back-link:hover {
    color: var(--silver);
  }

  /* Hero */
  .post-hero {
    position: relative;
    width: 100%;
    max-height: 520px;
    overflow: hidden;
    margin-top: 1.5rem;
  }

  .post-hero-img {
    width: 100%;
    height: 520px;
    object-fit: cover;
    display: block;
  }

  .post-hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 40%,
      rgba(14, 14, 14, 0.7) 100%
    );
  }

  /* Article wrap */
  .post-article-wrap {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 1.5rem 5rem;
  }

  .post-article {
    padding-top: 2.5rem;
  }

  /* Meta */
  .post-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .post-label {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--forest-green);
  }

  .post-author,
  .post-date {
    font-family: var(--font-ui);
    font-size: 9px;
    font-weight: 300;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .meta-sep {
    color: var(--text-dim);
    opacity: 0.4;
    font-size: 9px;
  }

  /* Title */
  .post-title {
    font-family: var(--font-display);
    font-size: clamp(2.2rem, 5vw, 4rem);
    font-weight: 300;
    line-height: 1.1;
    color: var(--warm-white);
    margin: 0 0 2.5rem;
  }

  /* Prose */
  .post-prose {
    font-family: var(--font-display);
    font-size: 1.1rem;
    line-height: 1.85;
    color: var(--warm-white);
  }

  .post-prose :global(h1),
  .post-prose :global(h2),
  .post-prose :global(h3),
  .post-prose :global(h4) {
    font-family: var(--font-display);
    font-weight: 300;
    color: var(--warm-white);
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    line-height: 1.2;
  }

  .post-prose :global(h1) { font-size: 2rem; }
  .post-prose :global(h2) { font-size: 1.65rem; }
  .post-prose :global(h3) { font-size: 1.35rem; }
  .post-prose :global(h4) { font-size: 1.1rem; font-style: italic; }

  .post-prose :global(p) {
    margin: 0 0 1.5rem;
  }

  .post-prose :global(a) {
    color: var(--forest-green);
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 0.2s ease;
  }

  .post-prose :global(a:hover) {
    color: var(--warm-white);
  }

  .post-prose :global(img) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 2rem auto;
    border: 1px solid rgba(200, 192, 184, 0.1);
  }

  .post-prose :global(blockquote) {
    border-left: 2px solid var(--forest-green);
    margin: 2rem 0;
    padding: 0.5rem 0 0.5rem 1.5rem;
    color: var(--silver);
    font-style: italic;
  }

  .post-prose :global(pre) {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(200, 192, 184, 0.1);
    padding: 1.25rem;
    overflow-x: auto;
    font-size: 0.85rem;
    line-height: 1.6;
    margin: 2rem 0;
  }

  .post-prose :global(code) {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.15em 0.4em;
    font-size: 0.88em;
    color: var(--silver);
    border-radius: 2px;
  }

  .post-prose :global(ul),
  .post-prose :global(ol) {
    padding-left: 1.75rem;
    margin-bottom: 1.5rem;
  }

  .post-prose :global(li) {
    margin-bottom: 0.4rem;
  }

  .post-prose :global(hr) {
    border: none;
    border-top: 1px solid rgba(200, 192, 184, 0.12);
    margin: 3rem 0;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .post-hero-img {
      height: 260px;
    }

    .post-hero {
      max-height: 260px;
    }

    .post-article {
      padding-top: 1.75rem;
    }

    .post-title {
      margin-bottom: 1.75rem;
    }

    .post-prose {
      font-size: 1rem;
    }
  }
</style> 