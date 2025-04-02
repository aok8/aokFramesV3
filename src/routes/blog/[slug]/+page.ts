import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types.js';
import { get } from 'svelte/store';
import { posts } from '../../../lib/stores/blog.js';

interface Params {
  slug: string;
}

export const load = (({ params }: { params: Params }) => {
  try {
    const allPosts = get(posts);
    const post = allPosts.find(p => p.id === params.slug);
    
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
}) satisfies PageLoad; 