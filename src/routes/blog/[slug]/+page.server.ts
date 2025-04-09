import { error } from '@sveltejs/kit';
import { loadBlogPost } from '$lib/server/blog.js';
import type { BlogPost } from '$lib/types/blog.js';

// Define our own PageServerLoad type
type PageServerLoad = (input: {
  params: Record<string, string>;
  platform?: any;
  parent: () => Promise<any>;
}) => Promise<{ post?: BlogPost }>;

export const load: PageServerLoad = async ({ 
  params, 
  platform, 
  parent 
}: { 
  params: Record<string, string>; 
  platform?: any; 
  parent: () => Promise<{ posts?: BlogPost[] }>;
}) => {
  // Get the slug from the URL parameters
  const { slug } = params;
  const decodedSlug = decodeURIComponent(slug);
  
  console.log(`[+page.server.ts] Loading blog post with slug: "${decodedSlug}"`);
  
  try {
    // First, check if the parent layout already loaded the posts
    const layoutData = await parent();
    console.log('[+page.server.ts] Parent data loaded, checking for post in preloaded data');
    
    if (layoutData.posts && layoutData.posts.length > 0) {
      // Try to find the post in the preloaded posts
      console.log(`[+page.server.ts] Searching for post "${decodedSlug}" in ${layoutData.posts.length} preloaded posts`);
      
      // First check for exact match
      let post = layoutData.posts.find((p: BlogPost) => p.id === decodedSlug);
      
      // If no exact match, try case-insensitive match
      if (!post) {
        post = layoutData.posts.find((p: BlogPost) => 
          p.id.toLowerCase() === decodedSlug.toLowerCase()
        );
        if (post) {
          console.log(`[+page.server.ts] Found case-insensitive match: "${post.id}"`);
        }
      }
      
      if (post) {
        console.log(`[+page.server.ts] Found post "${post.title}" in preloaded data`);
        return { post };
      }
    }
    
    // Not found in preloaded data, load directly using server API
    console.log(`[+page.server.ts] Post not found in preloaded data, loading directly`);
    const post = await loadBlogPost(decodedSlug, platform);
    
    if (post) {
      console.log(`[+page.server.ts] Successfully loaded post: "${post.title}"`);
      return { post };
    }
    
    // Post not found, throw 404
    console.error(`[+page.server.ts] Post with slug "${decodedSlug}" not found`);
    throw error(404, `Blog post "${decodedSlug}" not found`);
  } catch (e) {
    console.error(`[+page.server.ts] Error loading post "${decodedSlug}":`, e);
    throw error(404, `Error loading blog post: ${e instanceof Error ? e.message : String(e)}`);
  }
}; 