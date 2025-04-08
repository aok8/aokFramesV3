import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { dev } from '$app/environment';
import matter from 'gray-matter';

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: any[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface RequestParams {
  slug: string;
}

export const GET: RequestHandler = async ({ params, platform, request }: { params: RequestParams; platform: unknown; request: Request }) => {
  // Configure CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const slug = params.slug;
    console.log('Loading blog post with slug:', slug);
    const post = await loadBlogPost(slug, platform as Platform | undefined);

    if (!post) {
      console.error('Blog post not found:', slug);
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

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}; 