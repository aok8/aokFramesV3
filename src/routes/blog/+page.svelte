<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
  import { theme } from '../../theme/theme.js';
  import type { PageData } from './$types.js';
  import { onMount } from 'svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import matter from 'gray-matter';

  export let data: PageData;
  
  let isLoading = true;
  let loadError = false;
  let directlyLoadedPosts: BlogPostType[] = [];
  
  // Log blog data for debugging
  console.log('Blog page data:', data);
  console.log('Blog posts from server:', data.posts);
  
  onMount(async () => {
    isLoading = true;
    
    try {
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
        
        // If server-side data failed but we have blog posts in the bucket
        if (data.posts.length === 0 && statusData.blogPosts?.items?.length > 0) {
          console.log('Server-side fetch failed, attempting client-side direct fetch');
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
                const { data, content: markdownContent } = matter(text);
                console.log('Parsed frontmatter:', data);
                
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
                const tags = data.tags || data.label || 'Photography';
                console.log('Extracted tags:', tags);
                
                // Simplified post object
                directlyLoadedPosts.push({
                  id: slug,
                  title,
                  summary,
                  content: text,
                  author: data.author || 'AOK',
                  published: data.published || new Date().toISOString().split('T')[0],
                  label: tags,
                  image: `/directr2/blog/images/${slug}.jpg`
                });
              }
            } catch (e) {
              console.error('Error directly loading post:', e);
            }
          }
          
          if (directlyLoadedPosts.length > 0) {
            console.log('Directly loaded posts:', directlyLoadedPosts);
            posts.set(directlyLoadedPosts);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching blog status:', error);
    }
    
    isLoading = false;
  });
  
  $: {
    console.log('Setting posts:', data.posts);
    if (data.posts && data.posts.length > 0) {
      posts.set(data.posts);
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
          <ul class="list-disc text-left max-w-md mx-auto mb-8 text-gray-600">
            <li class="mb-2">The R2 bucket connection is not configured correctly</li>
            <li class="mb-2">There are no blog posts in the R2 bucket</li>
            <li class="mb-2">The format or location of blog posts has changed</li>
          </ul>
          <div class="bg-gray-100 p-4 rounded-lg max-w-2xl mx-auto text-left">
            <p class="font-medium mb-2 text-gray-700">Technical Details:</p>
            <p class="text-sm text-gray-600 font-mono overflow-auto">
              Check the browser console for detailed error logs.
            </p>
          </div>
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