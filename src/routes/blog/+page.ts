import type { PageLoad } from './$types.js';

export const load = (({ data }) => {
  console.log('Page load data:', data);
  return {
    posts: data.posts
  };
}) satisfies PageLoad; 