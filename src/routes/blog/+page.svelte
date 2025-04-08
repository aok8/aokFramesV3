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
          console.log('Blog R2 status:', statusData);
          
          if (statusData.blogPosts?.items?.length > 0) {
            console.log('Attempting client-side direct fetch from R2');
            const loadedPosts: BlogPostType[] = [];
            
            for (const item of statusData.blogPosts.items) {
              try {
                const key = item.key;
                const filename = key.split('/').pop() || '';
                const slug = filename.replace(/\.md$/i, '');
                
                // Direct fetch from R2
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
                  
                  // Extract first paragraph after title
                  const lines = markdownContent.split('\n');
                  let summaryLines = [];
                  let foundTitle = false;
                  
                  for (const line of lines) {
                    // Skip until we find the title
                    if (!foundTitle) {
                      if (line.startsWith('#')) {
                        foundTitle = true;
                      }
                      continue;
                    }
                    
                    // Skip empty lines after title
                    if (line.trim() === '') continue;
                    
                    // First non-empty line after title is our summary
                    summaryLines.push(line.trim());
                    break;
                  }
                  
                  const summary = summaryLines.join(' ') || 'No summary available';
                  
                  // Get tags from frontmatter
                  const tags = frontmatter.tags || frontmatter.label || 'Photography';
                  console.log('Extracted tags:', tags);
                  
                  // IMPORTANT: Preserve the exact slug from the filename in R2
                  // Do not modify case or apply any transformations
                  // This must match exactly how files are stored in R2
                  const filename = key.split('/').pop() || '';
                  const exactSlug = filename.replace(/\.md$/i, '');
                  console.log('Using exact slug from R2:', exactSlug);
                  
                  // Simplified post object
                  loadedPosts.push({
                    id: exactSlug, // Preserve the original case from R2
                    title,
                    summary,
                    content: markdownContent,
                    author: frontmatter.author || 'AOK',
                    published: frontmatter.published || new Date().toISOString().split('T')[0],
                    label: tags,
                    image: `/directr2/blog/images/${exactSlug}.jpg`
                  });
                }
              } catch (e) {
                console.error('Error directly loading post:', e);
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

<div class="blog-container" style="--bg-color: {theme.background.light}; --text-color: {theme.text.primary};">
  <Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />

  <main class="min-h-screen py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto mb-12 text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
        <p class="text-lg text-gray-600">
          Exploring the art of photography, one frame at a time. Join me on my journey.
        </p>
      </div>

      {#if isLoading}
        <div class="flex justify-center items-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          <p class="ml-4 text-lg text-gray-700">Loading blog posts...</p>
        </div>
      {:else if $posts && $posts.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each $posts as post (post.id)}
            <BlogPostComponent {post} isPreview={true} />
          {/each}
        </div>
      {:else if loadError}
        <p class="text-red-600 text-center py-10">Failed to load blog posts.</p>
      {:else}
        <p class="text-gray-600 text-center py-10">No blog posts available yet.</p>
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

  main {
    flex: 1;
  }
</style> 