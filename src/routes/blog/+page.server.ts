import { loadAllBlogPosts } from '$lib/server/blog.js';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  const posts = loadAllBlogPosts();
  return { posts };
}) satisfies PageServerLoad; 