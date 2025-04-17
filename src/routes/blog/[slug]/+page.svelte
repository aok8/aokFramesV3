<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import type { BlogPost as BlogPostType } from '$lib/types/blog.js';
  import { theme } from '../../../theme/theme.js';

  export let data: { post: BlogPostType };
</script>

<Navbar 
    backgroundColor={theme.text.primary}
    textColor={theme.background.light}
  />

<main class="min-h-screen blog-post-content">
  <div class="blog-post-inner-container">
    <div class="back-link-wrapper">
      <a
        href="/blog"
        class="back-link"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="back-link-icon"
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
  .blog-post-content {
    background-color: #f9fafb;
    padding-top: 5rem;
    padding-bottom: 4rem;
    min-height: 100vh;
  }
  @media (max-width: 768px) {
    .blog-post-content {
      padding-top: 6rem;
    }
    :global(.prose h1) {
      font-size: 1.5rem;
    }
    :global(.prose h2) {
      font-size: 1.25rem;
    }
    :global(.prose h3) {
      font-size: 1rem;
    } 
  }

  .blog-post-inner-container {
    max-width: 80rem;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  @media (min-width: 640px) {
    .blog-post-inner-container {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
  }
  @media (min-width: 1024px) {
    .blog-post-inner-container {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }

  .back-link-wrapper {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    color: #4b5563;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .back-link:hover {
    color: #111827;
    text-decoration: underline;
  }

  .back-link-icon {
    height: 1.25rem;
    width: 1.25rem;
    margin-right: 0.5rem;
  }

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