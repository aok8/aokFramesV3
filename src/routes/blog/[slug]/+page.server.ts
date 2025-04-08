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

export const load: PageServerLoad = async ({ parent, params, platform }) => {
  // First check if we can find the post in the parent data
  const { posts } = await parent();
  const slug = params.slug;
  
  console.log(`Blog post server looking for post with slug: ${slug}`);
  console.log(`${posts.length} posts available from parent layout`);
  
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
  }
  
  // Fallback to loading directly if not found in parent data
  try {
    const post = await loadBlogPost(slug, platform);
    
    if (!post) {
      console.error(`Post with slug "${slug}" not found`);
      throw error(404, 'Blog post not found');
    }
    
    console.log(`Loaded post "${post.title}" directly`);
    return { post };
  } catch (e) {
    console.error('Error loading blog post:', e);
    throw error(404, 'Blog post not found');
  }
}; 