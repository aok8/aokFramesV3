import type { LayoutServerLoad } from './$types.js';
// import { loadBlogPosts } from '$lib/server/blog.js'; // Comment out original import

export const load: LayoutServerLoad = async ({ platform, url }) => {
    console.log('-------- Blog Layout Server Load Start (Simplified) --------');
    console.log('URL:', url.pathname);
    
    const r2Available = !!platform?.env?.ASSETSBUCKET;
    console.log('Layout: R2 available:', r2Available);
    
    // Temporarily skip loading posts here to isolate issues
    // Let the page-specific loads handle fetching for now
    console.log('Layout: Skipping post loading, returning empty array.');
    
    return {
        posts: [], // Return empty array
        r2Available,
        // Indicate that the layout load itself didn't fail, but didn't load posts
        layoutStatus: 'skipped-post-load' 
    };
};

/*
// Original layout load code commented out
import { loadBlogPosts } from '$lib/server/blog.js';

export const load: LayoutServerLoad = async ({ platform, url, fetch }) => {
    console.log('Blog +layout.server.ts loading, URL:', url.pathname);
    
    const r2Available = !!platform?.env?.ASSETSBUCKET;
    console.log('R2 available in layout:', r2Available);
    
    try {
        // First attempt: load posts using server-side functionality
        const posts = await loadBlogPosts(platform);
        console.log(`Loaded ${posts.length} posts in layout server`);
        
        if (posts && posts.length > 0) {
            return {
                posts,
                r2Available
            };
        }

        // Second attempt: try fetching posts via API
        console.log('Falling back to API fetch in layout server');
        const response = await fetch('/api/blog-posts');
        
        if (response.ok) {
            const apiPosts = await response.json();
            console.log(`API returned ${apiPosts.length} posts in layout server`);
            
            if (apiPosts && apiPosts.length > 0) {
                return {
                    posts: apiPosts,
                    r2Available
                };
            }
        } else {
            console.error(`API fetch failed with status ${response.status} in layout server`);
        }

        // Both attempts failed
        console.error('Failed to load posts in both ways');
        return {
            posts: [],
            r2Available,
            error: 'Failed to load blog posts'
        };
    } catch (error: unknown) {
        console.error('Error in blog layout load:', error);
        return {
            posts: [],
            r2Available,
            error: error instanceof Error ? error.message : 'Unknown error loading blog posts'
        };
    }
};
*/ 