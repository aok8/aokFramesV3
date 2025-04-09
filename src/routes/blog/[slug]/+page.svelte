<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import { theme } from '../../../theme/theme.js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { parseFrontmatter } from '$lib/utils/frontmatter.js';

  export let data: { post?: BlogPostType };

  let isLoading = false;
  let loadError = '';
  let post = data?.post;

  async function loadPostClientSide(slug: string) {
    console.log(`[Client] Attempting to load post "${slug}" client-side`);
    isLoading = true;
    loadError = '';

    try {
      // 1. Try direct fetch from /directr2/
      const directR2Path = `/directr2/blog/posts/${slug}/index.md`;
      console.log(`[Client] Trying direct fetch from: ${directR2Path}`);
      
      const response = await fetch(directR2Path);
      
      if (response.ok) {
        console.log(`[Client] Successfully fetched post content`);
        const text = await response.text();
        
        // Parse frontmatter and content
        const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : slug;
        
        // Check if header image exists
        const imageKey = `/directr2/blog/posts/${slug}/header.jpg`;
        let imageExists = false;
        
        try {
          const imageResponse = await fetch(imageKey, { method: 'HEAD' });
          imageExists = imageResponse.ok;
        } catch (e) {
          console.warn(`[Client] Error checking image: ${e}`);
        }
        
        // Create post object
        post = {
          id: slug,
          title,
          content: markdownContent,
          summary: 'Client-side loaded post',
          author: frontmatter.author || 'AOK',
          published: frontmatter.published || new Date().toISOString().split('T')[0],
          label: frontmatter.tags || frontmatter.label || 'Photography',
          image: imageExists ? imageKey : undefined
        };
        
        console.log(`[Client] Successfully created post object: "${post.title}"`);
      } else {
        console.error(`[Client] Failed to fetch post: ${response.status}`);
        loadError = `Failed to load post (${response.status})`;
      }
    } catch (e) {
      console.error(`[Client] Error loading post:`, e);
      loadError = e instanceof Error ? e.message : 'Unknown error loading post';
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    if (!post) {
      console.log('[Client] No post data from server, attempting client-side load');
      const slug = $page.params.slug;
      await loadPostClientSide(slug);
    }
  });
</script>

<Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />

<main class="min-h-screen bg-gray-50 py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <a
        href="/blog"
        class="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
            clip-rule="evenodd"
          />
        </svg>
        Back to Blog
      </a>
    </div>

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
        <p class="text-lg text-gray-700">Loading post...</p>
      </div>
    {:else if loadError}
      <div class="text-center py-16">
        <h2 class="text-2xl font-bold text-red-500 mb-4">Error Loading Post</h2>
        <p class="text-gray-700 mb-6">{loadError}</p>
        <button 
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" 
          on:click={() => loadPostClientSide($page.params.slug)}
        >
          Try Again
        </button>
        <a 
          href="/blog" 
          class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-4"
        >
          Return to Blog
        </a>
      </div>
    {:else if post}
      <BlogPost post={post} />
    {:else}
      <div class="text-center py-16">
        <h2 class="text-2xl font-bold text-gray-700 mb-4">Post Not Found</h2>
        <p class="text-gray-600 mb-6">The blog post you're looking for could not be found.</p>
        <a 
          href="/blog" 
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Return to Blog
        </a>
      </div>
    {/if}
  </div>
</main>

<Footer />

<style>
  :global(.prose) {
    max-width: 65ch;
  }

  :global(.prose img) {
    border-radius: 0.5rem;
  }

  :global(.prose a) {
    color: #4a5568;
    text-decoration: underline;
  }

  :global(.prose a:hover) {
    color: #2d3748;
  }

  :global(.prose pre) {
    background-color: #f7fafc;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  :global(.prose code) {
    color: #2d3748;
    background-color: #edf2f7;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
  }

  :global(.prose blockquote) {
    border-left-color: #4a5568;
    color: #4a5568;
  }
</style> 