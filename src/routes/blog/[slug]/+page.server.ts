import type { PageServerLoad } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { error } from '@sveltejs/kit';
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

interface Params {
  slug: string;
}

export const load: PageServerLoad = async ({ params, platform }: { params: Params; platform: unknown }) => {
  console.log('Page server load - slug:', params.slug);
  console.log('Development mode:', dev);
  console.log('Platform object:', platform ? 'exists' : 'missing');
  console.log('R2 bucket:', platform?.env?.ASSETSBUCKET ? 'exists' : 'missing');

  if (!dev && !platform?.env?.ASSETSBUCKET) {
    console.error('ASSETSBUCKET binding not found in production');
    throw error(500, {
      message: 'R2 bucket not configured'
    });
  }

  const post = await loadBlogPost(params.slug, platform as Platform);

  if (!post) {
    console.error('Blog post not found:', params.slug);
    throw error(404, {
      message: 'Blog post not found'
    });
  }

  console.log('Successfully loaded post:', post.title);
  return {
    post
  };
}; 