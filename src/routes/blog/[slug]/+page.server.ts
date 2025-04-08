import type { PageServerLoad } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { error } from '@sveltejs/kit';

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: any[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface Params {
  slug: string;
}

export const load: PageServerLoad = async ({ params, platform }: { params: Params; platform: unknown }) => {
  const post = await loadBlogPost(params.slug, platform as Platform | undefined);

  if (!post) {
    throw error(404, {
      message: 'Not found'
    });
  }

  return {
    post
  };
}; 