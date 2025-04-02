<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import type { BlogPost as BlogPostType } from '../../../lib/types/blog.js';

  export let data: { post: BlogPostType };
</script>

<Navbar />

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

    <BlogPost post={data.post} />
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