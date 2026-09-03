import type { RequestHandler } from './$types.js';
import { createServerLogger } from '$lib/utils/logger.js';

// This route proxies requests to the R2 bucket directly from the client
export const GET: RequestHandler = async ({ platform, params, request }) => {
  const serverLogger = createServerLogger(platform?.env);
  serverLogger.log('DirectR2 request for path:', params.path);

  try {
    // Check R2 availability
    if (!platform?.env?.ASSETSBUCKET) {
      serverLogger.error('ASSETSBUCKET binding not found for directr2 request');
      return new Response('R2 bucket not available', { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }
    
    const bucket = platform.env.ASSETSBUCKET;
    const path = params.path;
    
    serverLogger.log('Fetching from R2 bucket with key:', path);
    
    // Determine if this is an image request for long-lived caching
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(params.path);
    const cacheControl = isImage
      ? 'public, max-age=31536000, immutable'   // 1 year — images never change in place
      : 'public, max-age=86400';                // 1 day for other assets

    // Set CORS headers to allow access from the frontend
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': cacheControl
    });
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    
    // Handle HEAD requests to check if a file exists
    if (request.method === 'HEAD') {
      serverLogger.log('HEAD request for path:', path);
      try {
        const headResult = await bucket.head(path);
        if (headResult === null) {
          serverLogger.log('HEAD request - file not found:', path);
          return new Response(null, { 
            status: 404,
            headers 
          });
        }
        serverLogger.log('HEAD request - file exists:', path);
        return new Response(null, { 
          status: 200, 
          headers 
        });
      } catch (error) {
        serverLogger.error('Error handling HEAD request:', error);
        return new Response(null, { 
          status: 500, 
          headers: new Headers({
            ...Object.fromEntries(headers.entries()),
            'Cache-Control': 'no-store'
          })
        });
      }
    }

    // Otherwise, it's a GET request to retrieve the file content
    try {
      const obj = await bucket.get(path);
      
      if (obj === null) {
        serverLogger.error('File not found in R2:', path);
        return new Response('Not found', { 
          status: 404, 
          headers 
        });
      }
      
      // Extract content type based on file extension
      const contentType = getContentType(path);
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
      
      // Add more debug info
      serverLogger.log('R2 file found:', path);
      serverLogger.log('Content type:', contentType);
      
      // Create a new response with the file content and headers
      return new Response(obj.body, { 
        status: 200,
        headers
      });
    } catch (error) {
      serverLogger.error('Error fetching from R2:', error);
      return new Response('Error fetching file', { 
        status: 500, 
        headers: new Headers({
          ...Object.fromEntries(headers.entries()),
          'Cache-Control': 'no-store'
        })
      });
    }
  } catch (error) {
    serverLogger.error('General error in directr2 handler:', error);
    return new Response('Server error', { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
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
