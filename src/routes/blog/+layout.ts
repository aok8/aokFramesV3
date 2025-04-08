import type { LayoutLoad } from './$types.js';
import { posts as postsStore } from '$lib/stores/blog.js';

export const load: LayoutLoad = async ({ data }) => {
  // Set the posts in the store for client-side access
  if (data.posts && data.posts.length > 0) {
    console.log(`Layout received ${data.posts.length} posts from server`);
    postsStore.set(data.posts);
  } else {
    console.log('No posts available in layout data');
  }
  
  // Pass through the data for child routes
  return data;
}; 