import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import matter from 'gray-matter';
import type { BlogPost } from '$lib/types/blog.js';

// Simple wrapper to match the endpoint expected by the client
export const GET = (async ({ platform, fetch }) => {
  try {
    console.log('Direct blog-posts endpoint called, forwarding to api/blog-posts');
    
    // Forward the request to the main API endpoint handler
    const response = await fetch('/api/blog-posts');
    
    if (!response.ok) {
      // If the main API fails, try a direct bucket access approach
      console.log('Failed to fetch from /api/blog-posts, trying direct bucket access');
      
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }
      
      // Create response with CORS headers
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      
      // Get list of objects from R2 bucket with 'blog/posts/' prefix
      const objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'blog/posts/'
      });
      
      if (!objects.objects || objects.objects.length === 0) {
        return new Response(JSON.stringify([]), { headers });
      }
      
      // Process each markdown file - simplified approach just to get titles and summaries
      const posts = await Promise.all(
        objects.objects
          .filter(obj => obj.key.toLowerCase().endsWith('.md'))
          .map(async (obj) => {
            try {
              // Get the slug from the filename
              const filename = obj.key.split('/').pop() || '';
              const slug = filename.replace(/\.md$/i, '');
              
              // Get content
              const fileObject = await platform.env.ASSETSBUCKET.get(obj.key);
              if (!fileObject) return null;
              
              const content = await fileObject.text();
              
              // Basic extraction - title from first heading
              const titleMatch = content.match(/^#\s+(.*)/m);
              const title = titleMatch ? titleMatch[1] : slug;
              
              // Check for image
              const imageKey = `blog/images/${slug}.jpg`;
              const imageExists = (await platform.env.ASSETSBUCKET.head(imageKey)) !== null;
              
              return {
                id: slug,
                title,
                summary: content.split('\n\n')[1]?.replace(/\n/g, ' ') || '',
                content: content,
                author: 'AOK',
                published: new Date().toISOString().split('T')[0],
                label: 'Photography',
                image: imageExists ? `/directr2/${imageKey}` : undefined
              } as BlogPost;
            } catch (error) {
              console.error(`Error processing blog post ${obj.key}:`, error);
              return null;
            }
          })
      );
      
      const validPosts = posts
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
      
      return new Response(JSON.stringify(validPosts), { headers });
    }
    
    // Pass through the response from the main API
    const data = await response.json();
    
    // Add CORS headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    });
    
    return new Response(JSON.stringify(data), { headers });
  } catch (error) {
    console.error('Error in blog-posts direct route:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    );
  }
}) satisfies RequestHandler; 