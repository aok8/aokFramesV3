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
  
  const slug = params.slug;
  const decodedSlug = decodeURIComponent(slug);
  
  // Set up an array to track all attempted methods for loading the post
  const attemptedMethods: string[] = [];
  const errorMessages: string[] = [];
  
  // First check if we can find the post in the parent data
  try {
    attemptedMethods.push('parent-data');
    const parentData = await parent();
    console.log(`Parent data available with ${parentData.posts?.length || 0} posts`);
    
    const posts = parentData.posts || [];
    
    if (posts && posts.length > 0) {
      // Try to find the post in the already loaded posts
      // First try exact match
      let post = posts.find((p: { id: string }) => p.id === decodedSlug);
      
      // If no exact match, try case-insensitive
      if (!post) {
        post = posts.find((p: { id: string }) => p.id.toLowerCase() === decodedSlug.toLowerCase());
      }
      
      if (post) {
        console.log(`Found post "${post.title}" in parent data`);
        return { post, method: 'parent-data', errorMessages };
      }
      
      console.log(`Post with slug "${decodedSlug}" not found in parent data`);
    } else {
      console.log('No posts available in parent data, will try direct loading');
    }
  } catch (parentError) {
    console.error('Error accessing parent data:', parentError);
    errorMessages.push(`Parent data error: ${parentError instanceof Error ? parentError.message : 'Unknown error'}`);
  }
  
  // Direct loading logic
  console.log('Attempting direct post load from R2 or filesystem');
  
  // In development mode, try to load the post from the filesystem
  if (dev) {
    attemptedMethods.push('filesystem');
    try {
      console.log('In development mode, loading from filesystem');
      const post = await loadBlogPost(decodedSlug, platform);
      
      if (post) {
        console.log(`Successfully loaded post "${post.title}" directly from filesystem`);
        return { post, method: 'filesystem', errorMessages };
      }
    } catch (fsError) {
      console.error('Error loading post from filesystem:', fsError);
      errorMessages.push(`Filesystem error: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`);
    }
  } else {
    // Production mode - try direct R2 loading
    attemptedMethods.push('r2-direct');
    try {
      console.log('In production mode, loading from R2');
      
      // Make sure R2 is available
      if (!platform?.env?.ASSETSBUCKET) {
        console.error('ASSETSBUCKET binding not found for direct loading');
        errorMessages.push('R2 bucket not configured');
        throw new Error('ASSETSBUCKET binding not found');
      }
      
      // Try to load the blog post directly
      console.log(`Loading blog post with slug "${decodedSlug}" directly from R2`);
      
      const post = await loadBlogPost(decodedSlug, platform);
      
      if (post) {
        console.log(`Successfully loaded post "${post.title}" directly from R2`);
        return { post, method: 'r2-direct', errorMessages };
      }
    } catch (r2Error) {
      console.error('Error loading post directly from R2:', r2Error);
      errorMessages.push(`R2 direct error: ${r2Error instanceof Error ? r2Error.message : 'Unknown error'}`);
    }
    
    // Try the special case for exact filename matching
    attemptedMethods.push('r2-listing');
    try {
      console.log('Post not found with exact slug, attempting to find by listing all posts');
      
      // Skip if R2 is not available
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }
      
      console.log('Listing all blog posts to find exact match');
      const objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'blog/posts/'
      });
      
      if (!objects?.objects || objects.objects.length === 0) {
        console.error('No blog post files found in R2 listing');
        errorMessages.push('No blog post files found in R2 listing');
        throw new Error('No blog post files found in R2');
      }
      
      console.log(`Found ${objects.objects.length} blog post files in R2`);
      
      // Log all filenames for debugging
      const allFilenames = objects.objects.map((obj: R2Object) => {
        const filename = obj.key.split('/').pop() || '';
        return filename.replace(/\.md$/i, '');
      });
      console.log('All post slugs in R2:', allFilenames);
      
      // Find any file that might match our slug (case insensitive)
      const matchingObject = objects.objects.find((obj: R2Object) => {
        const filename = obj.key.split('/').pop() || '';
        const fileSlug = filename.replace(/\.md$/i, '');
        console.log(`Comparing: "${fileSlug.toLowerCase()}" to "${decodedSlug.toLowerCase()}"`);
        return fileSlug.toLowerCase() === decodedSlug.toLowerCase();
      });
      
      if (!matchingObject) {
        console.log(`No matching file found for slug "${decodedSlug}"`);
        errorMessages.push(`No matching file found in R2 listing for slug: ${decodedSlug}`);
        throw new Error(`No matching file found for slug "${decodedSlug}"`);
      }
      
      console.log(`Found matching file: ${matchingObject.key}`);
      
      // Extract the correct slug from the filename
      const filename = matchingObject.key.split('/').pop() || '';
      const exactSlug = filename.replace(/\.md$/i, '');
      
      console.log(`Using exact slug from R2: ${exactSlug}`);
      
      // Try to load with the exact slug
      const post = await loadBlogPost(exactSlug, platform);
      
      if (!post) {
        console.error(`Failed to load post content for matched file: ${matchingObject.key}`);
        errorMessages.push(`Failed to load post content for matched file: ${matchingObject.key}`);
        throw new Error(`Failed to load post content for matched file: ${matchingObject.key}`);
      }
      
      console.log(`Successfully loaded post "${post.title}" with exact filename match`);
      return { post, method: 'r2-listing', errorMessages };
      
    } catch (listError) {
      console.error('Error listing blog posts:', listError);
      errorMessages.push(`R2 listing error: ${listError instanceof Error ? listError.message : 'Unknown error'}`);
    }
  }
  
  // If we got here, all methods failed
  console.error(`All methods failed to load post with slug "${decodedSlug}"`);
  console.error('Attempted methods:', attemptedMethods.join(', '));
  console.error('Error messages:', errorMessages);
  
  throw error(404, {
    message: 'Blog post not found',
    attemptedMethods,
    errorMessages
  } as {
    message: string;
    attemptedMethods: string[];
    errorMessages: string[];
  });
}; 