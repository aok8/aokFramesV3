import type { LayoutServerLoad } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js';
import type { BlogPost } from '$lib/types/blog.js';
import { createServerLogger } from '$lib/utils/logger.js';

// Define the type for the layout data
export type BlogLayoutData = {
  posts: BlogPost[];
  r2Available: boolean;
  error?: string;
  layoutStatus?: 'skipped-post-load' | 'loaded' | 'api-fallback' | 'error';
};

export const load: LayoutServerLoad = async ({ platform, url, fetch }): Promise<BlogLayoutData> => {
    const serverLogger = createServerLogger(platform?.env);
    
    serverLogger.log('-------- Blog Layout Server Load Start (Restored) --------');
    serverLogger.log('URL:', url.pathname);
    
    const r2Available = !!platform?.env?.ASSETSBUCKET;
    serverLogger.log('Layout: R2 available:', r2Available);
    
    try {
        // First attempt: load posts using server-side functionality (filesystem in dev)
        serverLogger.log('Layout: Attempting loadBlogPosts...');
        const posts = await loadBlogPosts(platform);
        serverLogger.log(`Layout: Loaded ${posts.length} posts via loadBlogPosts`);
        
        if (posts && posts.length > 0) {
            return {
                posts,
                r2Available,
                layoutStatus: 'loaded' // Indicate success
            };
        }

        // Second attempt (Fallback): try fetching posts via API (less ideal for layout)
        serverLogger.warn('Layout: loadBlogPosts returned 0 posts. Falling back to API fetch...');
        const response = await fetch('/api/blog-posts');
        
        if (response.ok) {
            const apiPosts = await response.json();
            serverLogger.log(`Layout: API returned ${apiPosts.length} posts`);
            
            if (apiPosts && apiPosts.length > 0) {
                return {
                    posts: apiPosts,
                    r2Available,
                    layoutStatus: 'api-fallback' // Indicate API fallback used
                };
            }
        } else {
            serverLogger.error(`Layout: API fetch failed with status ${response.status}`);
        }

        // Both attempts failed
        serverLogger.error('Layout: Failed to load posts via loadBlogPosts and API.');
        return {
            posts: [],
            r2Available,
            error: 'Failed to load blog posts',
            layoutStatus: 'error' // Indicate error
        };
    } catch (error: unknown) {
        serverLogger.error('Layout: Error during layout load:', error);
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
