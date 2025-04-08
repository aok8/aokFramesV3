import { loadBlogPosts } from '$lib/server/blog.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  const posts = await loadBlogPosts(platform);

  return {
    posts
  };
}; 