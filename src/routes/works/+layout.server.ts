import type { LayoutServerLoad } from '@sveltejs/kit';
import { loadWorks } from '$lib/server/works.js';
import type { Work } from '$lib/types/works.js';
import type { LayoutData } from './$types.js';

// Define the type for the layout data
export type WorksLayoutData = {
  works: Work[];
  r2Available: boolean;
  error?: string;
  layoutStatus?: 'skipped-work-load' | 'loaded' | 'api-fallback' | 'error';
};

export const load: LayoutServerLoad<LayoutData> = async ({ platform, url }): Promise<LayoutData> => {
  console.log('-------- Works Layout Server Load Start --------');
  console.log('URL:', url.pathname);
  
  const r2Available = !!platform?.env?.ASSETSBUCKET;
  console.log('Layout: R2 available:', r2Available);
  
  try {
    // Load works using server-side functionality
    console.log('Layout: Attempting loadWorks...');
    const works = await loadWorks(platform);
    console.log(`Layout: Loaded ${works.length} works via loadWorks`);
    
    if (works && works.length > 0) {
      return {
        works,
        r2Available,
        layoutStatus: 'loaded'
      };
    }

    // If no works found
    console.warn('Layout: loadWorks returned 0 works.');
    return {
      works: [],
      r2Available,
      error: 'No works found',
      layoutStatus: 'error'
    };
  } catch (error: unknown) {
    console.error('Layout: Error during layout load:', error);
    return {
      works: [],
      r2Available,
      error: error instanceof Error ? error.message : 'Unknown error loading works',
      layoutStatus: 'error'
    };
  }
}; 