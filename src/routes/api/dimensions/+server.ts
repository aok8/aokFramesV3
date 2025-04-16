import type { RequestHandler } from '@sveltejs/kit';

interface ImageDimensions {
  width: number;
  height: number;
}

type DimensionsMap = Record<string, ImageDimensions>;

// Path within the R2 bucket to scan for images (used as KV prefix)
const IMAGE_FOLDER_PATH = 'photos/mainImages/';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    if (!platform?.env?.IMAGE_DIMS_KV) {
      return new Response('KV namespace not available', { status: 500 });
    }

    // Fetch all keys from the KV namespace with the specified prefix
    const listResponse = await platform.env.IMAGE_DIMS_KV.list({ prefix: IMAGE_FOLDER_PATH });

    const dimensionsMap: DimensionsMap = {};
    const kvFetchPromises: Promise<void>[] = [];

    // Iterate over the keys and fetch their values concurrently
    for (const key of listResponse.keys) {
      kvFetchPromises.push(
        (async () => {
          try {
            const value = await platform.env.IMAGE_DIMS_KV.get(key.name);
            if (value) {
              // Attempt to parse the JSON stored in KV
              const dimensions: ImageDimensions = JSON.parse(value);
              // Use the R2 object key (which is the KV key) as the key in our map
              dimensionsMap[key.name] = dimensions;
            } else {
              console.warn(`Value for key ${key.name} was null or empty.`);
            }
          } catch(err) {
            console.error(`Error fetching or parsing KV value for key ${key.name}:`, err instanceof Error ? err.message : String(err));
          }
        })()
      );
    }
    
    // Wait for all KV fetches to complete
    await Promise.allSettled(kvFetchPromises);

    // Return the complete dimensions map as JSON
    return new Response(JSON.stringify(dimensionsMap), {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error fetching image dimensions from KV:', error instanceof Error ? error.message : String(error));
    return new Response('Error fetching image dimensions', { status: 500 });
  }
}; 