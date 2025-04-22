interface PortfolioImage {
  url: string;
  fallback: string;
  width: number;
  height: number;
}

export const getPortfolioImages = async (screenWidth: number): Promise<PortfolioImage[]> => {
  try {
    // Screen width is now passed in
    console.log(`Fetching portfolio images from API with screen width: ${screenWidth}...`);
    
    // Pass screen width as a query parameter
    const response = await fetch(`/api/portfolio-images?width=${screenWidth}`);
    
    if (!response.ok) {
      console.error(`API error fetching portfolio images: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch portfolio images: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if the response has the expected structure (assuming it might be { images: [...] } or just [...])
    let images: PortfolioImage[] = [];
    if (data && Array.isArray(data)) {
        images = data;
    } else if (data && data.images && Array.isArray(data.images)) {
        images = data.images;
    } else {
        console.error('Invalid portfolio images API response format:', data);
        return []; // Return empty on invalid format
    }

    console.log(`Received ${images.length} portfolio images`);
    // Basic validation of the first image structure (optional)
    if (images.length > 0 && (!images[0].url || !images[0].width || !images[0].height)) {
        console.warn('First portfolio image object seems malformed:', images[0]);
    }

    return images;

  } catch (error) {
    console.error('Error in getPortfolioImages:', error);
    return []; // Return empty array on any error
  }
};
