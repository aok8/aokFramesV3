import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET = (async ({ platform }) => {
  try {
    // Report on platform availability
    const platformStatus = {
      platformAvailable: !!platform,
      envAvailable: !!(platform?.env),
      bucketAvailable: !!(platform?.env?.ASSETSBUCKET)
    };

    // If bucket is not available, return early
    if (!platform?.env?.ASSETSBUCKET) {
      return json({
        status: 'error',
        message: 'ASSETSBUCKET binding not found',
        platformStatus
      });
    }

    // Check blog posts directory
    const postsResult = await platform.env.ASSETSBUCKET.list({
      prefix: 'blog/posts/'
    });

    // Filter for index.md files and map to basic info
    const postsFormatted = postsResult.objects
      .filter(obj => obj.key.toLowerCase().endsWith('/index.md')) // Look for index.md
      .map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded
      }));
      
    // Extract slugs from the keys that contain index.md
    const postSlugs = postsFormatted.map(post => {
        const parts = post.key.split('/');
        // Expects key like blog/posts/slug/index.md, so slug is parts[2]
        return parts.length >= 4 ? parts[2] : null;
    }).filter(slug => slug !== null);

    // Optional: You could list blog/posts/ again to get all image files
    // Or perform individual HEAD requests later if needed
    // For now, just return the list of post markdown files found.

    return json({
      status: 'success',
      platformStatus,
      blogPosts: {
        count: postsFormatted.length,
        items: postsFormatted, // Contains keys like blog/posts/slug/index.md
        slugs: postSlugs // Contains extracted slugs like "night-photo"
      }
      // Removed old image logic for simplicity, add back if needed
    });
  } catch (error) {
    console.error('Error checking blog status:', error);
    return json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}) satisfies RequestHandler; 