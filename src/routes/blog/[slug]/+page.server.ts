import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';

interface Params {
  slug: string;
}

export const load = (async ({ params }: { params: Params }) => {
  try {
    const post = loadBlogPost(params.slug);
    
    if (!params.slug || !post) {
      throw error(404, {
        message: 'Post not found'
      });
    }

    return {
      post
    };
  } catch (e) {
    console.error('Error loading blog post:', e);
    throw error(404, {
      message: 'Post not found'
    });
  }
}) satisfies PageServerLoad; 