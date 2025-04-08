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

export const load: PageLoad = async ({ params, fetch }) => {
    // FIX: Directly fetch the post using the exact path from server
    // This bypasses all the matching complexity entirely
    
    const { slug } = params;
    const decodedSlug = decodeURIComponent(slug);
    
    try {
        console.log('=============================================');
        console.log('Attempting to load blog post with slug:', decodedSlug);
        
        // First check if the post is already in the store
        const storedPosts = get(posts);
        console.log('Posts in store:', storedPosts.length);
        
        if (storedPosts.length > 0) {
            console.log('Store post IDs:', storedPosts.map(p => p.id));
            
            // Try case-sensitive match first
            const storedPost = storedPosts.find(p => p.id === decodedSlug);
            if (storedPost) {
                console.log('Found post in store (exact match):', storedPost.title);
                return { post: storedPost };
            }
            
            // If no exact match, try case-insensitive
            const caseInsensitiveMatch = storedPosts.find(p => 
                p.id.toLowerCase() === decodedSlug.toLowerCase()
            );
            if (caseInsensitiveMatch) {
                console.log('Found post in store (case-insensitive):', caseInsensitiveMatch.title);
                return { post: caseInsensitiveMatch };
            }
        }
        
        // If not in store, we need to get the exact paths from the blog-status API
        console.log('Post not found in store, fetching blog status');
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!statusRes.ok) {
            console.error('Failed to fetch blog status:', statusRes.status);
            throw error(404, 'Blog post not found');
        }
        
        const statusData = await statusRes.json();
        console.log('Blog status fetched successfully');
        
        // In development mode, use the local filesystem path
        if (dev) {
            const postPath = `/src/content/blog/posts/${decodedSlug}.md`;
            console.log('Using development path:', postPath);
            
            const response = await fetch(postPath);
            if (!response.ok) {
                console.error('Failed to load post from filesystem');
                throw error(404, 'Blog post not found');
            }
            
            const text = await response.text();
            console.log('Successfully loaded markdown from filesystem');
            
            // Parse frontmatter and content
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            console.log('Parsed frontmatter:', frontmatter);
            
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
                summary: '', // Summary not needed for full post view
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imageExists ? imageKey : undefined
            };
            
            console.log('Successfully created blog post:', post.title);
            return { post };
        }
        
        // In production environment, look for all MD files in the blog/posts directory
        if (!statusData?.blogPosts?.items || statusData.blogPosts.items.length === 0) {
            console.error('No blog posts available in R2 status response');
            throw error(404, 'Blog post not found');
        }
        
        // Get all available posts from the status response
        const availablePosts = statusData.blogPosts.items;
        console.log('Available posts count:', availablePosts.length);
        console.log('Available post keys:', availablePosts.map((item: any) => item.key));
        
        // SIMPLIFIED APPROACH: Instead of complex matching logic, just find the post that has this slug
        // in its filename (case insensitive)
        // This will directly match blog/posts/NightPhoto.md with the URL slug "nightphoto"
        
        // Find any post whose filename (without extension) matches our slug (case insensitive)
        let matchedPost = null;
        for (const post of availablePosts) {
            const filename = post.key.split('/').pop() || '';
            const filenameWithoutExt = filename.replace(/\.md$/i, '');
            console.log(`Comparing ${filenameWithoutExt.toLowerCase()} with ${decodedSlug.toLowerCase()}`);
            
            if (filenameWithoutExt.toLowerCase() === decodedSlug.toLowerCase()) {
                console.log('Found matching post:', post.key);
                matchedPost = post;
                break;
            }
        }
        
        if (!matchedPost) {
            console.error('No matching post found in R2 listing');
            throw error(404, 'Blog post not found');
        }
        
        // Now we have the exact key, fetch the content directly
        console.log('Fetching post content directly from:', matchedPost.key);
        const postResponse = await fetch(`/directr2/${matchedPost.key}`);
        if (!postResponse.ok) {
            console.error('Failed to fetch post content:', postResponse.status);
            throw error(404, 'Blog post not found');
        }
        
        const content = await postResponse.text();
        console.log('Successfully loaded post content, length:', content.length);
        
        // Parse frontmatter and content
        const { data: frontmatter, content: markdownContent } = parseFrontmatter(content);
        console.log('Parsed frontmatter:', frontmatter);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled';
        
        // Extract the actual filename (preserving case) for the ID and image
        const filename = matchedPost.key.split('/').pop() || '';
        const postId = filename.replace(/\.md$/i, '');
        
        // Check if an image exists with the same name
        const imageKey = `blog/images/${postId}.jpg`;
        let imageExists = false;
        
        try {
            const imageCheckResponse = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
            imageExists = imageCheckResponse.ok;
            console.log('Image check result:', imageExists ? 'Found' : 'Not found');
        } catch (e) {
            console.error('Error checking for image:', e);
            imageExists = false;
        }
        
        // Create the post object with the EXACT ID from R2
        const post = {
            id: postId, // Preserve exact case from filename
            title,
            content: markdownContent,
            summary: '', // Not needed for full post view
            author: frontmatter.author || 'AOK',
            published: frontmatter.published || new Date().toISOString().split('T')[0],
            label: frontmatter.tags || frontmatter.label || 'Photography',
            image: imageExists ? `/directr2/${imageKey}` : undefined
        };
        
        console.log('Created post object with ID:', post.id);
        console.log('=============================================');
        return { post };
    } catch (e) {
        console.error('Error loading blog post:', e);
        
        // If it's already a SvelteKit error, rethrow it
        if (e && typeof e === 'object' && 'status' in e) {
            throw e;
        }
        
        // Otherwise, wrap it in a 404
        throw error(404, 'Blog post not found');
    }
}; 