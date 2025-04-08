import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { loadBlogPost } from '$lib/server/blog.js';
import { dev } from '$app/environment';
import matter from 'gray-matter';

export const GET = (async ({ params, platform, request }) => {
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

  const { slug } = params;

  // In development mode, use local filesystem
  if (dev) {
    const post = loadBlogPost(slug);
    if (!post) {
      throw error(404, 'Blog post not found');
    }
    return json(post, { headers });
  }

  // Production mode - use R2
  try {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET binding not found');
    }

    // Try to get the markdown file from R2
    const fileObject = await platform.env.ASSETSBUCKET.get(`blog/posts/${slug}.md`);
    if (!fileObject) {
      throw error(404, 'Blog post not found');
    }

    const content = await fileObject.text();
    const { data, content: markdownContent } = matter(content);

    // Extract title from first h1
    const titleMatch = markdownContent.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : slug;

    // Extract first paragraph as summary
    const lines = markdownContent.split('\n');
    let summaryLines = [];
    let inSummary = false;

    for (const line of lines) {
      // Skip empty lines before summary
      if (!inSummary && line.trim() === '') continue;

      // Stop at subheadings
      if (line.startsWith('##')) break;

      // Skip the title
      if (line.startsWith('#')) continue;

      // We're now in the summary section
      inSummary = true;

      // Add non-empty lines to summary
      if (line.trim() !== '') {
        summaryLines.push(line.trim());
      }
    }

    const summary = summaryLines.join(' ');

    // Check if an image exists
    const imageExists = await platform.env.ASSETSBUCKET.head(`blog/images/${slug}.jpg`) !== null;

    const post = {
      id: slug,
      title,
      content: markdownContent,
      summary,
      author: data.author || 'AOK',
      published: data.published || new Date().toISOString().split('T')[0],
      label: data.label || 'Photography',
      image: imageExists ? `/directr2/blog/images/${slug}.jpg` : undefined
    };

    return json(post, { headers });
  } catch (error) {
    console.error(`Error getting blog post ${slug}:`, error);
    if (error instanceof Error && error.message === 'Blog post not found') {
      throw error;
    }
    throw new Error('Failed to load blog post');
  }
}) satisfies RequestHandler; 