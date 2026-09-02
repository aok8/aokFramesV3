import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';
import { assetUrl } from '$lib/utils/r2.js';
import { get } from 'svelte/store';
import { posts } from '$lib/stores/blog.js';
import type { BlogPost } from '$lib/types/blog.js';
import { logger } from '$lib/utils/logger.js';

// Simple frontmatter parser for browser
function parseFrontmatter(content: string) {
  const lines = content.split('\n');
  const frontmatter: Record<string, string> = {};
  let inFrontmatter = false;
  let markdownContent = '';
  let frontmatterLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        inFrontmatter = false;
        markdownContent = lines.slice(i + 1).join('\n');
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
    }
  }

  return { data: frontmatter, content: markdownContent };
}

export const load: PageLoad = async ({ params, fetch, data }) => {
  const { slug } = params;
  const decodedSlug = decodeURIComponent(slug);

  logger.log(`[+page.ts Load] Loading blog post: "${decodedSlug}" (dev: ${dev})`);

	// The server loader is the source of truth for direct visits, refreshes, and
	// crawlers. Keep the client fallbacks below for older cached deployments.
	if (data.post) {
		updateSessionStorageWithPost(data.post);
		updateStoreWithPost(data.post);
		return { post: data.post };
	}

  // --- Development Mode: read straight from local static files ---
  if (dev) {
    try {
      const postPath = `/src/content/blog/posts/${decodedSlug}/index.md`;
      const response = await fetch(postPath);

      if (!response.ok) {
				logger.error(
					`Failed to fetch post in dev mode: ${response.status} ${response.statusText} for ${postPath}`
				);
        throw error(404, `Blog post file not found at ${postPath}`);
      }

      const text = await response.text();
      const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);

      const titleMatch = markdownContent.match(/^#\s+(.*)/m);
      const title = titleMatch ? titleMatch[1] : decodedSlug;

      let imagePathForComponent: string | undefined = undefined;
      const localImageCheckPath = `/src/content/blog/posts/${decodedSlug}/header.webp`;
      try {
        const imageResponse = await fetch(localImageCheckPath, { method: 'HEAD' });
        if (imageResponse.ok) {
          imagePathForComponent = assetUrl(`blog/posts/${decodedSlug}/header.webp`);
        }
      } catch (imgErr) {
        logger.warn(`Dev image check failed for ${localImageCheckPath}:`, imgErr);
      }

      const lines = markdownContent.split('\n');
      let summary = '';
      let foundTitle = false;
      let titleIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('# ')) {
          foundTitle = true;
          titleIndex = i;
          break;
        }
      }
      if (foundTitle) {
        for (let i = titleIndex + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') continue;
          if (line.startsWith('#')) break;
          summary = line;
          break;
        }
      }

      const post: BlogPost = {
        id: decodedSlug,
        title,
        content: markdownContent,
        summary: summary || 'No summary available',
        author: frontmatter.author || 'AOK',
        published: frontmatter.published || new Date().toISOString().split('T')[0],
        label: frontmatter.tags || frontmatter.label || 'Photography',
        image: imagePathForComponent
      };

      return { post };
    } catch (devError) {
      logger.error('[+page.ts Load] Error during development mode post loading:', devError);
      throw error(404, 'Blog post not found in development environment');
    }
  }

  // --- Production Mode: check caches, then hit our own same-origin API ---
  // Post content used to be fetched directly from the assets.aokframes.com CDN here.
  // That's a cross-origin request from the browser, and the CDN doesn't send an
  // Access-Control-Allow-Origin header, so it worked on the initial SSR render (server
  // to server, no CORS involved) but silently failed on any client-side navigation
  // (browser fetch, blocked by CORS). Routing through /api/blog-posts/[slug] instead
  // keeps every request same-origin — that endpoint already does the R2 read
  // server-side and has no CORS restriction to trip over.
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const cachedPostsJson = sessionStorage.getItem('blogPosts');
      if (cachedPostsJson) {
        const cachedPosts: BlogPost[] = JSON.parse(cachedPostsJson);
				const postFromSession = cachedPosts.find(
					(p) => p.id.toLowerCase() === decodedSlug.toLowerCase()
				);
        if (postFromSession) {
          logger.log('[+page.ts Load] Post found in sessionStorage:', postFromSession.title);
          return { post: postFromSession };
        }
      }
    } catch (storageError) {
      logger.error('[+page.ts Load] Error accessing sessionStorage:', storageError);
    }
  }

  const storedPosts = get(posts);
  const storedPost = storedPosts.find((p) => p.id.toLowerCase() === decodedSlug.toLowerCase());
  if (storedPost) {
    logger.log('[+page.ts Load] Post found in store:', storedPost.title);
    return { post: storedPost };
  }

  try {
    const response = await fetch(`/api/blog-posts/${encodeURIComponent(decodedSlug)}`);

    if (response.ok) {
      const post: BlogPost = await response.json();
      updateSessionStorageWithPost(post);
      updateStoreWithPost(post);
      return { post };
    }

    if (response.status !== 404) {
      logger.error(`[+page.ts Load] /api/blog-posts/${decodedSlug} failed: ${response.status}`);
    }
  } catch (fetchError) {
    logger.error('[+page.ts Load] Error fetching post from /api/blog-posts:', fetchError);
  }

  throw error(404, 'Blog post not found');
};

function updateSessionStorageWithPost(post: BlogPost) {
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      const cachedPostsJson = sessionStorage.getItem('blogPosts');
      let cachedPosts: BlogPost[] = cachedPostsJson ? JSON.parse(cachedPostsJson) : [];
      const existingIndex = cachedPosts.findIndex((p) => p.id === post.id);
      if (existingIndex > -1) {
        cachedPosts[existingIndex] = post;
      } else {
        cachedPosts.push(post);
      }
      sessionStorage.setItem('blogPosts', JSON.stringify(cachedPosts));
    } catch (e) {
      logger.error('[Helper] Error updating sessionStorage:', e);
    }
  }
}

function updateStoreWithPost(post: BlogPost) {
  const currentPosts = get(posts);
  const existingIndex = currentPosts.findIndex((p) => p.id === post.id);
  if (existingIndex > -1) {
    const updatedPosts = [...currentPosts];
    updatedPosts[existingIndex] = post;
    posts.set(updatedPosts);
  } else {
    posts.set([...currentPosts, post]);
  }
}
