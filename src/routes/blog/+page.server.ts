import { getBlogPosts } from '$lib/utils/blog.js';
import type { PageServerLoad } from './$types.js';

export const load = (async () => {
  const posts = await getBlogPosts();
  return { posts };
}) satisfies PageServerLoad; 