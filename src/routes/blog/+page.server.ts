import { loadBlogPosts } from '$lib/server/blog.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  // Get the posts that were already loaded in the layout
  const parentData = await parent();
  
  // If we already have posts from the layout, use those
  if (parentData.posts && parentData.posts.length > 0) {
    console.log('Blog page using posts from layout');
    return {
      posts: parentData.posts
    };
  }
  
  // This is a fallback and should not normally be reached
  console.log('Blog page falling back to loading its own posts');
  return parentData;
}; 