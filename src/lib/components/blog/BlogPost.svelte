<script lang="ts">
  import type { BlogPost } from '$lib/types/blog.js';
  import { marked } from 'marked';

  export let post: BlogPost;
  export let isPreview = false;

  $: htmlContent = isPreview ? '' : marked(post.content, {
    gfm: true,
    breaks: true
  });
</script>

{#if isPreview}
  <article class="bg-white rounded-lg shadow-sm overflow-hidden hover:-translate-y-1 transition-transform duration-200 border border-gray-100">
    {#if post.image}
      <a href="/blog/{post.id}" class="block">
        <img
          src={post.image}
          alt={post.title}
          class="w-full h-48 object-cover hover:opacity-90 transition-opacity"
        />
      </a>
    {/if}
    <div class="p-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
          {post.label}
        </span>
        <time class="text-gray-500 text-sm" datetime={post.published}>
          {new Date(post.published).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>
      </div>
      <h2 class="text-xl font-semibold mb-3">
        <a
          href="/blog/{post.id}"
          class="text-gray-900 hover:text-gray-700 transition-colors"
        >
          {post.title}
        </a>
      </h2>
      <p class="text-gray-600 mb-4 line-clamp-3">
        {post.summary}
      </p>
      <div class="flex items-center text-gray-500 text-sm">
        <span class="font-medium">{post.author}</span>
      </div>
    </div>
  </article>
{:else}
  <article class="prose prose-lg mx-auto">
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-4 font-sans">{post.title}</h1>
      <div class="flex items-center gap-4 text-gray-600">
        <span>{post.author}</span>
        <span>•</span>
        <time datetime={post.published}>
          {new Date(post.published).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>
        <span>•</span>
        <span class="bg-gray-100 px-2 py-1 rounded">{post.label}</span>
      </div>
    </header>

    {#if post.image}
      <img
        src={post.image}
        alt={post.title}
        class="w-full h-[400px] object-cover rounded-lg mb-8"
      />
    {/if}

    <div class="prose prose-lg prose-headings:font-sans prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded-lg">
      {@html htmlContent}
    </div>
  </article>
{/if}

<style>
  a {
    text-decoration: none;
  }

  :global(.prose) {
    max-width: 65ch;
  }

  :global(.prose img) {
    border-radius: 0.5rem;
  }

  :global(.prose h1) {
    font-size: 2.5rem;
    margin-top: 0;
  }

  :global(.prose h2) {
    font-size: 2rem;
    margin-top: 2rem;
  }

  :global(.prose h3) {
    font-size: 1.5rem;
    margin-top: 1.5rem;
  }

  :global(.prose ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
  }

  :global(.prose ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
  }

  :global(.prose li) {
    margin: 0.5rem 0;
  }

  :global(.prose strong) {
    font-weight: 600;
  }

  :global(.prose em) {
    font-style: italic;
  }
</style> 