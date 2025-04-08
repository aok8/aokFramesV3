<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
  import { theme } from '../../theme/theme.js';
  import type { PageData } from './$types.js';
  import { onMount } from 'svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';

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

  export let data: PageData;
  
  let isLoading = true;
  let loadError = false;
  let directlyLoadedPosts: BlogPostType[] = [];
  
  // Log blog data for debugging
  console.log('Blog page data:', data);
  console.log('Blog posts from server:', data.posts);
  
  onMount(async () => {
    isLoading = true;
    
    // First check if we have posts in sessionStorage
    try {
      const storedPosts = sessionStorage.getItem('blogPosts');
      if (storedPosts) {
        const parsedPosts = JSON.parse(storedPosts);
        console.log('Found stored posts in sessionStorage:', parsedPosts.length);
        
        if (parsedPosts.length > 0) {
          directlyLoadedPosts = parsedPosts;
          console.log('Using posts from sessionStorage');
          posts.set(parsedPosts);
          
          // We still load fresh data in the background
          isLoading = false;
        }
      }
    } catch (storageError) {
      console.error('Error retrieving posts from sessionStorage:', storageError);
    }
    
    try {
      // If server-side posts are empty, try to fetch posts from the client-side
      if (data.posts.length === 0) {
        console.log('No posts from server, attempting client-side fetch');
        
        // Try to fetch blog status
        const statusRes = await fetch('/api/blog-status', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          console.log('Blog R2 status:', statusData);
          
          // If we have blog posts in the bucket, load them directly
          if (statusData.blogPosts?.items?.length > 0) {
            console.log('Server-side fetch failed, attempting client-side direct fetch');
            const loadedPosts = [];
            
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
              console.log('Directly loaded posts:', loadedPosts);
              directlyLoadedPosts = loadedPosts;
              
              // Immediately update the store with the loaded posts
              // This ensures the posts are available for all components
              posts.set(loadedPosts);
              
              // Also dispatch a custom event for any components listening
              // This helps notify other components that posts are ready
              window.dispatchEvent(new CustomEvent('postsLoaded', { 
                detail: { posts: loadedPosts } 
              }));
              
              // Store loaded posts in sessionStorage to persist across page navigations
              try {
                sessionStorage.setItem('blogPosts', JSON.stringify(loadedPosts));
                console.log('Stored loaded posts in sessionStorage');
              } catch (storageError) {
                console.error('Error storing posts in sessionStorage:', storageError);
              }
            }
          }
        }
      } else if (data.posts.length > 0) {
        // If we have server posts, use them and store them in session storage
        console.log('Using server posts:', data.posts.length);
        
        try {
          sessionStorage.setItem('blogPosts', JSON.stringify(data.posts));
          console.log('Stored server posts in sessionStorage');
        } catch (storageError) {
          console.error('Error storing server posts in sessionStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('Error fetching blog status:', error);
      loadError = true;
    }
    
    isLoading = false;
  });
  
  $: {
    console.log('Setting posts:', data.posts);
    if (data.posts?.length > 0) {
      posts.set(data.posts);
    } else if (directlyLoadedPosts.length > 0) {
      console.log('Setting directly loaded posts to store');
      posts.set(directlyLoadedPosts);
    }
  }
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
          {#each $posts as post}
            <BlogPost {post} isPreview={true} />
          {/each}
        </div>
      {:else if directlyLoadedPosts.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each directlyLoadedPosts as post}
            <BlogPost {post} isPreview={true} />
          {/each}
        </div>
      {:else}
        <div class="py-12 text-center">
          <h3 class="text-2xl font-medium text-gray-900 mb-4">No Blog Posts Found</h3>
          <p class="text-gray-600 mb-6">
            There was an issue loading blog posts. This could be because:
          </p>
        </div>
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