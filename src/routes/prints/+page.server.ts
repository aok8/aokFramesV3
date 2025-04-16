import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';
import { imageSize } from 'image-size';
import path from 'node:path'; // Import path statically

// Default dimensions in case fetching fails or metadata is missing
const DEFAULT_WIDTH = 16;
const DEFAULT_HEIGHT = 9; // Default to 16:9 aspect ratio
const IMAGE_KEY = 'constants/Prints.jpg';
const LOCAL_FALLBACK_PATH = 'src/images/constants/Prints.jpg';

// Revert to implicit platform typing via PageServerLoad
export const load: PageServerLoad = async ({ platform }) => {
  let width = DEFAULT_WIDTH;
  let height = DEFAULT_HEIGHT;

  try {
    if (dev) {
      // Development: Use dynamic import ONLY for fs
      try {
        const fs = await import('node:fs/promises');
        const resolvedPath = path.resolve(LOCAL_FALLBACK_PATH);
        const buffer = await fs.readFile(resolvedPath);
        const dimensions = imageSize(buffer);
        width = dimensions.width ?? DEFAULT_WIDTH;
        height = dimensions.height ?? DEFAULT_HEIGHT;
        console.log(`Prints Load (Dev): Found dimensions ${width}x${height}`);
      } catch (e) {
        console.error(`Prints Load (Dev): Error reading local file ${LOCAL_FALLBACK_PATH}:`, e);
      }
    } else {
      // Production: Use R2 head to get metadata
      if (platform?.env?.ASSETSBUCKET) {
        try {
          const object = await platform.env.ASSETSBUCKET.head(IMAGE_KEY);
          if (object?.customMetadata?.width && object?.customMetadata?.height) {
            width = parseInt(object.customMetadata.width, 10) || DEFAULT_WIDTH;
            height = parseInt(object.customMetadata.height, 10) || DEFAULT_HEIGHT;
             console.log(`Prints Load (Prod): Found dimensions ${width}x${height} in R2 metadata`);
          } else {
             console.warn(`Prints Load (Prod): Dimensions missing in R2 metadata for ${IMAGE_KEY}. Using defaults.`);
          }
        } catch (e) {
           console.error(`Prints Load (Prod): Error fetching R2 metadata for ${IMAGE_KEY}:`, e);
        }
      } else {
        console.error('Prints Load (Prod): ASSETSBUCKET binding not found.');
      }
    }
  } catch (error) {
     console.error('Prints Load: General error fetching dimensions:', error);
     // Keep defaults if any error occurs
  }
  
  return {
      width,
      height
  };
}; 