import type { LayoutServerLoad } from '@sveltejs/kit';
import { loadWorks } from '$lib/server/works.js';
import type { Work } from '$lib/types/works.js';
import type { LayoutData } from './$types.js';
import { createServerLogger } from '$lib/utils/logger';

// Define the type for the layout data
export type WorksLayoutData = {
  works: Work[];
  r2Available: boolean;
  error?: string;
  layoutStatus?: 'skipped-work-load' | 'loaded' | 'api-fallback' | 'error';
};

export const load: LayoutServerLoad<LayoutData> = async ({ platform, url }): Promise<LayoutData> => {
  const serverLogger = createServerLogger(platform?.env);
  
  serverLogger.log('-------- Works Layout Server Load Start --------');
  serverLogger.log('URL:', url.pathname);
  
  const r2Available = !!platform?.env?.ASSETSBUCKET;
  serverLogger.log('Layout: R2 available:', r2Available);
  
  try {
    // Load works using server-side functionality
    serverLogger.log('Layout: Attempting loadWorks...');
    const works = await loadWorks(platform);
    serverLogger.log(`Layout: Loaded ${works.length} works via loadWorks`);
    
    if (works && works.length > 0) {
      return {
        works,
        r2Available,
        layoutStatus: 'loaded'
      };
    }

    // If no works found
    serverLogger.warn('Layout: loadWorks returned 0 works.');
    return {
      works: [],
      r2Available,
      error: 'No works found',
      layoutStatus: 'error'
    };
  } catch (error: unknown) {
    serverLogger.error('Layout: Error during layout load:', error);
    return {
      works: [],
      r2Available,
      error: error instanceof Error ? error.message : 'Unknown error loading works',
      layoutStatus: 'error'
    };
  }
}; 