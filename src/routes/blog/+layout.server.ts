import type { LayoutServerLoad } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js'; // Restore original import
import type { BlogPost } from '$lib/types/blog.js'; // Import BlogPost type

// Define the type for the layout data
export type BlogLayoutData = {
  posts: BlogPost[];
  r2Available: boolean;
  error?: string;
  layoutStatus?: 'skipped-post-load' | 'loaded' | 'api-fallback' | 'error'; // Add optional status
};

// Restore the original load function
export const load: LayoutServerLoad = async ({ platform, url, fetch }): Promise<BlogLayoutData> => {
    console.log('-------- Blog Layout Server Load Start (Restored) --------');
    console.log('URL:', url.pathname);
    
    const r2Available = !!platform?.env?.ASSETSBUCKET;
    console.log('Layout: R2 available:', r2Available);
    
    try {
        // First attempt: load posts using server-side functionality (filesystem in dev)
        console.log('Layout: Attempting loadBlogPosts...');
        const posts = await loadBlogPosts(platform);
        console.log(`Layout: Loaded ${posts.length} posts via loadBlogPosts`);
        
        if (posts && posts.length > 0) {
            return {
                posts,
                r2Available,
                layoutStatus: 'loaded' // Indicate success
            };
        }

        // Second attempt (Fallback): try fetching posts via API (less ideal for layout)
        console.warn('Layout: loadBlogPosts returned 0 posts. Falling back to API fetch...');
        const response = await fetch('/api/blog-posts');
        
        if (response.ok) {
            const apiPosts = await response.json();
            console.log(`Layout: API returned ${apiPosts.length} posts`);
            
            if (apiPosts && apiPosts.length > 0) {
                return {
                    posts: apiPosts,
                    r2Available,
                    layoutStatus: 'api-fallback' // Indicate API fallback used
                };
            }
        } else {
            console.error(`Layout: API fetch failed with status ${response.status}`);
        }

        // Both attempts failed
        console.error('Layout: Failed to load posts via loadBlogPosts and API.');
        return {
            posts: [],
            r2Available,
            error: 'Failed to load blog posts',
            layoutStatus: 'error' // Indicate error
        };
    } catch (error: unknown) {
        console.error('Layout: Error during layout load:', error);
        return {
            posts: [],
            r2Available,
            error: error instanceof Error ? error.message : 'Unknown error loading blog posts',
            layoutStatus: 'error' // Indicate error
        };
    }
};

/*
// Simplified layout code commented out
export const load: LayoutServerLoad = async ({ platform, url }) => {
    // ... simplified logic ...
};
*/ 