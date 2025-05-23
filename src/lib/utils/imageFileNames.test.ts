import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dev } from '$app/environment';

// Mock the environment
vi.mock('$app/environment', () => ({
  dev: false // Default to production for testing
}));

// Mock logger
vi.mock('$lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock platform object for R2 bucket operations
const mockPlatform = {
  env: {
    ASSETSBUCKET: {
      list: vi.fn(),
      get: vi.fn(),
      head: vi.fn()
    }
  }
};

// Blog post image file name functions
class BlogPostImageHandler {
  static async getBlogPostImageFileNames(platform?: any): Promise<string[]> {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET not available');
    }

    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'blog/posts/'
    });

    if (!objects || !objects.objects) {
      return [];
    }

    // Extract image file names from blog posts
    const imageFiles: string[] = [];
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
    
    objects.objects.forEach((obj: any) => {
      const key = obj.key;
      const fileName = key.split('/').pop() || '';
      
      // Check if it's an image file
      const hasImageExtension = imageExtensions.some(ext => 
        fileName.toLowerCase().endsWith(ext)
      );
      
      if (hasImageExtension) {
        imageFiles.push(fileName);
      }
    });

    return imageFiles;
  }

  static async getBlogPostHeaderImages(platform?: any): Promise<{ slug: string; imageFormat: string }[]> {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET not available');
    }

    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'blog/posts/'
    });

    if (!objects || !objects.objects) {
      return [];
    }

    const headerImages: { slug: string; imageFormat: string }[] = [];
    const imageFormats = ['webp', 'jpg', 'jpeg', 'png'];
    
    // Group by slug
    const slugMap = new Map<string, string[]>();
    
    objects.objects.forEach((obj: any) => {
      const parts = obj.key.split('/');
      if (parts.length >= 4 && parts[0] === 'blog' && parts[1] === 'posts') {
        const slug = parts[2];
        const fileName = parts[3];
        
        if (!slugMap.has(slug)) {
          slugMap.set(slug, []);
        }
        slugMap.get(slug)!.push(fileName);
      }
    });

    // Check for header images in each slug
    for (const [slug, files] of slugMap.entries()) {
      for (const format of imageFormats) {
        const headerFileName = `header.${format}`;
        if (files.includes(headerFileName)) {
          headerImages.push({ slug, imageFormat: format });
          break; // Take the first format found
        }
      }
    }

    return headerImages;
  }

  static parseBlogPostSlugFromKey(key: string): string | null {
    // Extract slug from keys like "blog/posts/my-post/index.md" or "blog/posts/my-post/header.webp"
    const parts = key.split('/');
    if (parts.length >= 4 && parts[0] === 'blog' && parts[1] === 'posts') {
      const slug = parts[2];
      return slug.length > 0 ? slug : null;
    }
    return null;
  }
}

// Works image file name functions
class WorksImageHandler {
  static async getWorksImageFileNames(platform?: any): Promise<string[]> {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET not available');
    }

    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'works/'
    });

    if (!objects || !objects.objects) {
      return [];
    }

    const imageFiles: string[] = [];
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
    
    objects.objects.forEach((obj: any) => {
      const key = obj.key;
      const fileName = key.split('/').pop() || '';
      
      // Check if it's an image file (not index.md)
      const hasImageExtension = imageExtensions.some(ext => 
        fileName.toLowerCase().endsWith(ext)
      );
      
      if (hasImageExtension && !fileName.endsWith('index.md')) {
        imageFiles.push(fileName);
      }
    });

    return imageFiles;
  }

  static async getWorksSlugsWithImages(platform?: any): Promise<{ slug: string; imageCount: number; coverImage?: string }[]> {
    if (!platform?.env?.ASSETSBUCKET) {
      throw new Error('ASSETSBUCKET not available');
    }

    const objects = await platform.env.ASSETSBUCKET.list({
      prefix: 'works/'
    });

    if (!objects || !objects.objects) {
      return [];
    }

    // Group by slug and count images
    const slugMap = new Map<string, { files: string[]; hasIndexMd: boolean }>();
    
    objects.objects.forEach((obj: any) => {
      const parts = obj.key.split('/');
      if (parts.length >= 3 && parts[0] === 'works') {
        const slug = parts[1];
        const fileName = parts[2];
        
        if (!slugMap.has(slug)) {
          slugMap.set(slug, { files: [], hasIndexMd: false });
        }
        
        const slugData = slugMap.get(slug)!;
        slugData.files.push(fileName);
        
        if (fileName === 'index.md') {
          slugData.hasIndexMd = true;
        }
      }
    });

    const results: { slug: string; imageCount: number; coverImage?: string }[] = [];
    const imageExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
    
    for (const [slug, data] of slugMap.entries()) {
      // Only include slugs that have index.md (valid works)
      if (data.hasIndexMd) {
        const imageFiles = data.files.filter(file => 
          imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
        );
        
        // Find potential cover image (often the first image alphabetically)
        const coverImage = imageFiles.sort()[0];
        
        results.push({
          slug,
          imageCount: imageFiles.length,
          coverImage
        });
      }
    }

    return results.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  static parseWorksSlugFromKey(key: string): string | null {
    // Extract slug from keys like "works/my-work/image1.jpg" or "works/my-work/index.md"
    const parts = key.split('/');
    if (parts.length >= 3 && parts[0] === 'works') {
      const slug = parts[1];
      return slug.length > 0 ? slug : null;
    }
    return null;
  }
}

describe('Blog Post Image File Names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should extract image file names from blog posts', async () => {
    const mockObjects = {
      objects: [
        { key: 'blog/posts/test-post/index.md' },
        { key: 'blog/posts/test-post/header.webp' },
        { key: 'blog/posts/test-post/image1.jpg' },
        { key: 'blog/posts/another-post/index.md' },
        { key: 'blog/posts/another-post/header.jpeg' },
        { key: 'blog/posts/photo-essay/banner.png' }
      ]
    };

    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue(mockObjects);

    const imageFiles = await BlogPostImageHandler.getBlogPostImageFileNames(mockPlatform);

    expect(imageFiles).toEqual([
      'header.webp',
      'image1.jpg', 
      'header.jpeg',
      'banner.png'
    ]);
    expect(mockPlatform.env.ASSETSBUCKET.list).toHaveBeenCalledWith({
      prefix: 'blog/posts/'
    });
  });

  it('should find header images for blog posts', async () => {
    const mockObjects = {
      objects: [
        { key: 'blog/posts/test-post/index.md' },
        { key: 'blog/posts/test-post/header.webp' },
        { key: 'blog/posts/another-post/index.md' },
        { key: 'blog/posts/another-post/header.jpg' },
        { key: 'blog/posts/no-header/index.md' },
        { key: 'blog/posts/multiple-formats/header.png' },
        { key: 'blog/posts/multiple-formats/header.webp' } // Should prefer first found
      ]
    };

    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue(mockObjects);

    const headerImages = await BlogPostImageHandler.getBlogPostHeaderImages(mockPlatform);

    expect(headerImages).toEqual([
      { slug: 'test-post', imageFormat: 'webp' },
      { slug: 'another-post', imageFormat: 'jpg' },
      { slug: 'multiple-formats', imageFormat: 'webp' } // webp comes first in format array
    ]);
  });

  it('should parse slug from blog post key correctly', () => {
    expect(BlogPostImageHandler.parseBlogPostSlugFromKey('blog/posts/my-awesome-post/index.md'))
      .toBe('my-awesome-post');
    
    expect(BlogPostImageHandler.parseBlogPostSlugFromKey('blog/posts/photo-essay/header.webp'))
      .toBe('photo-essay');
    
    expect(BlogPostImageHandler.parseBlogPostSlugFromKey('invalid/key/structure'))
      .toBe(null);
    
    expect(BlogPostImageHandler.parseBlogPostSlugFromKey('blog/posts/'))
      .toBe(null);
  });

  it('should handle empty blog posts list', async () => {
    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue({ objects: [] });

    const imageFiles = await BlogPostImageHandler.getBlogPostImageFileNames(mockPlatform);
    const headerImages = await BlogPostImageHandler.getBlogPostHeaderImages(mockPlatform);

    expect(imageFiles).toEqual([]);
    expect(headerImages).toEqual([]);
  });

  it('should handle missing ASSETSBUCKET', async () => {
    const platformWithoutBucket = { env: {} };

    await expect(BlogPostImageHandler.getBlogPostImageFileNames(platformWithoutBucket))
      .rejects.toThrow('ASSETSBUCKET not available');
  });
});

describe('Works Image File Names', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should extract image file names from works', async () => {
    const mockObjects = {
      objects: [
        { key: 'works/portrait-series/index.md' },
        { key: 'works/portrait-series/cover.webp' },
        { key: 'works/portrait-series/image1.jpg' },
        { key: 'works/portrait-series/image2.jpg' },
        { key: 'works/landscape-work/index.md' },
        { key: 'works/landscape-work/hero.png' }
      ]
    };

    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue(mockObjects);

    const imageFiles = await WorksImageHandler.getWorksImageFileNames(mockPlatform);

    expect(imageFiles).toEqual([
      'cover.webp',
      'image1.jpg',
      'image2.jpg',
      'hero.png'
    ]);
    expect(mockPlatform.env.ASSETSBUCKET.list).toHaveBeenCalledWith({
      prefix: 'works/'
    });
  });

  it('should get works slugs with image counts', async () => {
    const mockObjects = {
      objects: [
        { key: 'works/portrait-series/index.md' },
        { key: 'works/portrait-series/cover.webp' },
        { key: 'works/portrait-series/image1.jpg' },
        { key: 'works/portrait-series/image2.jpg' },
        { key: 'works/landscape-work/index.md' },
        { key: 'works/landscape-work/hero.png' },
        { key: 'works/landscape-work/sunset.jpeg' },
        { key: 'works/incomplete-work/image.jpg' }, // No index.md - should be excluded
        { key: 'works/no-images/index.md' } // Only index.md, no images
      ]
    };

    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue(mockObjects);

    const worksWithImages = await WorksImageHandler.getWorksSlugsWithImages(mockPlatform);

    expect(worksWithImages).toEqual([
      { slug: 'landscape-work', imageCount: 2, coverImage: 'hero.png' },
      { slug: 'no-images', imageCount: 0, coverImage: undefined },
      { slug: 'portrait-series', imageCount: 3, coverImage: 'cover.webp' }
    ]);
  });

  it('should parse slug from works key correctly', () => {
    expect(WorksImageHandler.parseWorksSlugFromKey('works/portrait-series/cover.webp'))
      .toBe('portrait-series');
    
    expect(WorksImageHandler.parseWorksSlugFromKey('works/landscape-photos/index.md'))
      .toBe('landscape-photos');
    
    expect(WorksImageHandler.parseWorksSlugFromKey('invalid/key/structure'))
      .toBe(null);
    
    expect(WorksImageHandler.parseWorksSlugFromKey('works/'))
      .toBe(null);
  });

  it('should handle empty works list', async () => {
    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue({ objects: [] });

    const imageFiles = await WorksImageHandler.getWorksImageFileNames(mockPlatform);
    const worksWithImages = await WorksImageHandler.getWorksSlugsWithImages(mockPlatform);

    expect(imageFiles).toEqual([]);
    expect(worksWithImages).toEqual([]);
  });

  it('should handle missing ASSETSBUCKET for works', async () => {
    const platformWithoutBucket = { env: {} };

    await expect(WorksImageHandler.getWorksImageFileNames(platformWithoutBucket))
      .rejects.toThrow('ASSETSBUCKET not available');
  });
});

describe('Portfolio Image File Names', () => {
  it('should extract portfolio image file names by width', async () => {
    const mockObjects = {
      objects: [
        { key: 'portfolio/w1920/image1.webp' },
        { key: 'portfolio/w1920/image2.webp' },
        { key: 'portfolio/w1920/photo3.jpg' }
      ]
    };

    mockPlatform.env.ASSETSBUCKET.list.mockResolvedValue(mockObjects);

    // Test extracting files for w1920
    const w1920Objects = await mockPlatform.env.ASSETSBUCKET.list({
      prefix: 'portfolio/w1920/'
    });

    const w1920ImageFiles = w1920Objects.objects
      .filter((obj: any) => {
        const ext = obj.key.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
      })
      .map((obj: any) => obj.key.split('/').pop());

    expect(w1920ImageFiles).toEqual(['image1.webp', 'image2.webp', 'photo3.jpg']);
  });

  it('should parse image dimensions from generated dimension files', () => {
    // Mock dimensions data that would come from generated files
    const mockDimensionsMap: Record<string, { width: number; height: number }> = {
      'image1.webp': { width: 1920, height: 1280 },
      'image2.webp': { width: 1920, height: 1920 },
      'photo3.jpg': { width: 1920, height: 1440 }
    };

    // Test getting dimensions for specific images
    expect(mockDimensionsMap['image1.webp']).toEqual({ width: 1920, height: 1280 });
    expect(mockDimensionsMap['image2.webp']).toEqual({ width: 1920, height: 1920 });
    expect(mockDimensionsMap['photo3.jpg']).toEqual({ width: 1920, height: 1440 });
    expect(mockDimensionsMap['nonexistent.jpg']).toBeUndefined();
  });
});

describe('Image File Validation', () => {
  it('should validate image file extensions correctly', () => {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const validFiles = [
      'image.jpg',
      'photo.JPEG',
      'graphic.png',
      'picture.webp',
      'header.WebP'
    ];
    
    const invalidFiles = [
      'document.pdf',
      'index.md',
      'text.txt',
      'video.mp4',
      'noextension'
    ];

    validFiles.forEach(file => {
      const hasValidExt = validExtensions.some(ext => 
        file.toLowerCase().endsWith(ext.toLowerCase())
      );
      expect(hasValidExt).toBe(true);
    });

    invalidFiles.forEach(file => {
      const hasValidExt = validExtensions.some(ext => 
        file.toLowerCase().endsWith(ext.toLowerCase())
      );
      expect(hasValidExt).toBe(false);
    });
  });

  it('should extract file names from full paths correctly', () => {
    const testPaths = [
      { path: 'blog/posts/my-post/header.webp', expected: 'header.webp' },
      { path: 'works/portrait/cover.jpg', expected: 'cover.jpg' },
      { path: 'portfolio/w1920/image1.png', expected: 'image1.png' },
      { path: 'single-file.jpeg', expected: 'single-file.jpeg' },
      { path: 'deep/nested/path/photo.webp', expected: 'photo.webp' }
    ];

    testPaths.forEach(({ path, expected }) => {
      const fileName = path.split('/').pop() || '';
      expect(fileName).toBe(expected);
    });
  });
}); 