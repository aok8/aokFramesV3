<script lang="ts">
  import Navbar from '$lib/components/ui/navbar.svelte';
  import Footer from '$lib/components/ui/footer.svelte';

  export let data;
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

    <div class="text-center py-16">
      <h1 class="text-2xl font-semibold text-gray-900">Post not found</h1>
      <p class="mt-2 text-gray-600">
        The blog post you're looking for doesn't exist.
      </p>
    </div>
  </div>
</main>

<Footer /> 