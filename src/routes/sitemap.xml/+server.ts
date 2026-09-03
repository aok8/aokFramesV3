import type { RequestHandler } from './$types.js';
import { loadBlogPosts } from '$lib/server/blog.js';

const SITE_URL = 'https://aokframes.com';
const staticPaths = ['/', '/works', '/about', '/peek', '/blog', '/prints'];

function escapeXml(value: unknown) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function formatLastmod(value: unknown) {
	if (!value) return undefined;
	const date = value instanceof Date ? value : new Date(String(value));
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

export const GET: RequestHandler = async ({ platform }) => {
	const posts = await loadBlogPosts(platform as Parameters<typeof loadBlogPosts>[0]);
	const urls = [
		...staticPaths.map((path) => ({ loc: `${SITE_URL}${path}`, lastmod: undefined })),
		...posts.map((post) => ({
			loc: `${SITE_URL}/blog/${encodeURIComponent(post.id)}`,
			lastmod: formatLastmod(post.published)
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		({ loc, lastmod }) => `  <url>
    <loc>${escapeXml(loc)}</loc>${
			lastmod
				? `
    <lastmod>${escapeXml(lastmod)}</lastmod>`
				: ''
		}
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
