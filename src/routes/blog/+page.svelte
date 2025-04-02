<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import BlogPost from '$lib/components/blog/BlogPost.svelte';
  import { posts } from '../../lib/stores/blog.js';
</script>

<Navbar />

<main class="min-h-screen bg-gray-50 py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto mb-12 text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Film Photography Blog</h1>
      <p class="text-lg text-gray-600">
        Exploring the art of analog photography, one frame at a time. Join me on my journey through the world of film cameras, darkroom techniques, and the timeless beauty of film photography.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each $posts as post}
        <BlogPost {post} isPreview={true} />
      {/each}
    </div>
  </div>
</main>

<Footer />

<style>
  article {
    transition: transform 0.2s ease-in-out;
  }

  article:hover {
    transform: translateY(-4px);
  }

  a {
    text-decoration: none;
  }
</style> 