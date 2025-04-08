import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { dev } from '$app/environment';

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
    console.log('Development mode:', dev);
    console.log('Platform object:', platform ? 'exists' : 'missing');
    console.log('R2 bucket:', platform?.env?.ASSETSBUCKET ? 'exists' : 'missing');

    if (!dev && !platform?.env?.ASSETSBUCKET) {
      console.error('ASSETSBUCKET binding not found in production');
      return new Response('R2 bucket not configured', { 
        status: 500,
        headers
      });
    }

    const post = await loadBlogPost(params.slug, platform as Platform);

    if (!post) {
      console.error('Blog post not found:', params.slug);
      return new Response('Post not found', { 
        status: 404,
        headers
      });
    }

    console.log('Successfully loaded post:', post.title);
    return json(post, { headers });
  } catch (error) {
    console.error('Error loading blog post:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
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