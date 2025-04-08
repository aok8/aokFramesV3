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
    
    console.log('Post data not available from server, checking store...');
    
    // Check the store for the post
    const storedPosts = get(posts);
    console.log(`Store has ${storedPosts.length} posts`);
    
    if (storedPosts && storedPosts.length > 0) {
        // Log all post IDs for debugging
        console.log('All post IDs in store:', storedPosts.map(p => p.id));
        
        // Try to find the post in the store
        // First try exact match
        const storedPost = storedPosts.find(p => p.id === decodedSlug) ||
                           storedPosts.find(p => p.id.toLowerCase() === decodedSlug.toLowerCase());
        
        if (storedPost) {
            console.log('Post found in store:', storedPost.title);
            return { post: storedPost };
        }
    }
    
    // Check sessionStorage for posts (client-side only)
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
                    
                    // Try to find the post in the cached posts
                    // First try exact match
                    const cachedPost = cachedPosts.find((p: { id: string }) => p.id === decodedSlug) ||
                                      cachedPosts.find((p: { id: string }) => p.id.toLowerCase() === decodedSlug.toLowerCase());
                    
                    if (cachedPost) {
                        console.log('Post found in sessionStorage:', cachedPost.title);
                        
                        // Update the store with all cached posts if the store is empty
                        if (storedPosts.length === 0) {
                            console.log('Updating empty store with all cached posts');
                            posts.set(cachedPosts);
                        }
                        
                        return { post: cachedPost };
                    }
                }
            }
        } catch (storageError) {
            console.error('Error accessing sessionStorage:', storageError);
        }
    }
    
    console.log('Post not found in store or sessionStorage, attempting direct fetch...');
    
    // As a last resort, try to fetch the blog status and find the post
    try {
        // Fetch the blog status to get the list of available posts
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
        console.log('Blog status API returned successful response');
        
        if (statusData.blogPosts?.items) {
            console.log(`Blog status contains ${statusData.blogPosts.items.length} posts`);
            // Log some post keys for debugging
            const samplePostKeys = statusData.blogPosts.items.slice(0, 3).map((item: { key: string }) => item.key);
            console.log('Sample post keys:', samplePostKeys);
        }
        
        // In development mode, use local filesystem
        if (dev) {
            // Development mode logic
            const postPath = `/src/content/blog/posts/${decodedSlug}.md`;
            console.log(`Fetching from dev path: ${postPath}`);
            const response = await fetch(postPath);
            if (!response.ok) {
                console.error(`Failed to fetch post in dev mode: ${response.status}`);
                throw error(404, 'Blog post not found');
            }
            
            const text = await response.text();
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : decodedSlug;
            
            // Check if image exists
            const imageKey = `/src/content/blog/images/${decodedSlug}.jpg`;
            const imageResponse = await fetch(imageKey, { method: 'HEAD' });
            const imageExists = imageResponse.ok;
            
            const post = {
                id: decodedSlug,
                title,
                content: markdownContent,
                summary: '',
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imageExists ? imageKey : undefined
            };
            
            console.log('Successfully created blog post from filesystem:', post.title);
            return { post };
        }
        
        // In production, find the post in the R2 listing
        if (!statusData.blogPosts?.items) {
            console.error('No blog posts found in status data');
            throw error(404, 'Blog post not found');
        }
        
        // Find the post that matches our slug (case insensitive)
        console.log(`Looking for post matching slug: "${decodedSlug}" in R2 listing`);
        
        // Log all filenames for debugging
        const allFilenames = statusData.blogPosts.items.map((item: { key: string }) => {
            const filename = item.key.split('/').pop() || '';
            return filename.replace(/\.md$/i, '');
        });
        console.log('All post slugs in R2:', allFilenames);
        
        let matchedPost = null;
        for (const post of statusData.blogPosts.items) {
            const filename = post.key.split('/').pop() || '';
            const filenameWithoutExt = filename.replace(/\.md$/i, '');
            
            console.log(`Comparing: "${filenameWithoutExt.toLowerCase()}" to "${decodedSlug.toLowerCase()}"`);
            
            if (filenameWithoutExt.toLowerCase() === decodedSlug.toLowerCase()) {
                console.log('Found direct match for post:', post.key);
                matchedPost = post;
                break;
            }
        }
        
        if (!matchedPost) {
            console.error(`No matching post found in R2 listing for slug "${decodedSlug}"`);
            throw error(404, 'Blog post not found');
        }
        
        // Fetch the post content directly from R2
        console.log(`Fetching post content from R2: ${matchedPost.key}`);
        const postResponse = await fetch(`/directr2/${matchedPost.key}`);
        if (!postResponse.ok) {
            console.error(`Failed to fetch post content from R2: ${postResponse.status}`);
            throw error(404, 'Blog post not found');
        }
        
        const content = await postResponse.text();
        const { data: frontmatter, content: markdownContent } = parseFrontmatter(content);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled';
        
        // Extract the filename for the post ID and image
        const filename = matchedPost.key.split('/').pop() || '';
        const postId = filename.replace(/\.md$/i, '');
        
        // Check if image exists
        const imageKey = `blog/images/${postId}.jpg`;
        let imageExists = false;
        
        try {
            const imageResponse = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
            imageExists = imageResponse.ok;
            console.log(`Image exists for post: ${imageExists}`);
        } catch (e) {
            console.error('Error checking for image:', e);
            imageExists = false;
        }
        
        // Create the post object
        const post = {
            id: postId,
            title,
            content: markdownContent,
            summary: '',
            author: frontmatter.author || 'AOK',
            published: frontmatter.published || new Date().toISOString().split('T')[0],
            label: frontmatter.tags || frontmatter.label || 'Photography',
            image: imageExists ? `/directr2/${imageKey}` : undefined
        };
        
        console.log(`Successfully created blog post from direct R2 fetch: "${post.title}" with ID "${post.id}"`);
        
        // Update the store with this post
        const currentPosts = get(posts);
        if (currentPosts.length > 0) {
            // Only add if not already in the store
            if (!currentPosts.some(p => p.id === post.id)) {
                console.log(`Adding post "${post.id}" to existing store with ${currentPosts.length} posts`);
                posts.set([...currentPosts, post]);
            }
        } else {
            // Initialize the store with just this post
            console.log(`Initializing store with post "${post.id}"`);
            posts.set([post]);
        }
        
        return { post };
        
    } catch (e) {
        console.error('Error directly loading blog post:', e);
        throw error(404, 'Blog post not found');
    }
}; 