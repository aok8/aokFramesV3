import type { PageServerLoad } from '@sveltejs/kit';
import type { PageData, LayoutData } from './$types.js';

export const load: PageServerLoad<PageData, LayoutData> = async ({ parent }) => {
  // Get the works that were already loaded in the layout
  const parentData = await parent();
  
  // If we already have works from the layout, use those
  if (parentData.works && parentData.works.length > 0) {
    console.log('Works page using works from layout');
    return {
      works: parentData.works
    };
  }
  
  // This is a fallback and should not normally be reached
  console.log('Works page falling back to layout data');
  return parentData;
}; 