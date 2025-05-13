<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';
  import { theme } from '../../../theme/theme.js';
  import { page } from '$app/stores';
</script>

<Navbar 
  backgroundColor={theme.text.primary}
  textColor={theme.background.light}
/>

<main class="min-h-screen py-16" style="background-color: {theme.background.light}; color: {theme.text.primary};">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <a
        href="/blog"
        class="inline-flex items-center hover:opacity-80"
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

    <div class="text-center py-16">
      <p class="text-gray-600">
        The blog post you're looking for doesn't exist.
      </p>
    </div>
  </div>
</main>

<Footer /> 

<style>
  p {
    font-size: 1.5rem;
    margin-top: 1rem;
  }
</style>