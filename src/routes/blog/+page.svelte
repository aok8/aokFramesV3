<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPostComponent from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
  import { assetUrl } from '$lib/utils/r2.js';
  import { theme } from '../../theme/theme.js';
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

  // Frontmatter parser for browser
  function parseFrontmatter(content: string) {
    const lines = content.split('\n');
    const frontmatter: Record<string, string> = {};
    let inFrontmatter = false;
    let markdownContent = '';
    let frontmatterLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          inFrontmatter = false;
          markdownContent = lines.slice(i + 1).join('\n');
          break;
        }
      }
      if (inFrontmatter) {
        frontmatterLines.push(line);
      }
    }

    // Parse frontmatter lines
    for (const line of frontmatterLines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    }

    return { data: frontmatter, content: markdownContent };
  }

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
      logger.log('Attempting client-side R2 fetch (layout skipped or prod fallback)');
      isLoading = true;
      try {
        const statusRes = await fetch('/api/blog-status', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          logger.log('Client R2 Load: Blog R2 status:', statusData);

          // Extract unique slugs containing index.md from statusData
          const slugs = new Set<string>();
          statusData.blogPosts?.items?.forEach((item: { key: string }) => {
              if (item.key.toLowerCase().endsWith('/index.md')) {
                  const parts = item.key.split('/');
                  if (parts.length >= 4) slugs.add(parts[parts.length - 2]);
              }
          });
          const uniqueSlugs = Array.from(slugs);
          logger.log('Client R2 Load: Found potential slugs:', uniqueSlugs);

          if (uniqueSlugs.length > 0) {
            logger.log('Client R2 Load: Attempting direct fetch...');
            const loadedPosts: BlogPostType[] = [];
            
            for (const slug of uniqueSlugs) {
              try {
                const key = `blog/posts/${slug}/index.md`;
                logger.log(`Client R2 Load: Fetching content for slug "${slug}" from ${key}`);

                const response = await fetch(assetUrl(key));
                if (response.ok) {
                  const text = await response.text();
                  logger.log(`Successfully loaded ${slug} directly`);
                  
                  const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
                  logger.log('Parsed frontmatter:', frontmatter);
                  
                  const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                  const title = titleMatch ? titleMatch[1] : slug;
                  
                  // Summary extraction
                  const lines = markdownContent.split('\n');
                  let summary = '';
                  let foundTitle = false;
                  let titleIndex = -1;

                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().startsWith('# ')) {
                       foundTitle = true;
                       titleIndex = i;
                       break;
                    }
                  }
                  
                  if (foundTitle) {
                      for (let i = titleIndex + 1; i < lines.length; i++) {
                          const line = lines[i].trim();
                          if (line === '') continue;
                          
                          if (line.startsWith('#')) {
                              logger.log(`Skipping summary for "${title}" because next content is a heading: ${line}`);
                              break;
                          } else {
                              summary = line;
                              logger.log(`Extracted summary for "${title}": ${summary.substring(0, 50)}...`);
                              break;
                          }
                      }
                  }
                  
                  const tags = frontmatter.tags || frontmatter.label || 'Photography';
                  logger.log('Extracted tags:', tags);
                  
                  // Check for header.webp
                  const imageKey = `blog/posts/${slug}/header.webp`;
                  let imageExists = false;
                  try {
                      const imgRes = await fetch(assetUrl(imageKey), { method: 'HEAD' });
                      imageExists = imgRes.ok;
                      logger.log(`Client R2 Load: Image check for ${imageKey}: ${imageExists}`);
                  } catch (imgErr) {
                      logger.warn(`Client R2 Load: Image check failed for ${imageKey}`, imgErr);
                  }
                  
                  loadedPosts.push({
                    id: slug,
                    title,
                    summary,
                    content: markdownContent,
                    author: frontmatter.author || 'AOK',
                    published: frontmatter.published || new Date().toISOString().split('T')[0],
                    label: tags,
                    image: imageExists ? assetUrl(imageKey) : undefined
                  });
                } else {
                    logger.error(`Client R2 Load: Failed to fetch ${key}: ${response.status}`);
                }
              } catch (e) {
                 logger.error(`Client R2 Load: Error loading post for slug "${slug}":`, e);
              }
            }
            
            if (loadedPosts.length > 0) {
              logger.log('Directly loaded posts from R2:', loadedPosts);
              loadedPostsFromClient = loadedPosts;
              posts.set(loadedPosts);
              
              try {
                sessionStorage.setItem('blogPosts', JSON.stringify(loadedPosts));
                logger.log('Stored R2 loaded posts in sessionStorage');
              } catch (storageError) {
                logger.error('Error storing R2 posts in sessionStorage:', storageError);
              }
            } else {
              loadError = true;
              logger.error('Client-side R2 fetch completed but found 0 valid posts.');
            }
          } else {
             loadError = true;
             logger.error('Blog R2 status has no post items.');
          }
        } else {
           loadError = true;
           logger.error(`Client fetch for /api/blog-status failed: ${statusRes.status}`);
        }
      } catch (error) {
        logger.error('Error during client-side R2 fetch:', error);
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
    font-weight: 100;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--text-dim);
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