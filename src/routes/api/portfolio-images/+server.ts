import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import path from 'node:path';
import { imageSize } from 'image-size';
import type { PageServerLoad } from './$types';
// Import the generated constant from the .ts file
import { dimensionsMap } from '$lib/data/portfolio-dimensions'; // No .ts extension needed usually

// Define the expected structure of the dimensions JSON
interface ImageDimensions {
  width: number;
  height: number;
}
interface DimensionsMap {
  [filename: string]: ImageDimensions;
}

interface R2Object {
  key: string;
  // Ensure customMetadata can be accessed if it exists
  customMetadata?: Record<string, string>;
  [key: string]: any;
}

interface R2ListResponse {
  objects: R2Object[];
  [key: string]: any;
}

// Define the structure including dimensions
interface PortfolioImage {
  url: string;
  fallback: string;
  width: number;
  height: number;
}

// Development-only imports
let devFs: typeof import('node:fs/promises') | null = null;
if (dev) {
  // Dynamically import fs ONLY in dev
  devFs = await import('node:fs/promises');
}

// Rename export back to GET for API route
export const GET: PageServerLoad = async ({ platform }) => {
  try {
    let images: PortfolioImage[] = [];

    // In development mode, read from local directory
    if (dev && devFs) {
      const localPortfolioPath = path.resolve('src/images/Portfolio');
      const files = await devFs.readdir(localPortfolioPath);

      images = [];
      for (const file of files) {
          const ext = file.split('.').pop()?.toLowerCase();
          if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) continue;

          const filePath = path.join(localPortfolioPath, file);
          let width = 0, height = 0;
          try {
            // --- Read Buffer for imageSize --- 
            const buffer = await devFs.readFile(filePath);
            const dimensions = imageSize(buffer); // Pass buffer
            // --- Removed @ts-ignore --- 
            width = dimensions.width ?? 0;
            height = dimensions.height ?? 0;
            // Keep the logging for confirmation -- Removing now
            // console.log(`DEV_DIMENSIONS: ${file} - Width: ${width}, Height: ${height}`);
          } catch (e) {
            console.error(`Error getting dimensions for dev ${filePath}:`, e);
          }
          images.push({
            url: `/images/portfolio/${file}`,
            fallback: `/images/portfolio/${file}`,
            width,
            height
          });
      }

    } else { // Production mode - use R2 bucket and imported dimensions map
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      const r2Objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'portfolio/',
        // include: ['customMetadata'] // No longer need custom metadata
      });

      images = r2Objects.objects
        .filter((obj: R2Object) => {
          const ext = obj.key.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
        })
        .map((obj: R2Object): PortfolioImage => {
          let width = 1, height = 1; // Default dimensions
          const filename = obj.key.split('/').pop();

          // Look up dimensions directly in the imported map
          // Type guard might still be good practice, but TS should know the type now
          if (filename && filename in dimensionsMap) {
             // Access directly, TS knows the type from the imported const
             width = dimensionsMap[filename].width;
             height = dimensionsMap[filename].height;
          } else {
             console.warn(`Dimensions not found in generated map for R2 object: ${obj.key} (filename: ${filename}). Using default 1x1.`);
          }
          
          width = width || 1;
          height = height || 1;

          return {
            url: `/directr2/${obj.key}`,
            fallback: `/images/Portfolio/${filename}`,
            width: width,
            height: height
          };
        });
    }

    // Add basic sorting if needed, e.g., by filename
    images.sort((a, b) => a.fallback.localeCompare(b.fallback));

    return json(images);
  } catch (error) {
    console.error('Error listing images:', error);
    // Provide more context in error response if possible
    const message = error instanceof Error ? error.message : 'Unknown error fetching portfolio images';
    return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
} 