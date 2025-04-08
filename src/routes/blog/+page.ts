import type { PageLoad } from './$types.js';

export const load = (({ data }) => {
  console.log('Blog list received data from server with', data.posts?.length || 0, 'posts');
  return {
    posts: data.posts || []
  };
}) satisfies PageLoad; 