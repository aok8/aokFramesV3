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
    return data;
  } catch (error) {
    console.error('Error fetching image dimensions:', error);
    return null; // Return null on error
  }
}

if (import.meta.env.DEV) {
  // In development, use the locally generated map directly
  console.log('Using local image dimensions map (Development Mode).');
  dimensionsStore = readable<DimensionsMap | null>(localDimensionsMap, () => {
    // No setup needed for static local data
    return () => {}; // No cleanup needed
  });
} else {
  // In production, fetch from the API
  console.log('Fetching image dimensions from API (Production Mode).');
  // Only fetch on the client-side in production to avoid build-time fetches
  let initialValue: DimensionsMap | null = null;
  let setStore: (value: DimensionsMap | null) => void;

  dimensionsStore = readable<DimensionsMap | null>(initialValue, (set) => {
    setStore = set;
    if (BROWSER) {
      fetchDimensions().then(data => {
        if (data) {
          set(data);
        }
      });
    }
    return () => {}; // No cleanup needed
  });
  
  // If not running in the browser initially (e.g., SSR), 
  // potentially try fetching again when component mounts if needed,
  // although API route should ideally be available during SSR build/render too.
  // The `BROWSER` check handles the typical CSR case.
}

/**
 * Svelte hook to get the image dimensions map.
 * Uses local data in development and fetches from API in production.
 * 
 * @returns A readable store containing the dimensions map (or null if loading/error).
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
  // Construct the full key as stored in R2/KV
  const key = `${r2BasePath}${imageName}`;
  return map[key] || null;
} 