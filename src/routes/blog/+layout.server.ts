import type { LayoutServerLoad } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js';

export const load: LayoutServerLoad = async ({ platform }) => {
    // Load all blog posts for any route under /blog/*
    // This makes the posts available for both the blog list page
    // and individual blog post pages
    
    const posts = await loadBlogPosts(platform);
    console.log(`Layout server loaded ${posts.length} blog posts`);
    
    // Return the blog posts for use in all blog routes
    return {
        posts
    };
}; 