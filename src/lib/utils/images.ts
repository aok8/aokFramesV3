import { dev } from '$app/environment';

interface PortfolioImage {
  url: string;
  fallback: string;
}

// For development environment
const getDevImages = (): PortfolioImage[] => {
  const images = import.meta.glob('/src/images/portfolio/*.{jpg,jpeg,png}', { eager: true });
  return Object.entries(images).map(([path, module]) => {
    const filename = path.split('/').pop() || '';
    return {
      url: `/directr2/portfolio/${filename}`,
      fallback: `/images/portfolio/${filename}`
    };
  });
};

// For production environment
const getProdImages = async (): Promise<PortfolioImage[]> => {
  try {
    const response = await fetch('/api/portfolio-images');
    if (!response.ok) throw new Error('Failed to fetch portfolio images');
    return await response.json();
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    return getDevImages(); // Fallback to dev images if R2 fails
  }
};

export const getPortfolioImages = async (): Promise<PortfolioImage[]> => {
  if (dev) {
    return getDevImages();
  }
  return getProdImages();
}; 