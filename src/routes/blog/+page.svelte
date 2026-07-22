<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPostComponent from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
  import type { PageData } from './$types.js';
  import { onMount } from 'svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import { dev } from '$app/environment';
	import { logger } from '$lib/utils/logger.js';
  import { initFadeUpReveal } from '$lib/utils/animations.js';

  // Type definition for Layout data
  type ExpectedLayoutData = {
    posts: BlogPostType[];
    r2Available: boolean;
    error?: string;
    layoutStatus?: 'skipped-post-load' | 'loaded' | 'api-fallback' | 'error';
  };

  let { data }: { data: PageData & ExpectedLayoutData } = $props();
  
  let isLoading = $state(false);
  let loadError = $state(false);
  let loadedPostsFromClient = $state<BlogPostType[]>([]);
  
  logger.log('Blog page data from layout:', data);
  logger.log('Blog posts from layout:', data.posts);
  logger.log('Layout status:', data.layoutStatus);
  
  onMount(async () => {
    const layoutSkipped = data.layoutStatus === 'skipped-post-load';

    if (layoutSkipped || (!dev && data.posts.length === 0)) {
      // Fallback path when the server-side layout load didn't return posts.
      // This used to fetch each post's markdown directly from the
      // assets.aokframes.com CDN in the browser — a cross-origin request
      // the CDN doesn't send Access-Control-Allow-Origin for, so it failed
      // with a CORS error and left the page stuck with no posts. /api/blog-posts
      // already does the same R2 read server-side and returns JSON from our
      // own origin, so it's never subject to CORS regardless of when this runs.
      logger.log('Attempting client-side fetch via /api/blog-posts (layout skipped or prod fallback)');
      isLoading = true;
      try {
        const response = await fetch('/api/blog-posts', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          const loadedPosts: BlogPostType[] = await response.json();
          logger.log(`Client fetch via /api/blog-posts returned ${loadedPosts.length} posts`);

          if (loadedPosts.length > 0) {
            loadedPostsFromClient = loadedPosts;
            posts.set(loadedPosts);

            try {
              sessionStorage.setItem('blogPosts', JSON.stringify(loadedPosts));
              logger.log('Stored posts in sessionStorage');
            } catch (storageError) {
              logger.error('Error storing posts in sessionStorage:', storageError);
            }
          } else {
            loadError = true;
            logger.error('Client fetch via /api/blog-posts returned 0 posts.');
          }
        } else {
          loadError = true;
          logger.error(`Client fetch for /api/blog-posts failed: ${response.status}`);
        }
      } catch (error) {
        logger.error('Error during client-side fetch via /api/blog-posts:', error);
        loadError = true;
      }
      isLoading = false;
    }
    
    // Handle initial population from layout data
    if (data.posts?.length > 0) {
      logger.log('Populating store from layout data');
      posts.set(data.posts);
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('blogPosts')) {
         try {
            sessionStorage.setItem('blogPosts', JSON.stringify(data.posts));
            logger.log('Stored layout posts in sessionStorage');
          } catch (storageError) {
             logger.error('Error storing layout posts in sessionStorage:', storageError);
          }
      }
    } else if (!layoutSkipped) {
      logger.log('Layout provided no posts, checking sessionStorage');
       if (typeof sessionStorage !== 'undefined') {
          try {
            const storedPostsJson = sessionStorage.getItem('blogPosts');
            if (storedPostsJson) {
              const storedPosts = JSON.parse(storedPostsJson);
              if (storedPosts.length > 0) {
                  logger.log('Restoring posts from sessionStorage');
                  posts.set(storedPosts);
              }
            }
          } catch (e) {
            logger.error('Error reading from sessionStorage', e);
          }
       }
    }

    // Reveal post cards after all data loading settles
    await Promise.resolve();
    initFadeUpReveal('.post-card', { stagger: 0.07, duration: 0.65, y: 18 });
  });
</script>

<svelte:head>
  <title>Journal — AOKFrames</title>
  <meta name="description" content="Writing on photography, film, and the process behind the work — by Alain Kouassi." />
  <meta property="og:title" content="Journal — AOKFrames" />
  <meta property="og:description" content="Writing on photography, film, and the process behind the work — by Alain Kouassi." />
  <meta property="og:url" content="https://aokframes.com/blog" />
</svelte:head>

<div class="journal-page">
  <Navbar />

  <main class="journal-main">
    <div class="journal-wrapper">

      <header class="journal-header">
        <h1 class="journal-title">Journal</h1>
        <p class="journal-subtitle">Light, shadow, and the moments between</p>
      </header>

      {#if isLoading}
        <div class="state-block">
          <div class="loading-ring"></div>
          <span class="state-text">Loading…</span>
        </div>
      {:else if $posts && $posts.length > 0}
        <div class="posts-list">
          {#each $posts as post (post.id)}
            <BlogPostComponent {post} />
          {/each}
        </div>
      {:else if loadError}
        <p class="state-text state-error">Failed to load posts.</p>
      {:else}
        <p class="state-text">No posts yet.</p>
      {/if}

    </div>
  </main>

  <Footer />
</div>

<style>
  .journal-page {
    min-height: 100vh;
    background-color: var(--near-black);
    color: var(--warm-white);
    display: flex;
    flex-direction: column;
  }

  .journal-main {
    flex: 1;
    padding-top: 7rem;
    padding-bottom: 5rem;
  }

  .journal-wrapper {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  /* Header */
  .journal-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .journal-title {
    font-family: var(--font-display);
    font-size: clamp(3rem, 6vw, 5.5rem);
    font-weight: 300;
    font-style: italic;
    color: var(--warm-white);
    letter-spacing: 0.02em;
    margin: 0 0 0.75rem;
    line-height: 1;
  }

  .journal-subtitle {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 300;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(200, 192, 184, 0.85);
    margin: 0;
  }

  /* Posts list */
  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid rgba(200, 192, 184, 0.08);
  }

  /* Loading / state */
  .state-block {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 5rem 0;
  }

  .loading-ring {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid rgba(200, 192, 184, 0.2);
    border-top-color: var(--silver);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }

  .state-text {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 300;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-dim);
    text-align: center;
    padding: 4rem 0;
  }

  .state-error {
    color: rgba(220, 80, 80, 0.7);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .journal-main {
      padding-top: 5rem;
      padding-bottom: 3rem;
    }

    .journal-header {
      margin-bottom: 2.5rem;
    }
  }
</style> 