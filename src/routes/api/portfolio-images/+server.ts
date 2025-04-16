import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import path from 'node:path';
import { imageSize } from 'image-size';
import type { PageServerLoad } from './$types';
// Import the generated constant from the .ts file as fallback
// @ts-ignore - Generated file may not exist for TypeScript
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

// GET API route
export const GET: PageServerLoad = async ({ platform, fetch }) => {
  console.log('[portfolio-images] Endpoint called');
  
  // Create a debug log collection 
  const debugLogs: string[] = [];
  const logEvent = (message: string) => {
    console.log(message);
    debugLogs.push(`${new Date().toISOString()}: ${message}`);
  };
  
  logEvent('[portfolio-images] Endpoint called with debug logging');
  
  try {
    let images: PortfolioImage[] = [];
    
    // Initialize dimensions map to an empty object to prevent null errors
    let dimensionsMap: DimensionsMap = {};
    
    // Diagnostic information to include in response
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: dev ? 'development' : 'production',
      platform: !!platform,
      platformEnv: !!platform?.env,
      availableBindings: platform?.env ? Object.keys(platform.env) : [],
      kvAvailable: !!platform?.env?.IMAGE_DIMS_KV,
      r2Available: !!platform?.env?.ASSETSBUCKET,
      localDimensionsAvailable: !!localDimensionsMap,
      localDimensionsCount: localDimensionsMap ? Object.keys(localDimensionsMap).length : 0,
      dimensionsSource: 'none',
      logs: debugLogs
    };
    
    // In development, use local dimensions for simplicity/speed
    if (dev) {
      dimensionsMap = localDimensionsMap || {};
      logEvent(`[portfolio-images] DEV MODE: Using local dimensions: ${Object.keys(dimensionsMap).length} entries`);
      diagnostics.dimensionsSource = 'local-dev';
    } 
    // In production, always try to get dimensions from KV first
    else {
      logEvent('[portfolio-images] PRODUCTION MODE: Attempting to load dimensions');
      
      // Log environment info to diagnose issues
      logEvent(`[portfolio-images] Platform available: ${!!platform}`);
      logEvent(`[portfolio-images] Platform env available: ${!!platform?.env}`);
      if (platform?.env) {
        logEvent(`[portfolio-images] Available bindings: ${Object.keys(platform.env).join(', ')}`);
      }
      
      // STEP 1: Try to access KV directly (the most reliable in Cloudflare)
      if (platform?.env?.IMAGE_DIMS_KV) {
        try {
          logEvent('[portfolio-images] Accessing KV directly...');
          const listResponse = await platform.env.IMAGE_DIMS_KV.list({ 
            prefix: 'portfolio/' 
          });
          
          logEvent(`[portfolio-images] KV list response received. Found ${listResponse?.keys?.length || 0} keys`);
          
          if (listResponse && listResponse.keys && listResponse.keys.length > 0) {
            // Create a map to store the dimensions
            const kvDimensions: DimensionsMap = {};
            
            // Log first few keys for debugging
            if (listResponse.keys.length > 0) {
              const sampleKeys = listResponse.keys.slice(0, 3).map((k: any) => k.name).join(', ');
              logEvent(`[portfolio-images] First few KV keys: ${sampleKeys}`);
            }
            
            // Get dimensions in parallel
            const fetchPromises = listResponse.keys.map(async (key: any) => {
              try {
                const value = await platform.env.IMAGE_DIMS_KV.get(key.name);
                if (value) {
                  const dims = JSON.parse(value);
                  kvDimensions[key.name] = dims;
                }
              } catch (err) {
                logEvent(`[portfolio-images] Error fetching KV value for ${key.name}: ${err}`);
              }
            });
            
            // Wait for all fetches to complete
            await Promise.all(fetchPromises);
            
            const keyCount = Object.keys(kvDimensions).length;
            if (keyCount > 0) {
              logEvent(`[portfolio-images] Successfully loaded ${keyCount} dimensions from KV`);
              dimensionsMap = kvDimensions;
              diagnostics.dimensionsSource = 'kv';
            } else {
              logEvent('[portfolio-images] No valid dimensions were loaded from KV');
            }
          } else {
            logEvent('[portfolio-images] No keys found in KV store');
          }
        } catch (kvError) {
          logEvent(`[portfolio-images] Error accessing KV directly: ${kvError}`);
          diagnostics.kvError = String(kvError);
        }
      } else {
        logEvent('[portfolio-images] IMAGE_DIMS_KV binding not available');
      }
      
      // STEP 2: Fall back to local dimensions if KV access failed or returned empty
      if (Object.keys(dimensionsMap).length === 0 && localDimensionsMap) {
        logEvent('[portfolio-images] Falling back to local dimensions map');
        dimensionsMap = localDimensionsMap;
        diagnostics.dimensionsSource = 'local-fallback';
        logEvent(`[portfolio-images] Using ${Object.keys(dimensionsMap).length} local dimension entries`);
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
            const buffer = await devFs.readFile(filePath);
            const dimensions = imageSize(buffer);
            width = dimensions.width ?? 0;
            height = dimensions.height ?? 0;
          } catch (e) {
            logEvent(`[portfolio-images] Error getting dimensions for dev ${filePath}: ${e}`);
          }
          images.push({
            url: `/images/portfolio/${file}`,
            fallback: `/images/portfolio/${file}`,
            width,
            height
          });
      }
    } else { 
      // Production mode - use R2 bucket and dimensions map
      if (!platform?.env?.ASSETSBUCKET) {
        throw new Error('ASSETSBUCKET binding not found');
      }

      logEvent('[portfolio-images] Listing objects from R2 bucket');
      const r2Objects = await platform.env.ASSETSBUCKET.list({
        prefix: 'portfolio/',
      });
      logEvent(`[portfolio-images] Found ${r2Objects.objects.length} objects in R2 bucket`);

      // Update diagnostics with R2 info
      diagnostics.r2ObjectCount = r2Objects.objects.length;
      diagnostics.dimensionsMapSize = Object.keys(dimensionsMap).length;
      
      // Log dimension info for debugging
      const dimensionCount = Object.keys(dimensionsMap).length;
      logEvent(`[portfolio-images] Using dimensions map with ${dimensionCount} entries`);
      if (dimensionCount > 0) {
        // Log a few sample dimensions
        const sampleKeys = Object.keys(dimensionsMap).slice(0, 3);
        const sampleDims = sampleKeys.map(key => `${key}: ${dimensionsMap[key].width}x${dimensionsMap[key].height}`).join(', ');
        logEvent(`[portfolio-images] Sample dimensions: ${sampleDims}`);
        
        // Add sample to diagnostics
        diagnostics.sampleDimensions = {};
        sampleKeys.forEach(key => {
          diagnostics.sampleDimensions[key] = dimensionsMap[key];
        });
      }

      images = r2Objects.objects
        .filter((obj: R2Object) => {
          const ext = obj.key.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
        })
        .map((obj: R2Object): PortfolioImage => {
          let width = 1, height = 1; // Default dimensions
          const filename = obj.key.split('/').pop() || '';
          let dimensionSource = 'default';

          // First try to get dimensions from the map using the full key
          if (obj.key in dimensionsMap) {
            width = dimensionsMap[obj.key].width;
            height = dimensionsMap[obj.key].height;
            dimensionSource = 'full-key';
          }
          // Then try using just the filename
          else if (filename in dimensionsMap) {
            width = dimensionsMap[filename].width;
            height = dimensionsMap[filename].height;
            dimensionSource = 'filename';
          }
          // Finally, try with the portfolio/ prefix explicitly
          else if (('portfolio/' + filename) in dimensionsMap) {
            width = dimensionsMap['portfolio/' + filename].width;
            height = dimensionsMap['portfolio/' + filename].height;
            dimensionSource = 'portfolio-prefix';
          }
          else {
            logEvent(`[portfolio-images] No dimensions found for: ${obj.key}`);
          }
          
          width = width || 1;
          height = height || 1;

          return {
            url: `/directr2/${obj.key}`,
            fallback: `/images/Portfolio/${filename}`,
            width: width,
            height: height,
            _source: dimensionSource // Include source for debugging
          };
        });
    }

    // Add basic sorting
    images.sort((a, b) => a.fallback.localeCompare(b.fallback));
    
    logEvent(`[portfolio-images] Returning ${images.length} images`);
    
    // In development or when ?debug=true, include diagnostic info
    const includeDebug = dev || new URL(request.url || "http://localhost").searchParams.has('debug');
    
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
      // Normal production response
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