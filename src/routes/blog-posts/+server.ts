import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import matter from 'gray-matter';
import type { BlogPost } from '$lib/types/blog.js';

// Simple wrapper to match the endpoint expected by the client
export const GET = (async ({ platform, fetch }) => {
  try {
    console.log('Direct blog-posts endpoint called, forwarding to api/blog-posts');
    
    // Forward the request to the main API endpoint handler
    try {
      const response = await fetch('/api/blog-posts');
      
      if (response.ok) {
        // Pass through the response from the main API
        const data = await response.json();
        
        // Add CORS headers
        const headers = new Headers({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        });
        
        console.log(`Successfully retrieved ${Array.isArray(data) ? data.length : 0} posts from API`);
        return new Response(JSON.stringify(data), { headers });
      }
      
      console.log(`Failed to fetch from /api/blog-posts: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.error('Error fetching from /api/blog-posts:', error);
    }
    
    // If the main API fails, try first getting structure information
    console.log('Trying direct bucket access');
    
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
    
    // First list top-level directories to determine structure
    const topLevelList = await platform.env.ASSETSBUCKET.list({
      delimiter: '/',
    });
    
    // Extract paths from the list for directory detection
    const topLevelPaths = topLevelList.delimitedPrefixes || [];
    console.log('Available top-level directories:', topLevelPaths);
    
    // Determine prefixes based on bucket structure
    let postPrefix = 'blog/posts/';
    let imagePrefix = 'blog/images/';
    
    // If 'blog/' isn't found but 'posts/' is, adjust prefix
    if (!topLevelPaths.includes('blog/') && 
        topLevelPaths.includes('posts/')) {
      postPrefix = 'posts/';
      imagePrefix = 'images/';
      console.log('Using alternate structure with posts/ and images/ prefixes');
    }
    
    // Get list of objects using the detected prefix
    let objects = await platform.env.ASSETSBUCKET.list({
      prefix: postPrefix
    });
    
    // If no results, try alternate prefix
    if (!objects.objects || objects.objects.length === 0) {
      const altPrefix = postPrefix === 'blog/posts/' ? 'posts/' : 'blog/posts/';
      console.log(`No objects found with ${postPrefix}, trying ${altPrefix}`);
      
      objects = await platform.env.ASSETSBUCKET.list({
        prefix: altPrefix
      });
      
      if (objects.objects && objects.objects.length > 0) {
        postPrefix = altPrefix;
        imagePrefix = altPrefix === 'blog/posts/' ? 'blog/images/' : 'images/';
      }
    }
    
    if (!objects.objects || objects.objects.length === 0) {
      console.log('No blog posts found in any expected location');
      return new Response(JSON.stringify([]), { headers });
    }
    
    console.log(`Found ${objects.objects.length} blog posts with prefix: ${postPrefix}`);
    
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
            
            // Check for image with multiple path patterns
            const imageKey = `${imagePrefix}${slug}.jpg`;
            let imageExists = await platform.env.ASSETSBUCKET.head(imageKey);
            
            let finalImagePath = null;
            if (imageExists) {
              finalImagePath = `/directr2/${imageKey}`;
            } else {
              // Try alternate path
              const altImageKey = imagePrefix === 'blog/images/' ? `images/${slug}.jpg` : `blog/images/${slug}.jpg`;
              imageExists = await platform.env.ASSETSBUCKET.head(altImageKey);
              if (imageExists) {
                finalImagePath = `/directr2/${altImageKey}`;
              }
            }
            
            return {
              id: slug,
              title,
              summary: content.split('\n\n')[1]?.replace(/\n/g, ' ') || '',
              content: content,
              author: 'AOK',
              published: new Date().toISOString().split('T')[0],
              label: 'Photography',
              image: finalImagePath
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
    
    console.log(`Returning ${validPosts.length} valid posts from direct bucket access`);
    return new Response(JSON.stringify(validPosts), { headers });
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