import { dev } from '$app/environment';

/**
 * Load function to ensure image paths work correctly in both dev and production
 * @param {{ fetch: (input: string) => Promise<Response> }} param0 
 */
export const load = async ({ fetch }) => {
  // Make sure we have access to images
  if (dev) {
    // In development, preload key images to ensure they're available
    try {
      // First load the essential images
      await fetch('/images/bg.jpg');
      await fetch('/images/Profile_Pic.jpg');
      console.log('Preloaded key images for development');
      
      // Then preload portfolio image data
      const portfolioResponse = await fetch('/api/portfolio-images');
      if (portfolioResponse.ok) {
        const portfolioImages = await portfolioResponse.json();
        console.log(`Loaded ${portfolioImages.length} portfolio images data`);
        
        // Preload the first few portfolio images (just trigger the request, don't wait for completion)
        if (Array.isArray(portfolioImages) && portfolioImages.length > 0) {
          const imagesToPreload = portfolioImages.slice(0, 3);
          imagesToPreload.forEach(image => {
            if (image.url) {
              // Create a hidden image element to preload
              const img = new Image();
              img.src = image.url;
              console.log(`Preloading portfolio image: ${image.url}`);
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to preload development images:', e);
    }
  }
  
  return {}; // Return an empty object for the load function
};

export const ssr = true;
export const csr = true; 