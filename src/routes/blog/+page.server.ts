import type { PageServerLoad } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js';

export const load = (async () => {
  const posts = loadBlogPosts();
  return { posts };
}) satisfies PageServerLoad; 