import type { RequestHandler } from './$types.js';

// Define platform type
interface Platform {
  env?: {
    ASSETSBUCKET?: {
      head: (path: string) => Promise<unknown | null>;
      get: (path: string) => Promise<{ body: ReadableStream } | null>;
    };
  };
}

interface Params {
  path: string;
}

// This route proxies requests to the R2 bucket directly from the client
export const GET: RequestHandler = async ({ platform, params, request }: {
  platform?: Platform;
  params: Params;
  request: Request;
}) => {
  console.log('DirectR2 request for path:', params.path);

  try {
    if (!platform?.env?.ASSETSBUCKET) {
      console.error('ASSETSBUCKET binding not found for directr2 request');
      return new Response('R2 bucket not available', { status: 500 });
    }
    
    const bucket = platform.env.ASSETSBUCKET;
    const path = params.path;
    
    console.log('Fetching from R2 bucket with key:', path);
    
    // Set CORS headers to allow access from the frontend
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600' // Cache for an hour
    });
    
    if (request.method === 'HEAD') {
      console.log('HEAD request for path:', path);
      try {
        const headResult = await bucket.head(path);
        if (headResult === null) {
          console.log('HEAD request - file not found:', path);
          return new Response('Not found', { status: 404, headers });
        }
        console.log('HEAD request - file exists:', path);
        return new Response(null, { 
          status: 200, 
          headers 
        });
      } catch (error) {
        console.error('Error handling HEAD request:', error);
        return new Response('Error checking file', { status: 500, headers });
      }
    }

    // Otherwise, it's a GET request to retrieve the file content
    try {
      const obj = await bucket.get(path);
      
      if (obj === null) {
        console.error('File not found in R2:', path);
        return new Response('Not found', { status: 404, headers });
      }
      
      // Extract content type based on file extension
      const contentType = getContentType(path);
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
      
      // Add more debug info
      console.log('R2 file found:', path);
      console.log('Content type:', contentType);
      
      // Create a new response with the file content and headers
      return new Response(obj.body, { 
        status: 200,
        headers
      });
    } catch (error) {
      console.error('Error fetching from R2:', error);
      return new Response('Error fetching file', { status: 500, headers });
    }
  } catch (error) {
    console.error('General error in directr2 handler:', error);
    return new Response('Server error', { status: 500 });
  }
};

// Helper function to get content type based on file extension
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const contentTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'html': 'text/html',
    'htm': 'text/html',
    'pdf': 'application/pdf',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
} 