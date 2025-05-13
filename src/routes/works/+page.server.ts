import type { PageServerLoad } from '@sveltejs/kit';
import type { PageData, LayoutData } from './$types.js';
import { loadWorks } from '$lib/server/works.js';

export const load: PageServerLoad<PageData, LayoutData> = async ({ parent, platform }) => {
  // Get the works that were already loaded in the layout
  console.log('Works page: Starting page load function...');
  
  // Get the parent data which should contain works from the layout
  let parentData;
  try {
    console.log('Works page: Awaiting parent data...');
    parentData = await parent();
    console.log('Works page: Parent data received.');
    console.log('Works page: Parent works count:', parentData.works?.length || 0);
    console.log('Works page: Parent layout status:', parentData.layoutStatus);
  } catch (error) {
    console.error('Works page: Error getting parent data:', error);
    parentData = { works: [] };
  }
  
  // If we have works from the parent, use them
  if (parentData.works && parentData.works.length > 0) {
    console.log(`Works page: Using ${parentData.works.length} works from layout`);
    return {
      works: parentData.works
    };
  }
  
  // If we get here, the layout didn't provide works
  console.log('Works page: No works from layout, attempting direct load...');
  
  try {
    // Try loading works directly
    const works = await loadWorks(platform);
    console.log(`Works page: Directly loaded ${works.length} works`);
    
    if (works && works.length > 0) {
      return {
        works,
        directLoad: true
      };
    } else {
      console.warn('Works page: Direct load returned 0 works');
    }
  } catch (error) {
    console.error('Works page: Error during direct load:', error);
  }
  
  // Fallback with empty works array
  console.log('Works page: Falling back to empty works array');
  return {
    works: [],
    loadFailed: true
  };
}; 