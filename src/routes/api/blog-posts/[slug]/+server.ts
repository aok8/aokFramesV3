import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: R2Object[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface R2Object {
  key: string;
}

export const GET: RequestHandler = async ({ params, platform, request }) => {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  try {
    console.log('Loading blog post with slug:', params.slug);
    const post = await loadBlogPost(params.slug, platform as Platform);

    if (!post) {
      console.error('Blog post not found:', params.slug);
      return new Response('Post not found', { 
        status: 404,
        headers
      });
    }

    return json(post, { headers });
  } catch (error) {
    console.error('Error loading blog post:', error);
    return new Response('Error loading blog post', { 
      status: 500,
      headers
    });
  }
};

// Handle CORS preflight requests
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}; 