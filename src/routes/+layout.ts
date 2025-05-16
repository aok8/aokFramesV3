import { dev } from '$app/environment';
import type { LayoutLoad } from './$types.js';
import { envStore } from '$lib/stores/envStore';
import { logger } from '$lib/utils/logger';

export const load: LayoutLoad = async ({ data, fetch }) => {
  // Update the envStore with the server-provided value
  if (data && typeof data.verboseLogging === 'boolean') {
    envStore.set({ verboseLogging: data.verboseLogging });
    logger.log(`[LayoutLoad] envStore updated with verboseLogging: ${data.verboseLogging}`);
  } else {
    logger.warn('[LayoutLoad] verboseLogging not found in data, using default for envStore.');
  }

  // Make sure we have access to images
  if (dev) {
    // In development, preload key images to ensure they're available
    try {
      // First load the essential images
      await fetch('/images/constants/bg.webp');
      await fetch('/images/constants/Profile_Pic.webp');
      logger.log('Preloaded key images for development');
      
      // Then preload portfolio image data
      const portfolioResponse = await fetch('/api/portfolio-images');
      if (portfolioResponse.ok) {
        const portfolioImagesData = await portfolioResponse.json();
        // Type assertion for better type safety
        const portfolioImages = (Array.isArray(portfolioImagesData) 
          ? portfolioImagesData 
          : portfolioImagesData?.images || []) as { url: string }[];
        
        logger.log(`Loaded ${portfolioImages.length} portfolio images data`);
        
        // Preload the first few portfolio images
        if (portfolioImages.length > 0) {
          const imagesToPreload = portfolioImages.slice(0, 3);
          imagesToPreload.forEach((image: { url: string }) => {
            if (image.url) {
              const img = new Image();
              img.src = image.url;
              logger.log(`Preloading portfolio image: ${image.url}`);
            }
          });
        }
      }
    } catch (e: any) {
      logger.error('Failed to preload development images:', e.message);
    }
  }
  
  return {
    ...data
  };
};

export const ssr = true;
export const csr = true; 