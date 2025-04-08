interface PortfolioImage {
  url: string;
  fallback: string;
}

export const getPortfolioImages = async (): Promise<PortfolioImage[]> => {
  try {
    const response = await fetch('/api/portfolio-images');
    if (!response.ok) throw new Error('Failed to fetch portfolio images');
    return await response.json();
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    return [];
  }
}; 