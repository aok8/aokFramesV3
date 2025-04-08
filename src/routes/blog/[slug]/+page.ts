import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';
import { get } from 'svelte/store';
import { posts } from '$lib/stores/blog.js';

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

export const load: PageLoad = async ({ data, params, fetch }) => {
    const { slug } = params;
    const decodedSlug = decodeURIComponent(slug);
    
    console.log(`Page load running for blog post with slug: "${decodedSlug}", data present:`, !!data);
    
    // If we have post data from the server, use it
    if (data && data.post) {
        console.log('Post data available from server:', data.post.title);
        return { post: data.post };
    }
    
    console.log('Post data not available from server, checking client sources...');
    
    // Try to fetch this specific post directly first (most reliable method in cloud)
    try {
        console.log(`Attempting direct fetch of slug "${decodedSlug}" from R2`);
        
        // First, fetch the blog status to identify the exact key
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            console.log('Blog status API response received successfully');
            
            if (statusData.blogPosts?.items?.length > 0) {
                // Log all filenames for debugging
                const allFilenames = statusData.blogPosts.items.map((item: { key: string }) => {
                    const filename = item.key.split('/').pop() || '';
                    return filename.replace(/\.md$/i, '');
                });
                console.log('All post slugs in R2:', allFilenames);
                
                // Find the post with this slug (case insensitive)
                // We need to find the exact case-preserved filename from R2
                const matchingItem = statusData.blogPosts.items.find((item: { key: string }) => {
                    const filename = item.key.split('/').pop() || '';
                    const filenameWithoutExt = filename.replace(/\.md$/i, '');
                    console.log(`Comparing: "${filenameWithoutExt.toLowerCase()}" to "${decodedSlug.toLowerCase()}"`);
                    return filenameWithoutExt.toLowerCase() === decodedSlug.toLowerCase();
                });
                
                if (matchingItem) {
                    console.log('Found direct match for post:', matchingItem.key);
                    
                    // Get the exact filename with correct case
                    const exactFilename = matchingItem.key.split('/').pop() || '';
                    const exactSlug = exactFilename.replace(/\.md$/i, '');
                    console.log(`Using exact slug from R2: ${exactSlug}`);
                    
                    // Fetch the content directly from R2
                    console.log(`Fetching post content from R2: ${matchingItem.key}`);
                    const postResponse = await fetch(`/directr2/${matchingItem.key}`);
                    if (postResponse.ok) {
                        const content = await postResponse.text();
                        const { data: frontmatter, content: markdownContent } = parseFrontmatter(content);
                        
                        // Extract title from first h1
                        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
                        const title = titleMatch ? titleMatch[1] : exactSlug;
                        
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
                        
                        // Check if image exists
                        const imageKey = `blog/images/${exactSlug}.jpg`;
                        let imageExists = false;
                        
                        try {
                            const imageResponse = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
                            imageExists = imageResponse.ok;
                            console.log(`Image exists for post: ${imageExists}`);
                        } catch (e) {
                            console.error('Error checking for image:', e);
                            imageExists = false;
                        }
                        
                        // Create post object
                        const post = {
                            id: exactSlug, // Using exact slug from R2 is crucial
                            title,
                            content: markdownContent,
                            summary,
                            author: frontmatter.author || 'AOK',
                            published: frontmatter.published || new Date().toISOString().split('T')[0],
                            label: frontmatter.tags || frontmatter.label || 'Photography',
                            image: imageExists ? `/directr2/${imageKey}` : undefined
                        };
                        
                        console.log(`Successfully created blog post from direct R2 fetch: "${post.title}" with ID "${post.id}"`);
                        
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
                        console.error(`Failed to fetch post content from R2: ${postResponse.status}`);
                    }
                } else {
                    console.log(`No matching file found for slug "${decodedSlug}" in R2 listing`);
                }
            }
        }
    } catch (directFetchError) {
        console.error('Error during direct post fetch:', directFetchError);
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
    
    // If we got here, try to load all posts and find the one we need
    try {
        console.log('Attempting to load all posts and find target post');
        
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!statusRes.ok) {
            console.error(`Failed to fetch blog status: ${statusRes.status}`);
            throw error(404, 'Blog post not found');
        }
        
        const statusData = await statusRes.json();
        console.log('Blog status API returned successfully for all posts fetch');
        
        if (!statusData.blogPosts?.items || statusData.blogPosts.items.length === 0) {
            console.error('No blog posts found in status data');
            throw error(404, 'Blog post not found');
        }
        
        console.log(`Blog status contains ${statusData.blogPosts.items.length} posts`);
        
        // Load all posts
        const allPosts = await fetchAllPosts(statusData.blogPosts.items, fetch);
        
        if (allPosts.length > 0) {
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
        }
        
        console.error(`Post with slug "${decodedSlug}" not found among loaded posts`);
        throw error(404, 'Blog post not found');
    } catch (e) {
        console.error('Error loading all posts:', e);
        throw error(404, 'Blog post not found');
    }
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