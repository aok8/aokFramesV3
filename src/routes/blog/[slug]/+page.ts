import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { dev } from '$app/environment';

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
        
        // Try checking blog status first to determine the correct path
        console.log('Checking blog status');
        const statusRes = await fetch('/api/blog-status', {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!statusRes.ok) {
            console.error('Failed to fetch blog status');
            throw error(404, 'Blog post not found');
        }
        
        const statusData = await statusRes.json();
        console.log('Blog R2 status:', statusData);
        console.log('Blog posts in R2:', JSON.stringify(statusData.blogPosts?.items, null, 2));
        
        // Check if we're in development mode (no ASSETSBUCKET)
        if (statusData.status === 'error' && statusData.message === 'ASSETSBUCKET binding not found') {
            console.log('Development mode detected, using filesystem path');
            // In development mode, use the filesystem path
            const devPath = `/src/content/blog/posts/${slug}.md`;
            console.log('Attempting to fetch from:', devPath);
            
            const devResponse = await fetch(devPath);
            if (!devResponse.ok) {
                console.error('Failed to load from filesystem');
                throw error(404, 'Blog post not found');
            }
            
            const text = await devResponse.text();
            console.log('Successfully loaded markdown from filesystem');
            
            // Parse frontmatter and content
            const { data: frontmatter, content: markdownContent } = parseFrontmatter(text);
            console.log('Parsed frontmatter:', frontmatter);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : slug;
            
            // Check if image exists
            const imageKey = `/src/content/blog/images/${slug}.jpg`;
            const imageResponse = await fetch(imageKey, { method: 'HEAD' });
            const imageExists = imageResponse.ok;
            
            const post = {
                id: slug,
                title,
                content: markdownContent,
                summary: '', // Summary not needed for full post view
                author: frontmatter.author || 'AOK',
                published: frontmatter.published || new Date().toISOString().split('T')[0],
                label: frontmatter.tags || frontmatter.label || 'Photography',
                image: imageExists ? imageKey : undefined
            };
            
            console.log('Successfully created blog post from filesystem:', post.title);
            return { post };
        }
        
        // In production/cloud mode, find the post in the blog status
        const postItem = statusData.blogPosts?.items?.find((item: any) => {
            const filename = item.key.split('/').pop() || '';
            const itemSlug = filename.replace(/\.md$/i, '');
            console.log('Comparing:', itemSlug, 'with', slug);
            return itemSlug === slug;
        });
        
        if (!postItem) {
            console.error('Blog post not found in R2 listing');
            throw error(404, 'Blog post not found');
        }
        
        // Use the exact key from the listing for direct fetch
        console.log('Found post in R2 listing, using key:', postItem.key);
        const response = await fetch(`/directr2/${postItem.key}`);
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
        
        // Check if image exists using the same key pattern as the post
        const imageKey = postItem.key.replace('/posts/', '/images/').replace('.md', '.jpg');
        console.log('Checking for image at:', imageKey);
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