interface PortfolioImage {
  url: string;
  fallback: string;
  width: number;
  height: number;
}

export const getPortfolioImages = async (): Promise<PortfolioImage[]> => {
  try {
    // Get the current screen width for responsive images
    const screenWidth = window.innerWidth;
    console.log(`Fetching portfolio images from API with screen width: ${screenWidth}...`);
    
    // Pass screen width as a query parameter
    const response = await fetch(`/api/portfolio-images?width=${screenWidth}`);
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch portfolio images: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if the response has the expected structure
    if (data && Array.isArray(data)) {
      console.log(`Received ${data.length} portfolio images`);
      return data;
    } else if (data && 'images' in data && Array.isArray(data.images)) {
      // Handle response format with images property
      console.log(`Received ${data.images.length} portfolio images (nested)`);
      return data.images;
    } else {
      console.error('Invalid API response format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    return [];
  }
}; 