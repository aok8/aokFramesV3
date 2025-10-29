# Image File Name Tests

This document explains the comprehensive test suite for handling image file names in the aokFramesV3 project.

## Overview

The `src/lib/utils/imageFileNames.test.ts` file contains tests for extracting and managing image file names for:

1. **Blog Posts** - Header images and content images
2. **Works** - Portfolio work images and cover images  
3. **Portfolio** - Gallery images with different width variants
4. **General Image Validation** - File extension and path utilities

## Test Structure

### Blog Post Image Tests

Tests how the system handles blog post images stored in R2 bucket under the `blog/posts/` prefix:

- **`getBlogPostImageFileNames()`** - Extracts all image file names from blog posts
- **`getBlogPostHeaderImages()`** - Finds header images for each blog post slug
- **`parseBlogPostSlugFromKey()`** - Parses slug from R2 keys like `blog/posts/my-post/header.webp`

#### Example Usage:
```typescript
// Extract all blog post image files
const imageFiles = await BlogPostImageHandler.getBlogPostImageFileNames(platform);
// Returns: ['header.webp', 'image1.jpg', 'header.jpeg', 'banner.png']

// Find header images by slug
const headerImages = await BlogPostImageHandler.getBlogPostHeaderImages(platform);
// Returns: [{ slug: 'test-post', imageFormat: 'webp' }, ...]
```

### Works Image Tests

Tests how the system handles work portfolio images stored under the `works/` prefix:

- **`getWorksImageFileNames()`** - Extracts all image file names from works
- **`getWorksSlugsWithImages()`** - Gets works with image counts and cover image detection
- **`parseWorksSlugFromKey()`** - Parses slug from R2 keys like `works/portrait-series/cover.webp`

#### Example Usage:
```typescript
// Extract all works image files
const imageFiles = await WorksImageHandler.getWorksImageFileNames(platform);
// Returns: ['cover.webp', 'image1.jpg', 'image2.jpg', 'hero.png']

// Get works with image statistics
const worksWithImages = await WorksImageHandler.getWorksSlugsWithImages(platform);
// Returns: [{ slug: 'portrait-series', imageCount: 3, coverImage: 'cover.webp' }, ...]
```

### Portfolio Image Tests

Tests the portfolio image system with different width variants (`w1024`, `w1920`, `w3000`):

- **Width-based filtering** - Extracts images for specific width folders
- **Dimensions mapping** - Tests integration with generated dimension files

#### Example Usage:
```typescript
// Get images for specific width
const w1920Objects = await platform.env.ASSETSBUCKET.list({
  prefix: 'portfolio/w1920/'
});

const imageFiles = w1920Objects.objects
  .filter(obj => isValidImageExtension(obj.key))
  .map(obj => getFileNameFromPath(obj.key));
```

### Image Validation Tests

Tests utility functions for:

- **File extension validation** - Checks if files are valid images (`.jpg`, `.jpeg`, `.png`, `.webp`)
- **Path parsing** - Extracts file names from full R2 paths

## Key Features Tested

### 1. R2 Bucket Integration
- Tests mock R2 bucket operations (`list`, `get`, `head`)
- Handles missing bucket scenarios
- Tests proper prefix usage

### 2. File Structure Understanding
- **Blog Posts**: `blog/posts/slug/index.md` and `blog/posts/slug/header.webp`
- **Works**: `works/slug/index.md` and `works/slug/image.jpg`
- **Portfolio**: `portfolio/w1920/image.webp`

### 3. Error Handling
- Missing ASSETSBUCKET environment
- Empty object lists
- Invalid key structures

### 4. Data Parsing
- Slug extraction from complex paths
- Image format detection (webp, jpg, jpeg, png)
- File name extraction from full paths

## Running the Tests

```bash
# Run just the image file name tests
npm test -- imageFileNames.test.ts

# Run all tests
npm test
```

## Test Coverage

The test suite covers:

- 14 test cases across 4 test suites
- Blog post image extraction and header detection
- Works image management and cover image detection
- Portfolio image filtering by width
- File validation and path parsing utilities
- Error handling for missing resources
- Edge cases (empty lists, invalid paths)

## Integration with Current System

These test functions mirror the actual functionality used in:

- `src/lib/server/blog.ts` - Blog post loading and image detection
- `src/lib/server/works.ts` - Works loading and image management
- `src/routes/api/portfolio-images/+server.ts` - Portfolio image API
- `src/lib/hooks/useImageDimensions.ts` - Image dimensions handling

The tests ensure that image file name extraction works correctly across all these systems in both development and production environments. 