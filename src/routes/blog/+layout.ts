import type { LayoutLoad } from './$types.js';
import { posts as postsStore } from '$lib/stores/blog.js';
import { logger } from '$lib/utils/logger.js';

export const load: LayoutLoad = async ({ data }) => {
  // Set the posts in the store for client-side access
  if (data.posts && data.posts.length > 0) {
    logger.log(`Layout received ${data.posts.length} posts from server`);
    postsStore.set(data.posts);
  } else {
    logger.log('No posts available in layout data');
  }
  
  // Pass through the data for child routes
  return data;
}; 