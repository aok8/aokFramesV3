import { BROWSER } from 'svelte/environment';
import { dimensionsMap as localDimensionsMap } from '$lib/data/portfolio-dimensions';
import { readable, type Readable } from 'svelte/store';

interface ImageDimensions {
  width: number;
  height: number;
}

type DimensionsMap = Record<string, ImageDimensions>;

// Store to hold the dimensions map
let dimensionsStore: Readable<DimensionsMap | null>;

async function fetchDimensions(): Promise<DimensionsMap | null> {
  try {
    const response = await fetch('/api/dimensions');
    if (!response.ok) {
      throw new Error(`Failed to fetch dimensions: ${response.statusText}`);
    }
    const data: DimensionsMap = await response.json();
    
    // Check if we got any dimensions from the API
    if (data && Object.keys(data).length > 0) {
      console.log(`Successfully fetched ${Object.keys(data).length} image dimensions from API`);
      return data;
    } else {
      console.warn('API returned empty dimensions data, falling back to local dimensions');
      return null; // Will trigger fallback to local dimensions
    }
  } catch (error) {
    console.error('Error fetching image dimensions:', error);
    return null; // Return null on error, will trigger fallback to local dimensions
  }
}

// In development, we'll still prefer local dimensions for faster development
// but in production, we'll try API first, then fall back to local
if (import.meta.env.DEV) {
  // In development, use the locally generated map directly
  console.log('Using local image dimensions map (Development Mode).');
  dimensionsStore = readable<DimensionsMap | null>(localDimensionsMap, () => {
    // No setup needed for static local data
    return () => {}; // No cleanup needed
  });
} else {
  // In production, always try API first but have localDimensionsMap as fallback
  console.log('Fetching image dimensions from API with local fallback (Production Mode).');
  
  dimensionsStore = readable<DimensionsMap | null>(localDimensionsMap, (set) => {
    if (BROWSER) {
      // If we're in the browser, fetch from the API
      fetchDimensions().then(data => {
        if (data) {
          // If API data exists, use it
          set(data);
        }
        // Otherwise, we're already initialized with localDimensionsMap
      });
    }
    return () => {}; // No cleanup needed
  });
}

/**
 * Svelte hook to get the image dimensions map.
 * Uses local data in development and fetches from API in production with local fallback.
 * 
 * @returns A readable store containing the dimensions map.
 */
export function useImageDimensions(): Readable<DimensionsMap | null> {
  return dimensionsStore;
}

/**
 * Utility function to get dimensions for a specific image from the map.
 * 
 * @param map The dimensions map (from the store).
 * @param imageName The filename of the image (e.g., "image1.jpg").
 * @param r2BasePath The base path in R2 (e.g., "portfolio/"). Defaults to "portfolio/".
 * @returns The dimensions { width, height } or null if not found.
 */
export function getDimensions(map: DimensionsMap | null, imageName: string, r2BasePath: string = 'portfolio/'): ImageDimensions | null {
  if (!map || !imageName) {
    return null;
  }
  // First try the full key as stored in R2/KV
  const key = `${r2BasePath}${imageName}`;
  if (map[key]) {
    return map[key];
  }
  
  // Then try just the filename without the path
  // This is important for local fallback which may not have the full path
  if (map[imageName]) {
    return map[imageName];
  }
  
  return null;
} 