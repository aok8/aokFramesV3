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
  
  // Header Image Refs
  let headerImageElementPreview: HTMLImageElement | null = null;
  let headerImageElementFull: HTMLImageElement | null = null;
  
  // Reactive statement to process markdown when post content changes
  $: {
      if (post && post.content) {
          const renderer = new Renderer();
          
          // Custom image renderer to resolve relative paths within markdown
          renderer.image = ({ href, title, text }: { href: string; title: string | null; text: string }): string => {
            let resolvedHref = href;
            // If path is relative (doesn't start with / or http), prepend the correct base path
            if (resolvedHref && !resolvedHref.startsWith('/') && !resolvedHref.startsWith('http')) {
              console.log(`Resolving relative image path in markdown: ${resolvedHref} for post: ${post.id}`);
              // ALWAYS use the /directr2/ prefix, the hook handles dev/prod resolution
              resolvedHref = `/directr2/blog/posts/${post.id}/${resolvedHref}`;
              console.log(`Resolved relative img path: ${href} -> ${resolvedHref}`);
            }
            const titleAttr = title ? ` title="${title}"` : '';
            // Add lazy loading and styling to markdown images
            return `<img src="${resolvedHref}" alt="${text}"${titleAttr} loading="lazy" class="markdown-image">`;
          };
      
          // Parse markdown (only for full post view)
          htmlContent = isPreview ? '' : marked.parse(post.content, {
            renderer: renderer, 
            gfm: true,
            breaks: true,
            async: false
          });
          processedMarkdown = false; // Reset processed flag
      } else {
          htmlContent = '';
          processedMarkdown = false;
      }
  }

  // Get the canonical image path (always /directr2/...)
  $: headerImagePath = post?.image || ''; // Use optional chaining

  // Log post ID for debugging 
  console.log('Creating blog post link for post ID:', post.id);

  // Generate link with proper encoding to preserve case and handle special chars
  $: encodedPostId = encodeURIComponent(post.id);
  $: blogPostUrl = `/blog/${encodedPostId}`;
  $: console.log('Blog post link URL:', blogPostUrl);
  
  // Log the final image path being used
  $: console.log('Header image path for post:', headerImagePath);

  // Header Image Handling - Track loading state
  let headerImageLoaded = false; 
  let headerImageErrored = false; // Track if the primary image load failed

  onMount(async () => {
    headerImageLoaded = false;
    headerImageErrored = false; // Reset on mount
    console.log(`BlogPost component mounted for post: ${post.id}`);

    // Allow Svelte to render the DOM first
    await tick();

    // Check if the relevant image element is already complete (e.g., from cache)
    const imgElement = isPreview ? headerImageElementPreview : headerImageElementFull;
    if (imgElement?.complete && !headerImageErrored) {
      console.log(`Header image (${imgElement.src}) was already complete on mount.`);
      handleImageLoad(); // Manually trigger load state if already complete
    } else if (imgElement) {
      console.log(`Header image (${imgElement.src}) not complete on mount. Waiting for on:load.`);
    }
  });

  // Function to mark image as loaded
  function handleImageLoad() {
    headerImageLoaded = true;
    headerImageErrored = false; // Reset error if it somehow loads later
    console.log(`Header image loaded successfully: ${headerImagePath}`);
  }

  // Function to mark image as errored
  function handleImageError() {
    if (!headerImageLoaded) { // Only mark as errored if not already loaded
        console.error(`Header image failed to load: ${headerImagePath}`);
        headerImageErrored = true;
    }
  }

  // Add lazy loading classes to markdown images after update
  afterUpdate(() => {
     if (!isPreview && markdownContainer && typeof htmlContent === 'string' && htmlContent.length > 0 && !processedMarkdown) {
       const images = markdownContainer.querySelectorAll('.markdown-image'); // Target by class
       images.forEach(img => {
         // Assert type to HTMLImageElement to access 'complete'
         const imageElement = img as HTMLImageElement; 
         if (imageElement.complete) {
           imageElement.classList.add('loaded');
         } else {
           imageElement.addEventListener('load', () => imageElement.classList.add('loaded'), { once: true });
           // Optional: Add error handling for markdown images if needed
           imageElement.addEventListener('error', () => {
               console.error(`Markdown image failed to load: ${imageElement.src}`);
               imageElement.classList.add('error'); // Add error class for styling
           }, { once: true });
         }
       });
       processedMarkdown = true;
       console.log(`Processed ${images.length} markdown images for lazy loading.`);
     }
  });
</script>

{#if isPreview}
  <!-- Preview Card -->
  <article 
    class="card-container" 
    data-post-id={post.id}
    style="
      --blog-label-bg-color: color-mix(in srgb, {theme.secondary} 70%, white 30%);
      --blog-label-text-color: {theme.tertiary};
    "
  >
    {#if headerImagePath}
      <a href={blogPostUrl} class="block image-link">
         <div class="image-placeholder" class:error={headerImageErrored}>
            {#if !headerImageErrored}
              <img
                bind:this={headerImageElementPreview}
                src={headerImagePath}
                alt={post.title}
                class="card-image" 
                class:loaded={headerImageLoaded} 
                loading="lazy"
                on:load={handleImageLoad}
                on:error={handleImageError}
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
      <!-- Card Content (title, meta, summary) -->
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
  <!-- Full Post View -->
  <article 
    class="prose prose-lg mx-auto" 
    style="
      --blog-label-bg-color: color-mix(in srgb, {theme.secondary} 70%, white 30%);
      --blog-label-text-color: {theme.tertiary};
    "
  >
    <header class="mb-8">
      <!-- Post Header (title, meta) -->
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

    {#if headerImagePath}
       <!-- Placeholder container for full post header -->
       <div class="image-placeholder full-post-header" class:error={headerImageErrored}>
        {#if !headerImageErrored}
          <img
            bind:this={headerImageElementFull}
            id="post-header-image-{post.id}" 
            src={headerImagePath}
            alt={post.title}
            class="full-post-image"
            class:loaded={headerImageLoaded}
            loading="lazy"
            on:load={handleImageLoad}
            on:error={handleImageError}
          />
        {:else}
           <div class="error-placeholder-text">Image Error</div>
        {/if}
       </div>
    {/if}

    <!-- Rendered Markdown Content -->
    {#if typeof htmlContent === 'string'}
       <div bind:this={markdownContainer} class="markdown-content">
          {@html htmlContent}
       </div>
    {:else}
        <p>Loading content...</p> 
    {/if}

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

  /* Mobile-specific styling */
  @media (max-width: 768px) {
    .image-placeholder {
      aspect-ratio: 16 / 10; /* Slightly shorter for mobile */
      margin-bottom: 1rem; /* Less spacing on mobile */
    }
    
    .p-6 {
      padding: 1rem !important; /* Override padding for mobile */
    }
    
    .card-container {
      max-width: 100%; /* Make sure it fits on screen */
      margin: 0 auto; /* Center it */
    }
    
    /* Make text smaller on mobile */
    .text-xl {
      font-size: 1.1rem !important;
    }
    
    .mb-3 {
      margin-bottom: 0.5rem !important; /* Less margin under title */
    }
    
    .mb-4 {
      margin-bottom: 0.75rem !important; /* Less margin under meta */
    }
    
    /* Limit height of summary text on mobile */
    .line-clamp-3 {
      -webkit-line-clamp: 2;
      display: -webkit-box;
      -webkit-box-orient: vertical;  
      overflow: hidden;
    }
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
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }

  .card-image.loaded {
    opacity: 1;
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

  .image-placeholder.error {
    background-color: #fee; /* Light red for error */
  }

  /* Add styles for markdown images */
  :global(.markdown-image) {
    display: block; /* Or inline-block */
    max-width: 100%;
    height: auto;
    margin-top: 1em;
    margin-bottom: 1em;
    border-radius: 4px; /* Optional: style consistency */
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
  }

  :global(.markdown-image.loaded) {
    opacity: 1;
  }

  :global(.markdown-image.error) {
     /* Style for failed markdown images */
     border: 2px dashed red;
  }
</style> 