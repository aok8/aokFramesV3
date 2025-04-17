<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPostComponent from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
  import { theme } from '../../theme/theme.js';
  import type { PageData } from './$types.js';
  import { onMount } from 'svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import { dev } from '$app/environment';

  // Define expected Layout data shape directly here
  type ExpectedLayoutData = {
    posts: BlogPostType[];
    r2Available: boolean;
    error?: string;
    layoutStatus?: 'skipped-post-load' | 'loaded' | 'api-fallback' | 'error';
  };

  // Simple frontmatter parser for browser
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
        // Remove quotes if present
        frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
      }
    }

    return { data: frontmatter, content: markdownContent };
  }

  export let data: PageData & ExpectedLayoutData;
  
  let isLoading = false;
  let loadError = false;
  let loadedPostsFromClient: BlogPostType[] = [];
  
  // Log blog data for debugging
  console.log('Blog page data from layout:', data);
  console.log('Blog posts from layout:', data.posts);
  console.log('Layout status:', data.layoutStatus);
  
  onMount(async () => {
    // Access layoutStatus directly - now typed
    const layoutSkipped = data.layoutStatus === 'skipped-post-load';
    
    // Only attempt client-side fetch if layout explicitly skipped
    // OR if we are in production and server posts are empty
    if (layoutSkipped || (!dev && data.posts.length === 0)) {
      console.log('Attempting client-side R2 fetch (layout skipped or prod fallback)');
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
          console.log('Client R2 Load: Blog R2 status:', statusData);

          // Extract unique slugs containing index.md from statusData
          const slugs = new Set<string>();
          statusData.blogPosts?.items?.forEach((item: { key: string }) => {
              if (item.key.toLowerCase().endsWith('/index.md')) {
                  const parts = item.key.split('/');
                  if (parts.length >= 4) slugs.add(parts[parts.length - 2]);
              }
          });
          const uniqueSlugs = Array.from(slugs);
          console.log('Client R2 Load: Found potential slugs:', uniqueSlugs);

          if (uniqueSlugs.length > 0) {
            console.log('Client R2 Load: Attempting direct fetch...');
            const loadedPosts: BlogPostType[] = [];
            
            for (const slug of uniqueSlugs) {
              try {
                // Construct key for index.md
                const key = `blog/posts/${slug}/index.md`;
                console.log(`Client R2 Load: Fetching content for slug "${slug}" from ${key}`);

                const response = await fetch(`/directr2/${key}`);
                if (response.ok) {
                  const text = await response.text();
                  console.log(`Successfully loaded ${slug} directly`);
                  
                  // Parse frontmatter and content
                  const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
                  console.log('Parsed frontmatter:', frontmatter);
                  
                  // Extract title from first h1
                  const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                  const title = titleMatch ? titleMatch[1] : slug;
                  
                  // --- Refined Summary Extraction --- 
                  const lines = markdownContent.split('\n');
                  let summary = ''; // Default to empty string
                  let foundTitle = false;
                  let titleIndex = -1;

                  // Find the index of the main title line
                  for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().startsWith('# ')) { // More specific check for H1
                       foundTitle = true;
                       titleIndex = i;
                       break;
                    }
                  }
                  
                  // If title was found, look for the first non-empty, non-heading line after it
                  if (foundTitle) {
                      for (let i = titleIndex + 1; i < lines.length; i++) {
                          const line = lines[i].trim();
                          if (line === '') continue; // Skip empty lines
                          
                          // Check if the line starts with any heading marker (#)
                          if (line.startsWith('#')) {
                              // Found another heading before finding a summary paragraph
                              console.log(`Skipping summary for "${title}" because next content is a heading: ${line}`);
                              break; // Stop searching for summary
                          } else {
                              // Found a valid summary line
                              summary = line;
                              console.log(`Extracted summary for "${title}": ${summary.substring(0, 50)}...`);
                              break; // Stop after finding the first valid line
                          }
                      }
                  }
                  // --- End Refined Summary Extraction --- 
                  
                  // Get tags from frontmatter
                  const tags = frontmatter.tags || frontmatter.label || 'Photography';
                  console.log('Extracted tags:', tags);
                  
                  // Check for header.jpg using HEAD request
                  const imageKey = `blog/posts/${slug}/header.jpg`;
                  let imageExists = false;
                  try {
                      const imgRes = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
                      imageExists = imgRes.ok;
                      console.log(`Client R2 Load: Image check for ${imageKey}: ${imageExists}`);
                  } catch (imgErr) {
                      console.warn(`Client R2 Load: Image check failed for ${imageKey}`, imgErr);
                  }
                  
                  loadedPosts.push({
                    id: slug, // slug is the directory name
                    title,
                    summary,
                    content: markdownContent,
                    author: frontmatter.author || 'AOK',
                    published: frontmatter.published || new Date().toISOString().split('T')[0],
                    label: tags,
                    image: imageExists ? `/directr2/${imageKey}` : undefined // Use header.jpg path
                  });
                } else {
                    console.error(`Client R2 Load: Failed to fetch ${key}: ${response.status}`);
                }
              } catch (e) {
                 console.error(`Client R2 Load: Error loading post for slug "${slug}":`, e);
              }
            }
            
            if (loadedPosts.length > 0) {
              console.log('Directly loaded posts from R2:', loadedPosts);
              loadedPostsFromClient = loadedPosts;
              posts.set(loadedPosts);
              
              // Store in sessionStorage
              try {
                sessionStorage.setItem('blogPosts', JSON.stringify(loadedPosts));
                console.log('Stored R2 loaded posts in sessionStorage');
              } catch (storageError) {
                console.error('Error storing R2 posts in sessionStorage:', storageError);
              }
            } else {
              // If R2 fetch yielded no posts, potentially set an error state
              loadError = true;
              console.error('Client-side R2 fetch completed but found 0 valid posts.');
            }
          } else {
             loadError = true;
             console.error('Blog R2 status has no post items.');
          }
        } else {
           loadError = true;
           console.error(`Client fetch for /api/blog-status failed: ${statusRes.status}`);
        }
      } catch (error) {
        console.error('Error during client-side R2 fetch:', error);
        loadError = true;
      }
      isLoading = false;
    }
    
    // Handle initial population from layout data
    if (data.posts?.length > 0) {
      console.log('Populating store from layout data');
      posts.set(data.posts);
      // Optionally store layout posts in sessionStorage if not already there
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('blogPosts')) {
         try {
            sessionStorage.setItem('blogPosts', JSON.stringify(data.posts));
            console.log('Stored layout posts in sessionStorage');
          } catch (storageError) {
             console.error('Error storing layout posts in sessionStorage:', storageError);
          }
      }
    } else if (!layoutSkipped) {
      // If layout didn't skip but posts are empty, check session storage as fallback
      console.log('Layout provided no posts, checking sessionStorage');
       if (typeof sessionStorage !== 'undefined') {
          try {
            const storedPostsJson = sessionStorage.getItem('blogPosts');
            if (storedPostsJson) {
              const storedPosts = JSON.parse(storedPostsJson);
              if (storedPosts.length > 0) {
                  console.log('Restoring posts from sessionStorage');
                  posts.set(storedPosts);
              }
            }
          } catch (e) {
            console.error('Error reading from sessionStorage', e);
          }
       }
    }
  });
</script>

<div class="blog-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary}; --secondary-color: {theme.secondary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />

  <main class="blog-main-content">
    <div class="content-wrapper">
      <div class="page-header">
        <h1 class="page-title">Blog</h1>
        <p class="page-subtitle">
          Exploring the art of photography, one frame at a time. Join me on my journey.
        </p>
      </div>

      {#if isLoading}
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="loading-text">Loading blog posts...</p>
        </div>
      {:else if $posts && $posts.length > 0}
        <div class="posts-grid">
          {#each $posts as post (post.id)}
            <BlogPostComponent {post} isPreview={true} />
          {/each}
        </div>
      {:else if loadError}
        <p class="status-text error-text">Failed to load blog posts.</p>
      {:else}
        <p class="status-text no-posts-text">No blog posts available yet.</p>
      {/if}
    </div>
  </main>

  <Footer />
</div>

<style>
  .blog-container {
    min-height: 100vh;
    width: 100%;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
  }
  @media (max-width: 768px) {
    .blog-container {
      padding-top: 4rem;
    }
  }

  main {
    flex: 1;
  }

  .blog-main-content {
    min-height: 100vh;
    padding-top: 4rem; /* py-16 */
    padding-bottom: 4rem; /* py-16 */
  }

  .content-wrapper {
    max-width: 80rem; /* max-w-7xl */
    margin-left: auto; /* mx-auto */
    margin-right: auto; /* mx-auto */
    padding-left: 1rem; /* px-4 */
    padding-right: 1rem; /* px-4 */
  }

  .page-header {
    max-width: 64rem; /* max-w-4xl */
    margin-left: auto; /* mx-auto */
    margin-right: auto; /* mx-auto */
    margin-bottom: 3rem; /* mb-12 */
    text-align: center; /* text-center */
  }

  .page-title {
    font-size: 2.25rem; /* text-4xl */
    line-height: 2.5rem; /* text-4xl */
    font-weight: 700; /* font-bold */
    color: color-mix(in srgb, var(--secondary-color) 80%, black); 
    margin-bottom: 1rem; /* mb-4 */
  }

  .page-subtitle {
    font-size: 1.125rem; /* text-lg */
    line-height: 1.75rem; /* text-lg */
    color: var(--secondary-color); 
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 5rem; /* py-20 */
    padding-bottom: 5rem; /* py-20 */
  }

  .loading-spinner {
    height: 3rem; /* h-12 */
    width: 3rem; /* w-12 */
    border-top-width: 2px; /* border-t-2 */
    border-bottom-width: 2px; /* border-b-2 */
    border-color: rgb(17 24 39); /* border-gray-900 */
    border-radius: 9999px; /* rounded-full */
    animation: spin 1s linear infinite;
  }

  .loading-text {
    margin-left: 1rem; /* ml-4 */
    font-size: 1.125rem; /* text-lg */
    line-height: 1.75rem; /* text-lg */
    color: var(--secondary-color); 
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr)); /* grid-cols-1 */
    gap: 2rem; /* gap-8 */
  }

  .status-text {
    text-align: center;
    padding-top: 2.5rem; /* py-10 */
    padding-bottom: 2.5rem; /* py-10 */
  }

  .error-text {
    color: rgb(220 38 38); /* text-red-600 */
  }

  .no-posts-text {
     color: var(--secondary-color);
  }

  /* Responsive styles */
  @media (min-width: 640px) { /* sm: */
    .content-wrapper {
      padding-left: 1.5rem; /* sm:px-6 */
      padding-right: 1.5rem; /* sm:px-6 */
    }
  }

  @media (min-width: 768px) { /* md: */
    .posts-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)); /* md:grid-cols-2 */
    }
  }

  @media (min-width: 1024px) { /* lg: */
    .content-wrapper {
      padding-left: 2rem; /* lg:px-8 */
      padding-right: 2rem; /* lg:px-8 */
    }
    .posts-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)); /* lg:grid-cols-3 */
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

</style> 