import type { PageLoad } from './$types.js';
import { logger } from '$lib/utils/logger.js';
export const load = (({ data }) => {
  logger.log('Blog list received data from server with', data.posts?.length || 0, 'posts');
  return {
    posts: data.posts || []
  };
}) satisfies PageLoad; 