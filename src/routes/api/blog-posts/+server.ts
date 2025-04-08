import { json } from '@sveltejs/kit';
import { loadBlogPosts } from '$lib/server/blog.js';
import type { RequestHandler } from './$types.js';
import matter from 'gray-matter';
import type { BlogPost } from '$lib/types/blog.js';
import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';

// Note: we don't define R2Object interface to avoid conflicts with built-in types

interface CloudflareBindings {
  ASSETSBUCKET: {
    list: (options: { prefix: string }) => Promise<{ objects: any[] }>;
    get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
    head: (key: string) => Promise<any | null>;
  };
}

interface Platform {
  env?: {
    ASSETSBUCKET?: {
      list: (options: { prefix: string }) => Promise<{ objects: any[] }>;
      get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
      head: (key: string) => Promise<unknown | null>;
    };
  };
}

interface R2Object {
  key: string;
  uploaded?: string | Date;
}

export const GET: RequestHandler = async (event) => {
  const platform = event.platform as Platform | undefined;
  const request = event.request;

  // Configure CORS headers to ensure the API can be accessed from the frontend
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  // Handle OPTIONS request (preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // In development mode, use local filesystem
    if (dev) {
      console.log('Loading blog posts in development mode');
      const posts = await loadBlogPosts(platform);
      console.log('Development mode posts:', posts);
      return json(posts, { headers });
    }

    // Log platform info to debug R2 bucket access issues
    console.log('Platform available:', !!platform);
    console.log('Platform env available:', !!(platform?.env));
    console.log('Platform ASSETSBUCKET available:', !!(platform?.env?.ASSETSBUCKET));
    
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET binding not found');
    }

    const assetsBucket = platform.env.ASSETSBUCKET;

    // Get list of objects from R2 bucket with 'blog/posts/' prefix
    console.log('Attempting to list objects with prefix: blog/posts/');
    const objects = await assetsBucket.list({
      prefix: 'blog/posts/'
    });

    console.log('R2 list response received. Objects count:', objects.objects?.length || 0);
    
    if (!objects.objects || objects.objects.length === 0) {
      console.log('No blog posts found in the R2 bucket');
      return new Response(JSON.stringify([]), { headers });
    }

    // Process each markdown file to extract blog post data
    const posts = await Promise.all(
      objects.objects
        .filter((obj: R2Object) => obj.key.toLowerCase().endsWith('.md'))
        .map(async (obj: R2Object) => {
          try {
            console.log('Processing post with key:', obj.key);
            
            // Get the slug from the filename (without extension)
            const filename = obj.key.split('/').pop() || '';
            const slug = filename.replace(/\.md$/i, '');
            
            // Get the actual markdown content from R2
            const fileObject = await assetsBucket.get(obj.key);
            if (!fileObject) {
              throw new Error(`File not found: ${obj.key}`);
            }
            
            const content = await fileObject.text();
            
            // Parse frontmatter and content
            const { data, content: markdownContent } = matter(content);
            
            // Extract title from first h1
            const titleMatch = markdownContent.match(/^#\s+(.*)/m);
            const title = titleMatch ? titleMatch[1] : 'Untitled';
            
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
            
            // Check if a corresponding image exists in blog/images
            const imageKey = `blog/images/${slug}.jpg`;
            console.log('Checking for image with key:', imageKey);
            const imageExists = (await assetsBucket.head(imageKey)) !== null;
            console.log('Image exists:', imageExists);
            
            // Convert the uploaded date string to a proper date string if needed
            const uploadedDate = typeof obj.uploaded === 'string' 
              ? obj.uploaded 
              : obj.uploaded instanceof Date 
                ? obj.uploaded.toISOString() 
                : new Date().toISOString();
            
            return {
              id: slug,
              title,
              summary,
              content: markdownContent,
              author: data.author || 'AOK',
              published: data.published || uploadedDate.split('T')[0],
              label: data.label || 'Photography',
              image: imageExists ? `/directr2/${imageKey}` : undefined
            } as BlogPost;
          } catch (error) {
            console.error(`Error processing blog post ${obj.key}:`, error);
            return null;
          }
        })
    );

    // Filter out any null entries and sort by published date
    const validPosts = posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a: BlogPost, b: BlogPost) => new Date(b.published).getTime() - new Date(a.published).getTime());

    console.log('Returning valid posts count:', validPosts.length);
    
    // Return JSON response with the appropriate headers
    return new Response(JSON.stringify(validPosts), { headers });
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return new Response('Error loading blog posts', { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}; 