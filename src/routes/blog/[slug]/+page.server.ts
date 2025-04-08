import type { PageServerLoad } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: R2Object[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface R2Object {
  key: string;
}

interface Params {
  slug: string;
}

export const load: PageServerLoad = async ({ parent, params, platform, url }) => {
  // Log detailed information about the request
  console.log(`Blog post server: Request for slug "${params.slug}" at URL: ${url.pathname}`);
  console.log('Platform available:', !!platform);
  console.log('R2 bucket available:', !!(platform?.env?.ASSETSBUCKET));
  
  // First check if we can find the post in the parent data
  try {
    const parentData = await parent();
    console.log(`Parent data available with ${parentData.posts?.length || 0} posts`);
    
    const slug = params.slug;
    const posts = parentData.posts || [];
    
    if (posts && posts.length > 0) {
      // Try to find the post in the already loaded posts
      // First try exact match
      let post = posts.find(p => p.id === slug);
      
      // If no exact match, try case-insensitive
      if (!post) {
        post = posts.find(p => p.id.toLowerCase() === slug.toLowerCase());
      }
      
      if (post) {
        console.log(`Found post "${post.title}" in parent data`);
        return { post };
      }
      
      console.log(`Post with slug "${slug}" not found in parent data`);
    } else {
      console.log('No posts available in parent data, will try direct loading');
    }
  } catch (parentError) {
    console.error('Error accessing parent data:', parentError);
  }
  
  // Direct loading logic
  console.log('Attempting direct post load from R2 or filesystem');
  try {
    // In development mode, try to load the post from the filesystem
    if (dev) {
      console.log('In development mode, loading from filesystem');
    } else {
      console.log('In production mode, loading from R2');
      
      // Make sure R2 is available
      if (!platform?.env?.ASSETSBUCKET) {
        console.error('ASSETSBUCKET binding not found for direct loading');
        throw error(500, 'R2 bucket not configured');
      }
    }
    
    // Try to load the blog post directly
    const slug = params.slug;
    console.log(`Loading blog post with slug "${slug}" directly`);
    
    const post = await loadBlogPost(slug, platform);
    
    if (!post) {
      console.error(`Post with slug "${slug}" not found during direct load`);
      throw error(404, 'Blog post not found');
    }
    
    console.log(`Successfully loaded post "${post.title}" directly`);
    return { post };
  } catch (e) {
    console.error('Error during direct blog post loading:', e);
    
    // Try the special case for exact filename matching
    if (!dev && platform?.env?.ASSETSBUCKET) {
      try {
        console.log('Attempting special case: listing all blog posts to find exact match');
        const objects = await platform.env.ASSETSBUCKET.list({
          prefix: 'blog/posts/'
        });
        
        if (objects.objects && objects.objects.length > 0) {
          console.log(`Found ${objects.objects.length} blog post files in R2`);
          
          // Find any file that might match our slug (case insensitive)
          const slug = params.slug;
          const matchingObject = objects.objects.find(obj => {
            const filename = obj.key.split('/').pop() || '';
            const fileSlug = filename.replace(/\.md$/i, '');
            return fileSlug.toLowerCase() === slug.toLowerCase();
          });
          
          if (matchingObject) {
            console.log(`Found matching file: ${matchingObject.key}`);
            
            // Extract the correct slug from the filename
            const filename = matchingObject.key.split('/').pop() || '';
            const exactSlug = filename.replace(/\.md$/i, '');
            
            // Try to load with the exact slug
            const post = await loadBlogPost(exactSlug, platform);
            
            if (post) {
              console.log(`Successfully loaded post "${post.title}" with exact filename match`);
              return { post };
            }
          } else {
            console.log(`No matching file found for slug "${slug}"`);
          }
        }
      } catch (listError) {
        console.error('Error listing blog posts:', listError);
      }
    }
    
    // If all else fails, throw a 404
    throw error(404, 'Blog post not found');
  }
}; 