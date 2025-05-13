import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types.js';

/**
 * This catch-all route handles:
 * 1. Static file requests in development mode (specifically for portfolio images)
 * 2. Acts as a 404 handler for all other paths
 */
export const GET: RequestHandler = async ({ params, request }: { params: { path: string }, request: Request }) => {
  const requestPath = params.path || '';
  
  // Portfolio image handling for dev mode
  if (dev && requestPath.startsWith('images/Portfolio/')) {
    try {
      // Resolve the file path relative to the static directory
      const staticPath = path.join(process.cwd(), 'static', requestPath);
      console.log(`[Static Server] Trying to serve: ${staticPath}`);
      
      // Try to read the file
      const file = await fs.readFile(staticPath);
      
      // Determine content type based on file extension
      const ext = path.extname(staticPath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      
      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (err) {
      console.error(`[Static Server] Error serving file: ${err}`);
    }
  }

  // If we get here, either:
  // 1. We're not in dev mode
  // 2. It's not a portfolio image path
  // 3. There was an error reading the file
  
  // Use SvelteKit's error function which will show the error page
  console.log(`[404 Handler] Path not found: ${requestPath}`);
  throw error(404, { message: 'Page not found' });
};

// Also handle other HTTP methods
export const POST: RequestHandler = ({ params }) => {
  throw error(404, { message: 'Page not found' });
};

export const PUT: RequestHandler = ({ params }) => {
  throw error(404, { message: 'Page not found' });
};

export const DELETE: RequestHandler = ({ params }) => {
  throw error(404, { message: 'Page not found' });
};

export const PATCH: RequestHandler = ({ params }) => {
  throw error(404, { message: 'Page not found' });
}; 