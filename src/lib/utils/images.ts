interface PortfolioImage {
  url: string;
  fallback: string;
  width: number;
  height: number;
}

export const getPortfolioImages = async (): Promise<PortfolioImage[]> => {
  try {
    console.log('Fetching portfolio images from API...');
    const response = await fetch('/api/portfolio-images');
    
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