import type { PageLoad } from './$types.js';
import { get } from 'svelte/store';
import { posts } from '../../lib/stores/blog.js';

export const load = (() => {
  const allPosts = get(posts);
  return {
    posts: allPosts.sort((a, b) => 
      new Date(b.published).getTime() - new Date(a.published).getTime()
    )
  };
}) satisfies PageLoad; 