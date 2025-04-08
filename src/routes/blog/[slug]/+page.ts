import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, fetch }) => {
    const { slug } = params;
    
    try {
        // First try the API endpoint
        const response = await fetch(`/api/blog-posts/${slug}`);
        if (!response.ok) {
            throw error(404, 'Blog post not found');
        }
        
        const post = await response.json();
        return { post };
    } catch (e) {
        console.error('Error loading blog post:', e);
        throw error(404, 'Blog post not found');
    }
}; 