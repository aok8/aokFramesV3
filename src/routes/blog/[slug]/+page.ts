import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
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
    const { slug } = params;
    
    try {
        console.log('Attempting to load blog post:', slug);
        
        // Check if the post is already in the store
        const storedPosts = get(posts);
        const storedPost = storedPosts.find(p => p.id === slug);
        if (storedPost) {
            console.log('Found post in store:', storedPost.title);
            return { post: storedPost };
        }
        
        // First try the API endpoint
        try {
            const response = await fetch(`/api/blog-posts/${slug}`);
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const post = await response.json();
                console.log('Successfully loaded blog post from API:', post.title);
                return { post };
            }
            
            console.log('API endpoint failed, attempting direct R2 fetch');
        } catch (e) {
            console.error('API endpoint error:', e);
            console.log('Falling back to direct R2 fetch');
        }
        
        // If API fails, try direct R2 fetch
        const key = `blog/posts/${slug}.md`;
        console.log('Attempting to fetch from R2:', key);
        const response = await fetch(`/directr2/${key}`);
        if (!response.ok) {
            console.error('Failed to load post directly from R2:', response.status);
            throw error(404, 'Blog post not found');
        }
        
        const text = await response.text();
        console.log('Successfully loaded markdown from R2');
        
        // Parse frontmatter and content
        const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
        console.log('Parsed frontmatter:', frontmatter);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : slug;
        
        // Check if image exists
        const imageKey = `blog/images/${slug}.jpg`;
        const imageResponse = await fetch(`/directr2/${imageKey}`, { method: 'HEAD' });
        const imageExists = imageResponse.ok;
        
        const post = {
            id: slug,
            title,
            content: markdownContent,
            summary: '', // Summary not needed for full post view
            author: frontmatter.author || 'AOK',
            published: frontmatter.published || new Date().toISOString().split('T')[0],
            label: frontmatter.tags || frontmatter.label || 'Photography',
            image: imageExists ? `/directr2/${imageKey}` : undefined
        };
        
        console.log('Successfully created blog post from R2:', post.title);
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