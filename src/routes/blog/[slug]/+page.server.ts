import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';

export const load: PageServerLoad = async ({ params, platform }) => {
	const slug = decodeURIComponent(params.slug);
	const post = await loadBlogPost(slug, platform as Parameters<typeof loadBlogPost>[1]);

	if (!post) {
		throw error(404, 'Blog post not found');
	}

	return { post };
};
