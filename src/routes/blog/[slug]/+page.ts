import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, fetch }) => {
    const { slug } = params;
    
    try {
        console.log('Attempting to load blog post:', slug);
        
        // First try the API endpoint
        const response = await fetch(`/api/blog-posts/${slug}`);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            // Try to get more detailed error information
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw error(response.status, errorText || 'Blog post not found');
        }
        
        const post = await response.json();
        console.log('Successfully loaded blog post:', post.title);
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