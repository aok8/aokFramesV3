import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import path from 'node:path';
import { imageSize } from 'image-size';
import type { PageServerLoad } from './$types';
// Import the generated constant from the .ts file as fallback
import { dimensionsMap as localDimensionsMap } from '$lib/data/portfolio-dimensions';

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

// Helper function to fetch dimensions from the API
async function fetchDimensionsFromAPI(fetch: any): Promise<DimensionsMap | null> {
  try {
    const response = await fetch('/api/dimensions');
    if (!response.ok) {
      throw new Error(`Failed to fetch dimensions: ${response.statusText}`);
    }
    const data: DimensionsMap = await response.json();
    
    // Check if we got any dimensions from the API
    if (data && Object.keys(data).length > 0) {
      console.log(`[portfolio-images] Successfully fetched ${Object.keys(data).length} image dimensions from API`);
      return data;
    } else {
      console.warn('[portfolio-images] API returned empty dimensions data, falling back to local dimensions');
      return null;
    }
  } catch (error) {
    console.error('[portfolio-images] Error fetching image dimensions:', error);
    return null;
  }
}

// Rename export back to GET for API route
export const GET: PageServerLoad = async ({ platform, fetch }) => {
  try {
    let images: PortfolioImage[] = [];
    let dimensionsMap: DimensionsMap = {};

    // Try to fetch dimensions from the API first (regardless of environment)
    // This should work in both development and production
    if (!dev) {
      const apiDimensions = await fetchDimensionsFromAPI(fetch);
      if (apiDimensions && Object.keys(apiDimensions).length > 0) {
        dimensionsMap = apiDimensions;
        console.log(`[portfolio-images] Using ${Object.keys(dimensionsMap).length} dimensions from API`);
      } else {
        // Fall back to local dimensions map if API fails
        dimensionsMap = localDimensionsMap;
        console.log(`[portfolio-images] Falling back to local dimensions map with ${Object.keys(dimensionsMap).length} entries`);
      }
    }

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

    } else { // Production mode - use R2 bucket and dimensions map
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      const r2Objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'portfolio/',
      });

      images = r2Objects.objects
        .filter((obj: R2Object) => {
          const ext = obj.key.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
        })
        .map((obj: R2Object): PortfolioImage => {
          let width = 1, height = 1; // Default dimensions
          const filename = obj.key.split('/').pop() || '';

          // First try to get dimensions from the map using the full key
          if (obj.key in dimensionsMap) {
            width = dimensionsMap[obj.key].width;
            height = dimensionsMap[obj.key].height;
          }
          // Then try using just the filename
          else if (filename in dimensionsMap) {
            width = dimensionsMap[filename].width;
            height = dimensionsMap[filename].height;
          }
          // Finally, try with the portfolio/ prefix explicitly
          else if (('portfolio/' + filename) in dimensionsMap) {
            width = dimensionsMap['portfolio/' + filename].width;
            height = dimensionsMap['portfolio/' + filename].height;
          }
          else {
            console.warn(`Dimensions not found for R2 object: ${obj.key} (filename: ${filename}). Using default 1x1.`);
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