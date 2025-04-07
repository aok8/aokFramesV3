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

    // Check blog images directory
    const imagesResult = await platform.env.ASSETSBUCKET.list({
      prefix: 'blog/images/'
    });

    // Format results to include top-level info
    const postsFormatted = postsResult.objects
      .filter(obj => obj.key.toLowerCase().endsWith('.md'))
      .map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded
      }));

    const imagesFormatted = imagesResult.objects
      .filter(obj => ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
        obj.key.toLowerCase().endsWith('.' + ext)))
      .map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded
      }));

    // Match blog posts with images
    const postSlugs = postsFormatted.map(post => {
      const parts = post.key.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace(/\.md$/i, '');
    });

    const imageSlugs = imagesFormatted.map(image => {
      const parts = image.key.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    });

    // Find posts with and without matching images
    const postsWithImages = postSlugs.filter(slug => imageSlugs.includes(slug));
    const postsWithoutImages = postSlugs.filter(slug => !imageSlugs.includes(slug));
    const unusedImages = imageSlugs.filter(slug => !postSlugs.includes(slug));

    return json({
      status: 'success',
      platformStatus,
      blogPosts: {
        count: postsFormatted.length,
        items: postsFormatted
      },
      blogImages: {
        count: imagesFormatted.length,
        items: imagesFormatted
      },
      matching: {
        postsWithImages,
        postsWithoutImages,
        unusedImages
      }
    });
  } catch (error) {
    console.error('Error checking blog status:', error);
    return json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}) satisfies RequestHandler; 