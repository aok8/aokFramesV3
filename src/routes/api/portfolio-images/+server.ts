import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { assetUrl } from '$lib/utils/r2.js';
import path from 'node:path';
import { imageSize } from 'image-size';
import type { RequestHandler } from './$types.js';
// Import the generated constant from the .ts file as fallback
// @ts-ignore - Generated file may not exist for TypeScript
import { dimensionsMap as localDimensionsMap } from '$lib/data/portfolio-dimensions';

// Import dimension maps for different widths
// @ts-ignore - Generated files may not exist for TypeScript
import { dimensionsMapW1024 } from '$lib/data/portfolio-dimensions-w1024';
// @ts-ignore - Generated files may not exist for TypeScript
import { dimensionsMapW1920 } from '$lib/data/portfolio-dimensions-w1920';
// @ts-ignore - Generated files may not exist for TypeScript
import { dimensionsMapW3000 } from '$lib/data/portfolio-dimensions-w3000';
// Fallback to legacy dimensions if needed
// @ts-ignore - Generated file may not exist for TypeScript
import { dimensionsMap as legacyDimensionsMap } from '$lib/data/portfolio-dimensions';

// Define the expected structure of the dimensions JSON
interface ImageDimensions {
  width: number;
  height: number;
}

// Map to link dimensions maps to width folders
interface DimensionsMap {
  [filename: string]: ImageDimensions;
}

// Define a map of folder prefix to dimensions map
const dimensionsMaps: Record<string, DimensionsMap> = {
  'w1024': (dimensionsMapW1024 as DimensionsMap) || {},
  'w1920': (dimensionsMapW1920 as DimensionsMap) || {},
  'w3000': (dimensionsMapW3000 as DimensionsMap) || {},
  'legacy': (legacyDimensionsMap as DimensionsMap) || {}
};

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
  alt: string;
  _source?: string; // Optional field for debug information
}

// Development-only imports
let devFs: typeof import('node:fs/promises') | null = null;
if (dev) {
  // Dynamically import fs ONLY in dev
  devFs = await import('node:fs/promises');
}

// Function to get the appropriate folder and dimensions map based on width
function getWidthFolder(clientWidth: number): { folder: string, dimensionsMap: DimensionsMap } {
  if (clientWidth <= 1024) {
    // Use w1024 as the smallest size (removed w320 and w640)
    return { folder: 'w1024', dimensionsMap: dimensionsMaps.w1024 };
  } else if (clientWidth <= 1920) {
    return { folder: 'w1920', dimensionsMap: dimensionsMaps.w1920 };
  } else {
    return { folder: 'w3000', dimensionsMap: dimensionsMaps.w3000 }; 
  }
}

// Fetch alt text map from R2. Returns an empty object if the file is missing or unparseable.
async function fetchAltMap(platform: any): Promise<Record<string, string>> {
  try {
    if (!platform?.env?.ASSETSBUCKET) return {};
    const obj = await platform.env.ASSETSBUCKET.get('portfolio/alt.json');
    if (!obj) return {};
    const text = await obj.text();
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    // Missing file, invalid JSON, or any R2 error — degrade gracefully
    return {};
  }
}

// GET API route
export const GET: RequestHandler = async ({ platform, request }): Promise<Response> => {
  console.log('[portfolio-images] Endpoint called');
  
  // Create a debug log collection 
  const debugLogs: string[] = [];
  const logEvent = (message: string) => {
    console.log(message);
    debugLogs.push(`${new Date().toISOString()}: ${message}`);
  };
  
  logEvent('[portfolio-images] Endpoint called with debug logging');
  
  try {
    const startTime = Date.now();
    let images: PortfolioImage[] = [];

    // Fetch alt text map from R2 (portfolio/alt.json). Fails silently — alt="" if missing.
    const altMap = await fetchAltMap(platform);
    logEvent(`[portfolio-images] Alt map loaded: ${Object.keys(altMap).length} entries`);

    // Get client width from query parameters (or default to max size)
    const clientWidth = request?.url
      ? parseInt(new URL(request.url).searchParams.get('width') || '1920', 10)
      : 1920;
    
    // Get appropriate folder and dimensions map
    const { folder, dimensionsMap } = getWidthFolder(clientWidth);
    
    logEvent(`[portfolio-images] Request received, client width: ${clientWidth}, using folder: ${folder}`);
    
    // Diagnostics to return in debug mode
    const diagnostics = {
      timestamp: new Date().toISOString(),
      r2Available: !!platform?.env?.ASSETSBUCKET,
      r2ObjectCount: 0,
      clientWidth,
      selectedFolder: folder,
      dimensionsMapSize: Object.keys(dimensionsMap).length,
      dimensionsSource: 'unknown',
      localDimensionsAvailable: Object.keys(dimensionsMap).length > 0,
      localDimensionsCount: Object.keys(dimensionsMap).length,
      sampleDimensions: {},
      processingTimeMs: 0
    };

    // In dev environment, try to use fs module (node-specific)
    if (dev) {
      try {
        devFs = await import('node:fs/promises');
        logEvent('[portfolio-images] Loaded fs module for dev mode');
      } catch (e) {
        logEvent('[portfolio-images] Could not load fs module for dev mode, falling back to fetch');
      }
    }

    // Initialize dimensions map to an empty object to prevent null errors
    // We'll use the appropriate dimensions map based on the width folder

    // In development mode, read from local directory
    if (dev && devFs) {
      // Directory structure now includes width folders
      const localPortfolioPath = path.resolve(`static/images/Portfolio/${folder}`);
      logEvent(`[portfolio-images] DEV MODE: Looking for images in ${localPortfolioPath}`);
      
      try {
        const files = await devFs.readdir(localPortfolioPath);
        logEvent(`[portfolio-images] Found ${files.length} files in local portfolio directory for ${folder}`);

        images = [];
        for (const file of files) {
            const ext = file.split('.').pop()?.toLowerCase();
            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) continue;

            const filePath = path.join(localPortfolioPath, file);
            
            // First try to get dimensions from our dimensionsMap
            let width = 0, height = 0;
            
            // Try finding dimensions in the map
            if (file in dimensionsMap) {
              width = dimensionsMap[file].width;
              height = dimensionsMap[file].height;
              logEvent(`[portfolio-images] Using pre-generated dimensions for ${file}: ${width}x${height}`);
            } 
            // If dimensions not found in map, get them from the actual file
            else {
              try {
                const buffer = await devFs.readFile(filePath);
                const dimensions = imageSize(buffer);
                width = dimensions.width ?? 0;
                height = dimensions.height ?? 0;
                logEvent(`[portfolio-images] Extracted dimensions from file ${file}: ${width}x${height}`);
              } catch (e) {
                logEvent(`[portfolio-images] Error getting dimensions for dev ${filePath}: ${e}`);
              }
            }
            
            images.push({
              url: `/images/Portfolio/${folder}/${file}`,
              fallback: `/images/Portfolio/${folder}/${file}`,
              width,
              height,
              alt: altMap[file] || '',
              _source: `local-dev-${folder}`
            });
        }
        
        logEvent(`[portfolio-images] DEV MODE: Successfully loaded ${images.length} images from local directory ${folder}`);
      } catch (dirError) {
        logEvent(`[portfolio-images] DEV MODE ERROR: Failed to read local directory ${localPortfolioPath}: ${dirError}`);
      }
    } else { 
      // Production mode - use R2 bucket and dimensions map from the appropriate width folder
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      // List objects from the appropriate width folder
      const r2Prefix = `portfolio/${folder}/`;
      logEvent(`[portfolio-images] Listing objects from R2 bucket with prefix ${r2Prefix}`);
      
      const r2Objects = await platform.env.ASSETSBUCKET.list({
        prefix: r2Prefix,
      });
      
      logEvent(`[portfolio-images] Found ${r2Objects.objects.length} objects in R2 bucket for folder ${folder}`);

      // Update diagnostics with R2 info
      diagnostics.r2ObjectCount = r2Objects.objects.length;
      diagnostics.dimensionsMapSize = Object.keys(dimensionsMap).length;
      
      // Log dimension info for debugging
      const dimensionCount = Object.keys(dimensionsMap).length;
      logEvent(`[portfolio-images] Using dimensions map with ${dimensionCount} entries for ${folder}`);
      
      if (dimensionCount > 0) {
        // Log a few sample dimensions
        const sampleKeys = Object.keys(dimensionsMap).slice(0, 3);
        const sampleDims = sampleKeys.map(key => `${key}: ${dimensionsMap[key].width}x${dimensionsMap[key].height}`).join(', ');
        logEvent(`[portfolio-images] Sample dimensions: ${sampleDims}`);
        
        // Add sample to diagnostics
        diagnostics.sampleDimensions = {};
        sampleKeys.forEach(key => {
          // @ts-ignore - This is fine for diagnostic data
          diagnostics.sampleDimensions[key] = dimensionsMap[key];
        });
      }

      images = r2Objects.objects
        .filter((obj: any) => {
          const ext = obj.key.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
        })
        .map((obj: any): PortfolioImage => {
          let width = 1, height = 1; // Default dimensions
          const filename = obj.key.split('/').pop() || '';
          let dimensionSource = 'default';

          // Try to get dimensions from the map using various key patterns
          // Check if key/filename exists before accessing
          if (dimensionsMap && obj.key in dimensionsMap) {
            const key = obj.key as keyof typeof dimensionsMap; // Assert key type
            width = dimensionsMap[key].width;
            height = dimensionsMap[key].height;
            dimensionSource = 'full-key';
          } else if (dimensionsMap && filename in dimensionsMap) {
            const key = filename as keyof typeof dimensionsMap; // Assert key type
            width = dimensionsMap[key].width;
            height = dimensionsMap[key].height;
            dimensionSource = 'filename';
          } else if (obj.customMetadata?.width && obj.customMetadata?.height) {
              // Fallback to R2 custom metadata if available (example)
              try {
                width = parseInt(obj.customMetadata.width, 10);
                height = parseInt(obj.customMetadata.height, 10);
                dimensionSource = 'metadata';
              } catch (e) { /* Ignore parsing errors */ }
          }
          
          // Ensure width/height are numbers, default to 1 if necessary
          width = !isNaN(width) && width > 0 ? width : 1;
          height = !isNaN(height) && height > 0 ? height : 1;
          
          return {
            url: assetUrl(obj.key),
            fallback: assetUrl(obj.key),
            width,
            height,
            alt: altMap[filename] || '',
            _source: `r2-${folder}-${dimensionSource}`
          };
        });
    }

    // Add basic sorting
    images.sort((a, b) => a.fallback.localeCompare(b.fallback));
    
    // Calculate processing time
    diagnostics.processingTimeMs = Date.now() - startTime;
    
    logEvent(`[portfolio-images] Returning ${images.length} images`);
    
    // In development or when ?debug=true, include diagnostic info
    const includeDebug = dev || (request?.url && new URL(request.url).searchParams.has('debug'));
    
    if (includeDebug) {
      // Include diagnostics directly in the response for debugging
      return json({
        images,
        _debug: {
          ...diagnostics,
          logs: debugLogs
        }
      });
    } else {
      // Normal production response - return just the images array
      return json(images);
    }
  } catch (error) {
    logEvent(`[portfolio-images] Error listing images: ${error}`);
    // Provide more context in error response if possible
    const message = error instanceof Error ? error.message : 'Unknown error fetching portfolio images';
    return new Response(JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString(),
      logs: debugLogs
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
