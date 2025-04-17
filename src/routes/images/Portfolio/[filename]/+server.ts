import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types.js';

/**
 * Direct route for serving portfolio images from the static directory in development
 */
export const GET: RequestHandler = async ({ params }) => {
  // Only use this in development
  if (!dev) {
    throw error(404, 'Not found');
  }

  try {
    const filename = params.filename;
    if (!filename) {
      throw error(404, 'Filename not specified');
    }

    // Resolve path to the static directory
    const imagePath = path.join(process.cwd(), 'static', 'images', 'Portfolio', filename);
    console.log(`[Portfolio Server] Serving image: ${imagePath}`);
    
    // Additional logging to verify the file exists
    try {
      const fileStats = await fs.stat(imagePath);
      console.log(`[Portfolio Server] File exists! Size: ${fileStats.size} bytes`);
    } catch (statError) {
      console.error(`[Portfolio Server] File does not exist at path ${imagePath}`);
    }
    
    try {
      // Try to read the file
      const file = await fs.readFile(imagePath);
      
      // Get content type based on extension
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.png' ? 'image/png' :
                          ext === '.webp' ? 'image/webp' :
                          'application/octet-stream';
      
      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } catch (fileError) {
      console.error(`[Portfolio Server] Error reading file: ${fileError}`);
      
      // Try fallback from public directory
      try {
        const publicPath = path.join(process.cwd(), 'public', 'images', 'Portfolio', filename);
        console.log(`[Portfolio Server] Trying public fallback: ${publicPath}`);
        const fallbackFile = await fs.readFile(publicPath);
        
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.png' ? 'image/png' :
                          ext === '.webp' ? 'image/webp' :
                          'application/octet-stream';
        
        return new Response(fallbackFile, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      } catch (fallbackError) {
        console.error(`[Portfolio Server] Fallback also failed: ${fallbackError}`);
        throw error(404, 'Image not found');
      }
    }
  } catch (err) {
    console.error(`[Portfolio Server] Error: ${err}`);
    throw error(404, 'Image not found');
  }
}; 