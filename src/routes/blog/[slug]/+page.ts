import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';
import { assetUrl } from '$lib/utils/r2.js';
import { get } from 'svelte/store';
import { posts } from '$lib/stores/blog.js';
import type { BlogPost } from '$lib/types/blog.js'; // Import BlogPost type
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

  // Parse frontmatter lines
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      // Remove quotes if present
      frontmatter[key.trim()] = value.replace(/^['"](.*)['"]$/, '$1');
    }
  }

  return { data: frontmatter, content: markdownContent };
}

// Function to create post object (extracted for reuse)
async function createPostObject(slug: string, frontmatter: any, markdownContent: string, fetchFn: typeof fetch): Promise<BlogPost> {
    const titleMatch = markdownContent.match(/^#\\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : slug;
    
    // Summary extraction (reuse refined logic)
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

    // Check for header.webp — in dev, probe same-origin; in prod skip HEAD (CORS) and always include
    const r2ImageKey = `blog/posts/${slug}/header.webp`;
    let imagePath: string | undefined = undefined;
    let imageExists = false;
    if (dev) {
        const localPath = `/src/content/blog/posts/${slug}/header.webp`;
        try {
            const imgRes = await fetchFn(localPath, { method: 'HEAD' });
            imageExists = imgRes.ok;
        } catch { imageExists = false; }
        if (imageExists) imagePath = assetUrl(r2ImageKey);
    } else {
        // Can't HEAD cross-origin CDN without CORS headers; assume image exists
        imagePath = assetUrl(r2ImageKey);
        imageExists = true;
    }
    
    logger.log(`Image check for ${slug}: ${imageExists ? imagePath : 'None'}`);
    
    return {
        id: slug,
        title,
        content: markdownContent, // Raw content for now, rendering handles markdown
        summary,
        author: frontmatter.author || 'AOK',
        published: frontmatter.published || new Date().toISOString().split('T')[0],
        label: frontmatter.tags || frontmatter.label || 'Photography',
        image: imageExists ? imagePath : undefined
    };
}

export const load: PageLoad = async ({ data, params, fetch }) => {
  logger.log(`[+page.ts Client Load] Checking for post data for slug: "${params.slug}"`);
  
  type LoadResult = { post: BlogPost } | { error: any; status: number }; 

  try { 
    const { slug } = params;
    const decodedSlug = decodeURIComponent(slug);
    
    logger.log(`[+page.ts Client Load] Page load running for blog post with slug: "${decodedSlug}"`);
    
    // --- Development Mode Logic --- 
    if (dev) {
        logger.log('Running in development mode, attempting local file fetch...');
        try {
            const postPath = `/src/content/blog/posts/${decodedSlug}/index.md`;
            logger.log(`[+page.ts Client Load] Fetching post from dev path: ${postPath}`);
            const response = await fetch(postPath);
            
            if (!response.ok) {
                logger.error(`Failed to fetch post in dev mode: ${response.status} ${response.statusText} for ${postPath}`);
                throw error(404, `Blog post file not found at ${postPath}`); 
            }
            
            const text = await response.text();
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : decodedSlug;
            
            // --- IMAGE HANDLING ---
            // Dev: probe local path; Prod: always include CDN URL (no CORS HEAD allowed)
            const r2ImagePath = assetUrl(`blog/posts/${decodedSlug}/header.webp`);
            let imagePathForComponent: string | undefined = undefined;

            if (dev) {
                const localImageCheckPath = `/src/content/blog/posts/${decodedSlug}/header.webp`;
                try {
                    const imageResponse = await fetch(localImageCheckPath, { method: 'HEAD' });
                    if (imageResponse.ok) imagePathForComponent = r2ImagePath;
                    logger.log(`Dev image check for ${localImageCheckPath}: ${imageResponse.ok}`);
                } catch (imgErr) {
                    logger.warn(`Dev image check failed for ${localImageCheckPath}:`, imgErr);
                }
            } else {
                imagePathForComponent = r2ImagePath;
            }
            // --- END IMAGE HANDLING --- 

            // --- START: Summary Extraction for Dev ---
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
            // --- END: Summary Extraction for Dev ---
            
            const post: BlogPost = { // Added BlogPost type
                id: decodedSlug, 
                title,
                content: markdownContent,
                summary: summary || 'No summary available', // Use extracted summary
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imagePathForComponent 
            };
            
            logger.log('[+page.ts Client Load] Successfully created blog post from filesystem:', post.title, 'with image:', post.image);
            return { post }; // Explicitly return LoadResult type
            
        } catch (devError) {
             logger.error('[+page.ts Client Load] Error during development mode post loading:', devError);
             throw error(404, 'Blog post not found in development environment');
        }
    }
    // --- End Development Mode Logic ---
    
    // --- Production Mode Logic --- 
    logger.log('[+page.ts Client Load] Running in production mode, proceeding with cloud logic...');
    
    // Check Session Storage First (Client-side only)
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            logger.log('[+page.ts Client Load] Checking sessionStorage for cached posts');
            const cachedPostsJson = sessionStorage.getItem('blogPosts');
            
            if (cachedPostsJson) {
                const cachedPosts: BlogPost[] = JSON.parse(cachedPostsJson); // Add type
                logger.log(`[+page.ts Client Load] SessionStorage has ${cachedPosts.length} cached posts`);
                
                if (cachedPosts && cachedPosts.length > 0) {
                    logger.log('[+page.ts Client Load] All cached post IDs:', cachedPosts.map(p => p.id));
                    
                    let postFromSession = cachedPosts.find(p => p.id.toLowerCase() === decodedSlug.toLowerCase());
                                        
                    if (postFromSession) {
                        logger.log('[+page.ts Client Load] Post found in sessionStorage:', postFromSession.title);
                        // Optionally update the store if necessary (might already be up-to-date)
                        // posts.set(cachedPosts); 
                        return { post: postFromSession };
                    }
                }
            }
        } catch (storageError) {
            logger.error('[+page.ts Client Load] Error accessing sessionStorage:', storageError);
        }
    }

    // Check the Svelte Store next
    const storedPosts = get(posts);
    logger.log(`[+page.ts Client Load] Store has ${storedPosts.length} posts`);
    
    if (storedPosts && storedPosts.length > 0) {
        logger.log('[+page.ts Client Load] All post IDs in store:', storedPosts.map(p => p.id));
        
        let storedPost = storedPosts.find(p => p.id.toLowerCase() === decodedSlug.toLowerCase());
                
        if (storedPost) {
            logger.log('[+page.ts Client Load] Post found in store:', storedPost.title);
            return { post: storedPost };
        }
    }

    // If not found in cache or store, attempt direct fetch from R2 (via hook)
    try {
        logger.log(`[+page.ts Client Load] Attempting direct fetch of slug "${decodedSlug}" from R2 via API`);
        
        logger.log('[+page.ts Client Load] Fetching /api/blog-status');
        const statusRes = await fetch('/api/blog-status', {
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        });
        logger.log(`[+page.ts Client Load] /api/blog-status response status: ${statusRes.status}`);
        
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            logger.log('[+page.ts Client Load] R2 slugs from API:', statusData?.blogPosts?.slugs);
            
            let matchingItem: { key: string } | undefined = undefined;
            const apiSlugs: string[] = statusData?.blogPosts?.slugs || [];
            const foundSlug = apiSlugs.find(s => s.toLowerCase() === decodedSlug.toLowerCase());
            
            if (foundSlug) {
                logger.log(`[+page.ts Client Load] Found matching API slug (case-insensitive): "${foundSlug}"`);
                const expectedKey = `blog/posts/${foundSlug}/index.md`;
                matchingItem = statusData.blogPosts.items.find((item: { key: string }) => item.key === expectedKey);
                 if (!matchingItem) {
                   logger.warn(`[+page.ts Client Load] Slug "${foundSlug}" in list, but key "${expectedKey}" not found in items!`);
                 }
            } else {
                logger.log(`[+page.ts Client Load] Slug "${decodedSlug}" not found in API slugs list.`);
            }
            
            if (matchingItem) {
                 logger.log(`[+page.ts Client Load] Found direct match in R2 items:`, matchingItem);
                 const exactSlugFromKey = foundSlug!; // Use the slug found earlier
                 const directR2Key = assetUrl(matchingItem.key);
                 logger.log(`[+page.ts Client Load] Fetching post content from R2 via: ${directR2Key}`);
                 const postResponse = await fetch(directR2Key);
                 logger.log(`[+page.ts Client Load] /directr2 fetch status: ${postResponse.status}`);

                 if (postResponse.ok) {
                     const content = await postResponse.text();
                     const { data: frontmatter, content: markdownContent } = parseFrontmatter(content);
                     
                     const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                     const title = titleMatch ? titleMatch[1] : exactSlugFromKey; 
                     
                     // Extract summary
                     const lines = markdownContent.split('\n');
                     let summary = '';
                     let inSummary = false;
                     let foundH1 = false;
                     for (const line of lines) {
                         if (!foundH1) { if (line.startsWith('#')) foundH1 = true; continue; }
                         if (!inSummary && line.trim() === '') continue;
                         if (line.startsWith('#')) break;
                         inSummary = true;
                         if (line.trim() !== '') { summary = line.trim(); break; }
                     }
                     
                     // Always include header image — CDN CORS blocks HEAD; let <img> handle 404s
                     const imageR2KeyCheck = `blog/posts/${exactSlugFromKey}/header.webp`;
                     const imagePathForComponent: string | undefined = assetUrl(imageR2KeyCheck);
                     
                     const post: BlogPost = {
                         id: exactSlugFromKey, 
                         title,
                         content: markdownContent,
                         summary: summary || 'No summary available',
                         author: frontmatter.author || 'AOK',
                         published: frontmatter.published || new Date().toISOString().split('T')[0],
                         label: frontmatter.tags || frontmatter.label || 'Photography',
                         image: imagePathForComponent
                     };
                     
                     logger.log(`[+page.ts Client Load] Successfully created blog post object from R2: "${post.title}" with ID "${post.id}"`);
                     
                     // Update store and session storage
                     updateSessionStorageWithPost(post);
                     updateStoreWithPost(post);
                                          
                     return { post };
                 } else {
                     logger.error(`[+page.ts Client Load] Failed to fetch post content from R2 (${directR2Key}): ${postResponse.status}`);
                     // Fall through if content fetch fails
                 }
            } else {
                 logger.log(`[+page.ts Client Load] No matching file found for slug "${decodedSlug}" in R2 list from API.`);
                 // Fall through 
            }
        } else {
            logger.error(`[+page.ts Client Load] Fetch to /api/blog-status failed: ${statusRes.status}`);
             // Fall through
        }
    } catch (directFetchError) {
        logger.error('[+page.ts Client Load] Error during direct post fetch block:', directFetchError);
        // Fall through 
    }

    // --- Fallback: Fetch All Posts (if direct methods failed) --- 
    // This might be less efficient on the client but serves as a last resort
    // Consider if this fallback is truly needed client-side or if a 404 is better
    logger.warn('[+page.ts Client Load] Direct fetch failed or post not found in cache/store. Falling back to fetching all posts (might be slow).');
    try {
        const statusRes = await fetch('/api/blog-status', {
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        });
        logger.log(`[+page.ts Client Load Fallback] /api/blog-status status: ${statusRes.status}`);

        if (!statusRes.ok) {
            logger.error(`[+page.ts Client Load Fallback] Failed to fetch blog status: ${statusRes.status}`);
            throw error(404, 'Blog post not found (fallback status API failed)');
        }
        
        const statusData = await statusRes.json();
        if (!statusData.blogPosts?.items || statusData.blogPosts.items.length === 0) {
            logger.error('[+page.ts Client Load Fallback] No blog posts found in status data');
            throw error(404, 'Blog post not found (fallback no posts in API)');
        }
        
        logger.log(`[+page.ts Client Load Fallback] Fetching all ${statusData.blogPosts.items.length} posts via helper...`);
        // Use the fetchAllPosts helper (assuming it's adapted for client-side or works via API internally)
        const allPosts = await fetchAllPosts(statusData.blogPosts.items, fetch);
        logger.log(`[+page.ts Client Load Fallback] fetchAllPosts returned ${allPosts.length} posts`);

        // Store all posts (updates store and session storage)
        posts.set(allPosts);
        updateSessionStorageWithList(allPosts);
        
        // Now find our post again
        let targetPost = allPosts.find(p => p.id.toLowerCase() === decodedSlug.toLowerCase());
                
        if (targetPost) {
            logger.log(`[+page.ts Client Load Fallback] Found post "${targetPost.title}" with ID "${targetPost.id}" among all loaded posts`);
            return { post: targetPost };
        } else {
            logger.error(`[+page.ts Client Load Fallback] Post "${decodedSlug}" not found even after fetching all posts.`);
            throw error(404, 'Blog post not found (not in full list)');
        }
    } catch (fallbackError) {
        logger.error('[+page.ts Client Load Fallback] Error during fallback loading all posts:', fallbackError);
        // If the fallback fails, definitely throw 404
        throw error(404, 'Blog post not found (fallback error)');
    }

  } catch (e) {
    // Catch any top-level errors in the load function
    logger.error('[+page.ts Client Load] -------- Blog Post Page Load CRASHED --------');
    logger.error('An unexpected error occurred in the page load function:', e);
    logger.error('Params were:', params);
    // Ensure the thrown error matches expected types if possible
    if (e && typeof e === 'object' && 'status' in e && typeof e.status === 'number') {
        throw error(e.status, (e as any).body || 'Blog post not found due to an internal error');
    } else {
        throw error(404, 'Blog post not found due to an internal error');
    }
  }
  
  // Should theoretically be unreachable if all paths return or throw
  logger.error('[+page.ts Client Load] Execution reached end of load function unexpectedly');
  throw error(500, 'Load function completed without returning data or throwing error');
};

// --- Restored Helper Functions ---

// Helper function to update sessionStorage with a single post
function updateSessionStorageWithPost(post: BlogPost) {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            const cachedPostsJson = sessionStorage.getItem('blogPosts');
            let cachedPosts: BlogPost[] = cachedPostsJson ? JSON.parse(cachedPostsJson) : [];
            
            const existingIndex = cachedPosts.findIndex(p => p.id === post.id);
            if (existingIndex > -1) {
                cachedPosts[existingIndex] = post; // Update existing
            } else {
                cachedPosts.push(post); // Add new
            }
            sessionStorage.setItem('blogPosts', JSON.stringify(cachedPosts));
            logger.log(`[Helper] Updated sessionStorage with post "${post.id}"`);
        } catch (e) {
            logger.error('[Helper] Error updating sessionStorage:', e);
        }
    }
}

// Helper to update session storage with a list of posts
function updateSessionStorageWithList(postList: BlogPost[]) {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            sessionStorage.setItem('blogPosts', JSON.stringify(postList));
            logger.log(`[Helper] Stored ${postList.length} posts in sessionStorage`);
        } catch (e) {
            logger.error('[Helper] Error storing post list in sessionStorage:', e);
        }
    }
}

// Helper function to update the Svelte store with a single post
function updateStoreWithPost(post: BlogPost) {
    const currentPosts = get(posts);
    const existingIndex = currentPosts.findIndex(p => p.id === post.id);
    if (existingIndex > -1) {
        const updatedPosts = [...currentPosts];
        updatedPosts[existingIndex] = post;
        posts.set(updatedPosts);
    } else {
        posts.set([...currentPosts, post]);
    }
    logger.log(`[Helper] Updated Svelte store with post "${post.id}"`);
}


// Helper function to fetch all blog posts (client-side adaptation)
// Assumes the structure returned by the API status endpoint is sufficient
// or that the directr2 paths will work correctly via the hook
async function fetchAllPosts(items: { key: string }[], fetchFn: typeof fetch): Promise<BlogPost[]> {
    logger.log(`[fetchAllPosts Client] Processing ${items.length} items from API status... Dev mode: ${dev}`);
    const loadedPosts: BlogPost[] = [];

    for (const item of items) {
        try {
            const key = item.key;
            if (!key.endsWith('/index.md')) continue;

            const pathParts = key.split('/'); 
            if (pathParts.length < 4) continue;
            const exactSlug = pathParts[pathParts.length - 2]; 

            // --- Start Content Fetch (Client Fallback) ---
            let text = '';
            let fetchSource = '';
            const r2Path = assetUrl(key);
            try {
                const response = await fetchFn(r2Path);
                if (!response.ok) {
                     logger.error(`[fetchAllPosts Client] Failed to fetch R2 ${r2Path}: ${response.status}`);
                     continue; 
                }
                text = await response.text();
                fetchSource = `R2 (${r2Path})`;
             } catch (prodFetchError) {
                logger.error(`[fetchAllPosts Client] Error fetching R2 ${r2Path}:`, prodFetchError);
                continue; 
             }
            // --- End Content Fetch ---

            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : exactSlug;

            // Extract summary
            const lines = markdownContent.split('\n');
            let summary = ''; let inSummary = false; let foundH1 = false;
            for (const line of lines) {
                if (!foundH1) { if (line.startsWith('#')) foundH1 = true; continue; }
                if (!inSummary && line.trim() === '') continue;
                if (line.startsWith('#')) break;
                inSummary = true;
                if (line.trim() !== '') { summary = line.trim(); break; }
            }
            
            const tags = frontmatter.tags || frontmatter.label || 'Photography';

            // --- Image URL (Client Fallback) ---
            // Skip HEAD check — CDN CORS blocks it; always include and let <img> handle 404s
            const imagePathForComponent: string | undefined = assetUrl(`blog/posts/${exactSlug}/header.webp`);
            // --- End Image URL ---

            loadedPosts.push({
                id: exactSlug, 
                title,
                summary: summary || 'No summary available',
                content: markdownContent, 
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: tags,
                image: imagePathForComponent 
            });
        } catch (e) {
             logger.error(`[fetchAllPosts Client] Error processing item ${item?.key}:`, e);
        }
    }

    logger.log(`[fetchAllPosts Client] Successfully processed ${loadedPosts.length} posts.`);
    return loadedPosts;
}

