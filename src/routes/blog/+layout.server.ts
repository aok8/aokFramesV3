import type { LayoutServerLoad } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js';

export const load: LayoutServerLoad = async ({ platform, url }) => {
    // Log the current URL for debugging
    console.log(`Blog layout server load executing for URL: ${url.pathname}`);
    
    try {
        // Load all blog posts for any route under /blog/*
        // This makes the posts available for both the blog list page
        // and individual blog post pages
        console.log('Blog layout attempting to load posts...');
        
        const posts = await loadBlogPosts(platform);
        console.log(`Blog layout server loaded ${posts.length} blog posts`);
        
        // Return the blog posts for use in all blog routes
        return {
            posts,
            postsLoadedAt: new Date().toISOString() // Add a timestamp for debugging
        };
    } catch (error) {
        console.error('Error in blog layout server load:', error);
        // Return empty posts array to prevent errors in child routes
        return {
            posts: [],
            error: 'Failed to load blog posts'
        };
    }
}; 