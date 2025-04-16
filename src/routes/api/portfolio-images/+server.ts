import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import path from 'node:path'; // Import path for joining paths
import fs from 'node:fs/promises'; // Import fs.readFile
import { imageSize } from 'image-size'; // Keep standard import

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
// let readdir: (path: string) => Promise<string[]>; // readdir is part of fs now

// No longer need conditional logic for fs/readdir

export async function GET({ platform }) {
  try {
    let images: PortfolioImage[] = [];

    // In development mode, read from local directory
    if (dev) {
      const localPortfolioPath = path.resolve('src/images/Portfolio'); // Use absolute path
      const files = await fs.readdir(localPortfolioPath);

      // Process files sequentially to avoid issues with too many open files if needed
      images = [];
      for (const file of files) {
          const ext = file.split('.').pop()?.toLowerCase();
          if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) continue;

          const filePath = path.join(localPortfolioPath, file);
          let width = 0, height = 0;
          try {
            const buffer = await fs.readFile(filePath); // Read file to buffer
            const dimensions = imageSize(buffer); // Pass buffer
            width = dimensions.width ?? 0;
            height = dimensions.height ?? 0;
          } catch (e) {
            console.error(`Error getting dimensions for ${filePath}:`, e);
          }
          images.push({
            url: `/images/portfolio/${file}`, // Keep dev URL simple
            fallback: `/images/portfolio/${file}`, // Fallback is the same in dev
            width,
            height
          });
      }

    } else { // Production mode - use R2 bucket
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      const r2Objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'portfolio/'
      });

      // Use Promise.all to process images concurrently
      images = await Promise.all(
          r2Objects.objects
            .filter((obj: R2Object) => {
              const ext = obj.key.split('.').pop()?.toLowerCase();
              return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || ''); // Added webp
            })
            .map(async (obj: R2Object): Promise<PortfolioImage> => {
              let width = 0, height = 0;

              // Option 1: Try reading from R2 custom metadata if available
              if (obj.customMetadata?.width && obj.customMetadata?.height) {
                 width = parseInt(obj.customMetadata.width, 10);
                 height = parseInt(obj.customMetadata.height, 10);
              }

              // Option 2: If metadata unreliable or absent, get dimensions from local fallback
              // This assumes the fallback path corresponds to a file available at build/run time on the server
              // Adjust the fallback path logic as needed for your deployment setup
              if (!width || !height) {
                 const fallbackFilename = obj.key.replace(/^portfolio\//, ''); // Get filename
                 const fallbackPath = path.resolve(`src/images/Portfolio/${fallbackFilename}`); // Construct potential local path
                 try {
                    const buffer = await fs.readFile(fallbackPath); // Read fallback file to buffer
                    const dimensions = imageSize(buffer); // Pass buffer
                    width = dimensions.width ?? 0;
                    height = dimensions.height ?? 0;
                 } catch (e) {
                    console.warn(`Could not get dimensions for fallback ${fallbackPath}:`, e instanceof Error ? e.message : e);
                    // Assign default dimensions or handle error as needed
                    width = width || 1; // Avoid division by zero for aspect ratio
                    height = height || 1;
                 }
              }


              return {
                url: `/directr2/${obj.key}`, // R2 URL
                fallback: `/images/Portfolio/${obj.key.replace(/^portfolio\//, '')}`, // Local fallback URL (relative to static/images or src/images if served)
                width: width || 1, // Ensure non-zero
                height: height || 1 // Ensure non-zero
              };
            })
      );
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