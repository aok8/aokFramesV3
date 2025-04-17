import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';
import { get } from 'svelte/store';
import { posts } from '$lib/stores/blog.js';
import type { BlogPost } from '$lib/types/blog.js'; // Import BlogPost type

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

    // Check for header.jpg
    const imageKey = `/src/content/blog/posts/${slug}/header.jpg`;
    let imagePath: string | undefined = undefined;
    let imageExists = false;
    if (dev) {
        imagePath = `/src/content/blog/posts/${slug}/header.jpg`;
        try {
            const imgRes = await fetchFn(imagePath, { method: 'HEAD' });
            imageExists = imgRes.ok;
        } catch { imageExists = false; }
    } else {
        imagePath = `/directr2/${imageKey}`;
        try {
            const imgRes = await fetchFn(imagePath, { method: 'HEAD' });
            imageExists = imgRes.ok;
        } catch { imageExists = false; }
    }
    
    console.log(`Image check for ${slug}: ${imageExists ? imagePath : 'None'}`);
    
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
  console.log(`[+page.ts Server Load] Post data not available from server, checking client sources...`);
  
  // Define the expected return type for the function
  type LoadResult = { post: BlogPost } | { error: any; status: number }; 

  try { // Wrap entire function body in try...catch
    const { slug } = params;
    const decodedSlug = decodeURIComponent(slug);
    
    console.log(`[+page.ts Server Load] Page load running for blog post with slug: "${decodedSlug}", data present:`, !!data);
    
    // --- Development Mode Logic --- 
    if (dev) {
        console.log('Running in development mode, attempting local file fetch...');
        try {
            const postPath = `/src/content/blog/posts/${decodedSlug}/index.md`;
            console.log(`[+page.ts Server Load] Fetching post from dev path: ${postPath}`);
            const response = await fetch(postPath);
            
            if (!response.ok) {
                console.error(`Failed to fetch post in dev mode: ${response.status} ${response.statusText} for ${postPath}`);
                // Don't throw error yet, allow fallback to other methods if needed
                // (Though typically in dev, if the file isn't there, it's a 404)
                throw error(404, `Blog post file not found at ${postPath}`); 
            }
            
            const text = await response.text();
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : decodedSlug;
            
            // Check if image exists
            const imageKey = `/src/content/blog/posts/${decodedSlug}/header.jpg`;
            let imageExists = false;
            try {
                const imageResponse = await fetch(imageKey, { method: 'HEAD' });
                imageExists = imageResponse.ok;
                console.log(`Dev image check for ${imageKey}: ${imageExists}`);
            } catch (imgErr) {
                console.warn(`Dev image check failed for ${imageKey}:`, imgErr);
            }
            
            const post = {
                id: decodedSlug, // Use the decoded slug from URL in dev
                title,
                content: markdownContent,
                summary: 'Summary needs extraction in dev mode...', // Add summary extraction if needed
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imageExists ? imageKey : undefined
            };
            
            console.log('Successfully created blog post from filesystem:', post.title);
            return { post };
            
        } catch (devError) {
             console.error('Error during development mode post loading:', devError);
             // Explicitly throw 404 if dev loading fails
             throw error(404, 'Blog post not found in development environment');
        }
    }
    // --- End Development Mode Logic ---
    
    // --- Production Mode Logic --- 
    console.log('Running in production mode, proceeding with cloud logic...');
    
    // The type annotation on `data` should handle potential undefined `post`
    // SvelteKit types data based on corresponding server load, which is now removed.
    // Explicitly check `data` and `data.post` existence.
    const serverPost = (data as any)?.post as BlogPost | undefined;
    if (serverPost) {
        console.log('Post data available from server (unexpectedly?):', serverPost.title);
        return { post: serverPost };
    }
    
    console.log('[+page.ts Server Load] Post data not available from server, checking client sources...');
    
    // Try to fetch this specific post directly first (most reliable method in cloud)
    try {
        console.log(`[+page.ts Server Load] Attempting direct fetch of slug "${decodedSlug}" from R2`);
        
        // First, fetch the blog status to identify the exact key
        console.log('[+page.ts Server Load] Fetching /api/blog-status');
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        console.log(`[+page.ts Server Load] /api/blog-status response status: ${statusRes.status}`);
        
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            console.log('[+page.ts Server Load] Blog status API response received successfully');
            console.log('[+page.ts Server Load] R2 slugs from API:', statusData?.blogPosts?.slugs);
            
            // --- START REVISED MATCHING LOGIC ---
            let matchingItem: { key: string } | undefined = undefined;
            const apiSlugs: string[] = statusData?.blogPosts?.slugs || [];
            
            // Find if the requested slug exists in the slugs returned by the API (case-insensitive)
            const foundSlug = apiSlugs.find(s => s.toLowerCase() === decodedSlug.toLowerCase());
            
            if (foundSlug) {
                console.log(`[+page.ts Server Load] Found slug "${foundSlug}" in API slugs.`);
                // Reconstruct the expected key for the index.md file
                const expectedKey = `blog/posts/${foundSlug}/index.md`;
                // Find the item with this exact key in the API items list
                matchingItem = statusData.blogPosts.items.find((item: { key: string }) => item.key === expectedKey);
                 if (!matchingItem) {
                   console.warn(`[+page.ts Server Load] Slug "${foundSlug}" was in slugs list, but key "${expectedKey}" not found in items list!`);
                 }
            } else {
                console.log(`[+page.ts Server Load] Slug "${decodedSlug}" not found in API slugs list.`);
            }
            console.log(`[+page.ts Server Load] Found matchingItem using slugs list: ${!!matchingItem}`);
            // --- END REVISED MATCHING LOGIC ---
            
            if (statusData.blogPosts?.items?.length > 0) {
                // Log all filenames for debugging
                const allFilenames = statusData.blogPosts.items.map((item: { key: string }) => {
                    const filename = item.key.split('/').pop() || '';
                    return filename.replace(/\.md$/i, '');
                });
                console.log('All post slugs in R2:', allFilenames);
                
                if (matchingItem) {
                    console.log(`[+page.ts Server Load] Found direct match for post object:`, matchingItem);
                    
                    // --- Use foundSlug (which has correct case) instead of recalculating --- 
                    // const exactFilename = matchingItem.key.split('/').pop() || '';
                    // const exactSlug_OLD = exactFilename.replace(/\.md$/i, ''); // This was incorrect
                    // console.log(`[+page.ts Server Load] Using exact slug from R2: ${exactSlug}`); // Use foundSlug instead
                    const exactSlug = foundSlug!; // Use the slug identified earlier (assert non-null)
                    // ---------------------------------------------------------------------

                    // Fetch the content directly from R2
                    const directR2Key = `/directr2/${matchingItem.key}`;
                    console.log(`[+page.ts Server Load] Fetching post content from R2 via: ${directR2Key}`);
                    const postResponse = await fetch(directR2Key);
                    console.log(`[+page.ts Server Load] /directr2 fetch status: ${postResponse.status}`);

                    if (postResponse.ok) {
                        const content = await postResponse.text();
                        const { data: frontmatter, content: markdownContent } = parseFrontmatter(content);
                        
                        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                        const title = titleMatch ? titleMatch[1] : exactSlug; // Use correct exactSlug
                        
                        // Extract first paragraph after title for summary
                        const lines = markdownContent.split('\n');
                        let summaryLines = [];
                        let foundTitle = false;
                        
                        for (const line of lines) {
                            // Skip until we find the title
                            if (!foundTitle) {
                                if (line.startsWith('#')) {
                                    foundTitle = true;
                                }
                                continue;
                            }
                            
                            // Skip empty lines after title
                            if (line.trim() === '') continue;
                            
                            // First non-empty line after title is our summary
                            summaryLines.push(line.trim());
                            break;
                        }
                        
                        const summary = summaryLines.join(' ') || 'No summary available';
                        
                        // Check if image exists using the correct exactSlug
                        const imageKey = `blog/${exactSlug}/header.jpg`; 
                        let imageExists = false;
                        
                        try {
                            const imageCheckUrl = `/directr2/${imageKey}`;
                            console.log(`[+page.ts Server Load] Checking for header image via HEAD: ${imageCheckUrl}`);
                            const imageResponse = await fetch(imageCheckUrl, { method: 'HEAD' });
                            imageExists = imageResponse.ok;
                            console.log(`[+page.ts Server Load] Image exists for post "${exactSlug}": ${imageExists}`);
                        } catch (e) {
                            console.error(`[+page.ts Server Load] Error checking for image "${imageKey}":`, e);
                            imageExists = false;
                        }
                        
                        // Create post object using the correct exactSlug for ID
                        const post = {
                            id: exactSlug, // Use correct exactSlug
                            title,
                            content: markdownContent,
                            summary,
                            author: frontmatter.author || 'AOK',
                            published: frontmatter.published || new Date().toISOString().split('T')[0],
                            label: frontmatter.tags || frontmatter.label || 'Photography',
                            image: imageExists ? `/directr2/${imageKey}` : undefined
                        };
                        
                        console.log(`[+page.ts Server Load] Successfully created blog post object: "${post.title}" with ID "${post.id}"`);
                        
                        // Update the store with this post
                        const currentPosts = get(posts);
                        if (currentPosts.length > 0) {
                            if (!currentPosts.some(p => p.id === post.id)) {
                                console.log(`Adding post "${post.id}" to existing store with ${currentPosts.length} posts`);
                                posts.set([...currentPosts, post]);
                            }
                        } else {
                            console.log(`Initializing store with post "${post.id}"`);
                            posts.set([post]);
                        }
                        
                        // Update session storage
                        updateSessionStorage(post);
                        
                        return { post };
                    } else {
                        console.error(`[+page.ts Server Load] Failed to fetch post content from R2: ${postResponse.status}`);
                        // Continue to fallback if direct content fetch fails
                    }
                } else {
                    console.log(`[+page.ts Server Load] No matching file found for slug "${decodedSlug}" in R2 listing from API.`);
                    // Continue to fallback
                }
            } else {
              console.log('[+page.ts Server Load] API status reported 0 items.');
              // Continue to fallback
            }
        } else {
            console.error(`[+page.ts Server Load] Fetch to /api/blog-status failed: ${statusRes.status}`);
            // Continue to fallback
        }
    } catch (directFetchError) {
        console.error('[+page.ts Server Load] Error during direct post fetch block:', directFetchError);
        // Continue to fallback
    }
    
    // If direct fetch failed, check sessionStorage
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            console.log('Checking sessionStorage for cached posts');
            const cachedPostsJson = sessionStorage.getItem('blogPosts');
            
            if (cachedPostsJson) {
                const cachedPosts = JSON.parse(cachedPostsJson);
                console.log(`SessionStorage has ${cachedPosts.length} cached posts`);
                
                if (cachedPosts && cachedPosts.length > 0) {
                    // Log all cached post IDs for debugging
                    console.log('All cached post IDs:', cachedPosts.map((p: { id: string }) => p.id));
                    
                    // Try to find the post in the cached posts - first with exact match
                    let postFromSession = cachedPosts.find((p: { id: string }) => p.id === decodedSlug);
                    
                    // If no exact match, try case-insensitive match
                    if (!postFromSession) {
                        postFromSession = cachedPosts.find((p: { id: string }) => 
                            p.id.toLowerCase() === decodedSlug.toLowerCase()
                        );
                        
                        if (postFromSession) {
                            console.log(`Found case-insensitive match for "${decodedSlug}" as "${postFromSession.id}"`);
                        }
                    }
                    
                    if (postFromSession) {
                        console.log('Post found in sessionStorage:', postFromSession.title);
                        
                        // Update the store with all cached posts 
                        console.log('Updating store with all cached posts');
                        posts.set(cachedPosts);
                        
                        return { post: postFromSession };
                    }
                }
            }
        } catch (storageError) {
            console.error('Error accessing sessionStorage:', storageError);
        }
    }
    
    // Check the store for the post
    const storedPosts = get(posts);
    console.log(`Store has ${storedPosts.length} posts`);
    
    if (storedPosts && storedPosts.length > 0) {
        // Log all post IDs for debugging
        console.log('All post IDs in store:', storedPosts.map(p => p.id));
        
        // Try to find the post in the store - first with exact match
        let storedPost = storedPosts.find(p => p.id === decodedSlug);
        
        // If no exact match, try case-insensitive match
        if (!storedPost) {
            storedPost = storedPosts.find(p => 
                p.id.toLowerCase() === decodedSlug.toLowerCase()
            );
            
            if (storedPost) {
                console.log(`Found case-insensitive match for "${decodedSlug}" as "${storedPost.id}"`);
            }
        }
        
        if (storedPost) {
            console.log('Post found in store:', storedPost.title);
            return { post: storedPost };
        }
    }
    
    // --- Fallback to fetchAllPosts --- 
    try {
        console.log('[+page.ts Server Load] Fallback: Attempting to load all posts and find target post');
        
        // Re-fetch status just in case (could optimize later)
        const statusRes = await fetch('/api/blog-status', {
            headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        });
        console.log(`[+page.ts Server Load Fallback] /api/blog-status status: ${statusRes.status}`);

        if (!statusRes.ok) {
            console.error(`[+page.ts Server Load Fallback] Failed to fetch blog status: ${statusRes.status}`);
            throw error(404, 'Blog post not found (status API failed)');
        }
        
        const statusData = await statusRes.json();
        console.log('[+page.ts Server Load Fallback] Blog status API returned successfully');
        console.log('[+page.ts Server Load Fallback] R2 items from API:', statusData?.blogPosts?.items?.length);

        if (!statusData.blogPosts?.items || statusData.blogPosts.items.length === 0) {
            console.error('[+page.ts Server Load Fallback] No blog posts found in status data');
            throw error(404, 'Blog post not found (no posts in API)');
        }
        
        console.log(`[+page.ts Server Load Fallback] Fetching all ${statusData.blogPosts.items.length} posts`);
        // Load all posts using the HELPER function, NOT the API endpoint
        const allPosts = await fetchAllPosts(statusData.blogPosts.items, fetch);
        console.log(`[+page.ts Server Load Fallback] fetchAllPosts returned ${allPosts.length} posts`);

        // Store all posts
        posts.set(allPosts);
        
        // Store in sessionStorage
        if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.setItem('blogPosts', JSON.stringify(allPosts));
                console.log(`Stored ${allPosts.length} posts in sessionStorage`);
            } catch (e) {
                console.error('Error storing posts in sessionStorage:', e);
            }
        }
        
        // Now find our post - first with exact match
        let targetPost = allPosts.find((p: any) => p.id === decodedSlug);
        
        // If no exact match, try case-insensitive match
        if (!targetPost) {
            targetPost = allPosts.find((p: any) => 
                p.id.toLowerCase() === decodedSlug.toLowerCase()
            );
            
            if (targetPost) {
                console.log(`Found case-insensitive match for "${decodedSlug}" as "${targetPost.id}"`);
            }
        }
        
        if (targetPost) {
            console.log(`Found post "${targetPost.title}" with ID "${targetPost.id}" among all loaded posts`);
            return { post: targetPost };
        }
    } catch (e) {
        console.error('[+page.ts Server Load Fallback] Error loading all posts:', e);
        throw error(404, 'Blog post not found (fallback error)');
    }

  } catch (e) {
    console.error('[+page.ts Server Load] -------- Blog Post Page Load CRASHED --------');
    console.error('An unexpected error occurred in the page load function:', e);
    // Log params for context
    console.error('Params were:', params);
    console.error('Data was:', data);
    // Ensure the thrown error matches expected types if possible, 
    // but SvelteKit handles re-thrown errors
    throw error(404, 'Blog post not found due to an internal error');
  }
  
  // Add a final return/throw if somehow execution reaches here (shouldn't happen)
  console.error('Execution reached end of load function unexpectedly');
  throw error(500, 'Load function completed without returning data');
};

// Helper function to update sessionStorage with a post
function updateSessionStorage(post: any) {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        try {
            const cachedPostsJson = sessionStorage.getItem('blogPosts');
            let cachedPosts = cachedPostsJson ? JSON.parse(cachedPostsJson) : [];
            
            // Add our post if it's not already there
            if (!cachedPosts.some((p: any) => p.id === post.id)) {
                cachedPosts.push(post);
                sessionStorage.setItem('blogPosts', JSON.stringify(cachedPosts));
                console.log(`Updated sessionStorage with post "${post.id}"`);
            }
        } catch (e) {
            console.error('Error updating sessionStorage:', e);
        }
    }
}

// Helper function to fetch all blog posts
async function fetchAllPosts(items: any[], fetch: any) {
    console.log(`Fetching ${items.length} posts...`);
    const loadedPosts = [];
    
    for (const item of items) {
        try {
            const key = item.key;
            const filename = key.split('/').pop() || '';
            const slug = filename.replace(/\.md$/i, '');
            
            // Direct fetch from R2
            const response = await fetch(`/directr2/${key}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`Successfully loaded ${slug} directly`);
                
                // Parse frontmatter and content
                const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
                
                // Extract title from first h1
                const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                const title = titleMatch ? titleMatch[1] : slug;
                
                // Extract first paragraph after title for summary
                const lines = markdownContent.split('\n');
                let summaryLines = [];
                let foundTitle = false;
                
                for (const line of lines) {
                    // Skip until we find the title
                    if (!foundTitle) {
                        if (line.startsWith('#')) {
                            foundTitle = true;
                        }
                        continue;
                    }
                    
                    // Skip empty lines after title
                    if (line.trim() === '') continue;
                    
                    // First non-empty line after title is our summary
                    summaryLines.push(line.trim());
                    break;
                }
                
                const summary = summaryLines.join(' ') || 'No summary available';
                
                // Get tags from frontmatter
                const tags = frontmatter.tags || frontmatter.label || 'Photography';
                
                // IMPORTANT: Preserve the exact slug from the filename in R2
                const exactSlug = filename.replace(/\.md$/i, '');
                
                // Simplified post object
                loadedPosts.push({
                    id: exactSlug, // Preserve the original case from R2
                    title,
                    summary,
                    content: markdownContent,
                    author: frontmatter.author || 'AOK',
                    published: frontmatter.published || new Date().toISOString().split('T')[0],
                    label: tags,
                    image: `/directr2/blog/images/${exactSlug}.jpg`
                });
            }
        } catch (e) {
            console.error('Error directly loading post:', e);
        }
    }
    
    console.log(`Successfully loaded ${loadedPosts.length} posts directly`);
    return loadedPosts;
} 