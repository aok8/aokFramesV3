<script lang="ts">
  import type { BlogPost } from '$lib/types/blog.js';
  import { marked, Renderer } from 'marked';
  import { onMount, setContext, afterUpdate, tick } from 'svelte';
  import { dev } from '$app/environment';
  import { theme } from '../../../theme/theme.js'; // Corrected import path

  export let post: BlogPost;
  export let isPreview = false;
  
  let htmlContent: string | Promise<string> = '';
  let markdownContainer: HTMLDivElement | null = null;
  let processedMarkdown = false;
  
  $: {
      if (post && post.content) {
          const renderer = new Renderer();
          
          renderer.image = ({ href, title, text }: { href: string; title: string | null; text: string }): string => {
            let resolvedHref = href;
            if (resolvedHref && !resolvedHref.startsWith('/') && !resolvedHref.startsWith('http')) {
              console.log(`Resolving relative image path: ${resolvedHref} for post: ${post.id}`);
              if (dev) {
                  resolvedHref = `/src/content/blog/posts/${post.id}/${resolvedHref}`;
              } else {
                  resolvedHref = `/directr2/blog/posts/${post.id}/${resolvedHref}`;
              }
              console.log(`Resolved relative img path: ${href} -> ${resolvedHref}`);
            }
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${resolvedHref}" alt="${text}"${titleAttr}>`;
          };
      
          htmlContent = isPreview ? '' : marked.parse(post.content, {
            renderer: renderer, 
            gfm: true,
            breaks: true,
            async: false
          });
          processedMarkdown = false;
      } else {
          htmlContent = '';
          processedMarkdown = false;
      }
  }

  // Handle image errors for R2 by using local fallbacks
  let imageError = false;

  // Convert post.image path to a fallback path if needed
  $: imagePath = post.image || '';
  $: imageFallbackPath = imagePath?.replace('/directr2/blog/', '/src/content/blog/posts/');

  // Log post ID for debugging 
  console.log('Creating blog post link for post ID:', post.id);

  // Generate link with proper encoding to preserve case and handle special chars
  $: encodedPostId = encodeURIComponent(post.id);
  $: blogPostUrl = `/blog/${encodedPostId}`;
  $: console.log('Blog post link URL:', blogPostUrl);
  
  // Add more detailed logging for image paths
  $: console.log('Image path for post:', imagePath);
  $: console.log('Image fallback path for post:', imageFallbackPath);

  // Header Image Handling - Applies to both preview and full post
  let headerImageError = false;
  let headerImageLoaded = false; 

  $: headerImagePath = post?.image || '';
  $: headerImageFallbackPath = dev ? headerImagePath?.replace('/directr2/blog/posts/', '/src/content/blog/posts/') : ''; 

  onMount(async () => {
    headerImageLoaded = false;
    headerImageError = false;
    console.log(`BlogPost component mounted for post: ${post.id}`);
    
    // Wait for initial DOM updates
    await tick();

    // Check if header image loaded before listener attached
    if (!isPreview && post.image) { // Only check in full post view with an image
      const imageId = !headerImageError ? `post-header-image-${post.id}` : (dev && headerImageFallbackPath ? `post-header-fallback-${post.id}` : null);
      if (imageId) {
        const imgElement = document.getElementById(imageId) as HTMLImageElement | null;
        if (imgElement?.complete && !headerImageLoaded) {
          console.log(`Header image (${imageId}) already complete on mount. Setting loaded.`);
          headerImageLoaded = true;
        }
      }
    }
  });

  afterUpdate(() => {
     if (!isPreview && markdownContainer && typeof htmlContent === 'string' && htmlContent.length > 0 && !processedMarkdown) {
       const images = markdownContainer.querySelectorAll('img');
       images.forEach(img => {
         img.setAttribute('loading', 'lazy');
         img.classList.add('markdown-image'); 
         if (img.complete) {
           img.classList.add('loaded');
         } else {
           img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
         }
       });
       processedMarkdown = true;
       console.log(`Processed ${images.length} markdown images for lazy loading.`);
     }
  });
</script>

{#if isPreview}
  <article 
    class="card-container" 
    data-post-id={post.id}
    style="
      --blog-label-bg-color: color-mix(in srgb, {theme.secondary} 70%, white 30%);
      --blog-label-text-color: {theme.tertiary};
    "
  >
    {#if post.image}
      <a href={blogPostUrl} class="block image-link">
         <div class="image-placeholder">
          {#if !headerImageError}
            <img
              src={headerImagePath}
              alt={post.title}
              class="card-image"
              loading="lazy"
              on:error={() => {
                console.log(`Header image failed: ${headerImagePath}, trying fallback: ${headerImageFallbackPath}`);
                if (dev && headerImageFallbackPath) {
                  headerImageError = true;
                  headerImageLoaded = false;
                } else {
                   console.error(`Header image failed and no dev fallback available: ${headerImagePath}`);
                   headerImageError = true;
                }
              }}
            />
          {:else if dev && headerImageFallbackPath} 
            <img
              src={headerImageFallbackPath}
              alt={post.title}
              class="card-image"
              loading="lazy"
              on:error={() => { 
                console.error(`Header fallback failed: ${headerImageFallbackPath}`); 
              }}
            />
          {:else}
             <div class="error-placeholder-text">Image Error</div>
          {/if}
         </div>
      </a>
    {:else}
       <div class="image-placeholder no-image"></div>
    {/if}
    <div class="p-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="blog-label">
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
          href={blogPostUrl}
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
  <article 
    class="prose prose-lg mx-auto" 
    style="
      --blog-label-bg-color: color-mix(in srgb, {theme.secondary} 70%, white 30%);
      --blog-label-text-color: {theme.tertiary};
    "
  >
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
        <span class="blog-label">{post.label}</span>
      </div>
    </header>

    {#if post.image}
       <!-- Placeholder container for full post header -->
       <div class="image-placeholder full-post-header">
        {#if !headerImageError}
          <img
            id="post-header-image-{post.id}"
            src={headerImagePath}
            alt={post.title}
            class="full-post-image"
            class:loaded={headerImageLoaded}
            loading="lazy"
            on:load={() => { headerImageLoaded = true; }}
            on:error={() => {
              console.log(`Header image failed: ${headerImagePath}, trying fallback: ${headerImageFallbackPath}`);
              if (dev && headerImageFallbackPath) {
                 headerImageError = true;
                 headerImageLoaded = false;
               } else {
                  console.error(`Header image failed and no dev fallback available: ${headerImagePath}`);
                  headerImageError = true;
               }
             }}
          />
        {:else if dev && headerImageFallbackPath}
          <img
            id="post-header-fallback-{post.id}"
            src={headerImageFallbackPath}
            alt={post.title}
            class="full-post-image"
            class:loaded={headerImageLoaded}
            loading="lazy"
            on:load={() => { headerImageLoaded = true; }}
            on:error={() => { 
              console.error(`Header fallback failed: ${headerImageFallbackPath}`); 
            }}
          />
        {:else}
          <div class="error-placeholder-text">Image Error</div>
        {/if}
       </div>
    {/if}

    <!-- Wrapper for Markdown content -->
    <div bind:this={markdownContainer} class="prose prose-lg prose-headings:font-sans prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded-lg">
       {#await htmlContent}
         <p>Loading content...</p> 
       {:then content}
         {@html content} 
       {:catch error}
         <p class="text-red-600">Error rendering content: {error.message}</p>
       {/await}
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
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }

  :global(.prose img.loaded) {
     opacity: 1;
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

  .card-container {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: transform 0.2s ease-in-out;
    border: 1px solid #f3f4f6;
  }
  .card-container:hover {
     transform: translateY(-0.25rem);
  }

  .image-link:hover .card-image {
      opacity: 0.9;
  }

  .image-placeholder {
     display: block;
     position: relative;
     width: 100%;
     aspect-ratio: 16 / 9; /* Common aspect ratio */
     background-color: #f0f0f0; 
     background-image: url('/images/constants/placeholder.svg');
     background-size: cover;
     background-position: center;
     overflow: hidden; /* Contain absolute image */
     margin-bottom: 2rem; /* Spacing below header image */
     border-radius: 0.5rem; /* Match prose img style */
  }

  .image-placeholder.no-image {
  }

  .card-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.5s ease-in-out;
  }

  .error-placeholder-text {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     display: flex;
     align-items: center;
     justify-content: center;
     font-size: 0.875rem;
     color: #9ca3af;
  }

  /* Adjustments for full post header image */
  .image-placeholder.full-post-header {
     /* Optional: Different aspect ratio? */
     /* aspect-ratio: 21 / 9; */
  }

  /* Full post header image */
  .full-post-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }
  .full-post-image.loaded {
     opacity: 1;
  }

  /* --- Update style for the blog label to use CSS vars --- */
  .blog-label {
    background-color: var(--blog-label-bg-color);
    color: var(--blog-label-text-color);
    padding: 0.25rem 0.5rem; /* Equivalent to py-1 px-2 */
    border-radius: 9999px; /* Equivalent to rounded-full */
    font-size: 0.875rem; /* Equivalent to text-sm */
    font-weight: 500; /* Equivalent to font-medium */
    display: inline-block; /* Ensure padding applies correctly */
  }
</style> 