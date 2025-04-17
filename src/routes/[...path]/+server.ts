import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types.js';

/**
 * This catch-all route handles static file requests in development mode
 * Specifically for portfolio images that might have path issues
 */
export const GET: RequestHandler = async ({ params }: { params: { path: string } }) => {
  // Only use this route in development mode
  if (!dev) {
    throw error(404, 'Not found');
  }

  // Extract the path from the params
  const requestPath = params.path || '';
  
  // Only handle portfolio image requests
  if (!requestPath.startsWith('images/Portfolio/')) {
    throw error(404, 'Not found');
  }

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
    throw error(404, 'File not found');
  }
}; 