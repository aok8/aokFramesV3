import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import matter from 'gray-matter';

export const load: PageLoad = async ({ params, fetch }) => {
    const { slug } = params;
    
    try {
        console.log('Attempting to load blog post:', slug);
        
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
        const response = await fetch(`/directr2/blog/posts/${slug}.md`);
        if (!response.ok) {
            throw error(404, 'Blog post not found');
        }
        
        const text = await response.text();
        console.log('Successfully loaded markdown from R2');
        
        // Parse frontmatter and content
        const { data, content: markdownContent } = matter(text);
        
        // Extract title from first h1
        const titleMatch = markdownContent.match(/^#\s+(.*)/m);
        const title = titleMatch ? titleMatch[1] : slug;
        
        // Check if image exists
        const imageResponse = await fetch(`/directr2/blog/images/${slug}.jpg`, { method: 'HEAD' });
        const imageExists = imageResponse.ok;
        
        const post = {
            id: slug,
            title,
            content: markdownContent,
            summary: '', // Summary not needed for full post view
            author: data.author || 'AOK',
            published: data.published || new Date().toISOString().split('T')[0],
            label: data.tags || data.label || 'Photography',
            image: imageExists ? `/directr2/blog/images/${slug}.jpg` : undefined
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