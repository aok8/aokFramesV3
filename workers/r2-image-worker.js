export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    console.log('Request path:', pathname);

    return handleRequest(request, env, pathname);
  }
};

async function handleRequest(request, env, pathname) {
  try {
    if (pathname.startsWith('/api/blog-posts') || pathname === '/blog-posts' || pathname === '/blog-posts/') {
      return await handleBlogPostsRequest(request, env);
    } else if (pathname === '/api/blog-status') {
      return await handleBlogStatusRequest(request, env);
    } else if (pathname.startsWith('/images/portfolio/')) {
      return await handlePortfolioImage(request, env, pathname);
    } else if (pathname.startsWith('/images/blog/images/') || pathname.startsWith('/directr2/blog/images/')) {
      return await handleBlogImage(request, env, pathname);
    } else {
      return new Response('Not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error in handleRequest:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

async function handleBlogStatusRequest(request, env) {
  try {
    console.log('Blog status endpoint called, checking environment');
    console.log('Environment keys available:', Object.keys(env));
    
    const r2Bucket = env.ASSETSBUCKET || env.R2_BUCKET || env.R2_BLOG_BUCKET;
    
    if (!r2Bucket) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'R2 bucket environment variable not configured',
        availableKeys: Object.keys(env)
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // First get ALL objects to see what's actually in the bucket
    const allObjects = await r2Bucket.list({
      limit: 100, // Increased limit to see more objects
    });
    
    console.log('ALL objects in bucket:', allObjects.objects.map(o => o.key));
    
    // Directory listing with delimiter to see the structure
    const topLevelList = await r2Bucket.list({
      delimiter: '/',
    });
    
    // Extract paths from the list for directory detection
    const topLevelPaths = topLevelList.delimitedPrefixes || [];
    console.log('Available top-level directories:', topLevelPaths);
    
    // Check bucket access
    const bucketExists = await r2Bucket.head('test-access');
    
    // Try manually checking for the patterns used in portfolio images that are working
    console.log('Checking for portfolio content (to compare with working pattern)');
    const portfolioList = await r2Bucket.list({
      prefix: 'portfolio/',
    });
    console.log('Portfolio objects:', portfolioList.objects.map(o => o.key));
    
    // Try ALL the possible places where blog posts might be
    const possiblePostPrefixes = [
      'blog/posts/', 
      'posts/', 
      'blog/', 
      ''  // Root level
    ];
    
    // Try ALL the possible places where blog images might be
    const possibleImagePrefixes = [
      'blog/images/',
      'images/',
      '', // Root level
    ];
    
    // Store the results for each prefix
    const prefixResults = {};
    
    // Check post prefixes
    for (const prefix of possiblePostPrefixes) {
      const listed = await r2Bucket.list({
        prefix: prefix,
      });
      
      // Filter to just markdown files
      const markdownFiles = listed.objects.filter(o => o.key.endsWith('.md'));
      
      prefixResults[prefix] = {
        totalObjects: listed.objects.length,
        markdownFiles: markdownFiles.length,
        sampleKeys: listed.objects.slice(0, 5).map(o => o.key)
      };
    }
    
    // Check image prefixes
    for (const prefix of possibleImagePrefixes) {
      const listed = await r2Bucket.list({
        prefix: prefix,
      });
      
      // Filter to image files
      const imageFiles = listed.objects.filter(o => 
        o.key.endsWith('.jpg') || 
        o.key.endsWith('.png') || 
        o.key.endsWith('.jpeg'));
      
      prefixResults[prefix] = {
        ...prefixResults[prefix] || {},
        totalObjects: listed.objects.length,
        imageFiles: imageFiles.length,
        sampleKeys: listed.objects.slice(0, 5).map(o => o.key)
      };
    }
    
    // Determine which prefixes actually contain content
    const postPrefix = possiblePostPrefixes.find(prefix => 
      prefixResults[prefix]?.markdownFiles > 0) || null;
    
    const imagePrefix = possibleImagePrefixes.find(prefix => 
      prefixResults[prefix]?.imageFiles > 0) || null;
    
    console.log(`Most likely post prefix: ${postPrefix}, image prefix: ${imagePrefix}`);
    
    // Get post and image listings from the most likely locations
    let blogPostsListing = { objects: [] };
    let blogImagesListing = { objects: [] };
    
    if (postPrefix !== null) {
      blogPostsListing = await r2Bucket.list({
        prefix: postPrefix,
      });
      
      // Filter to just markdown files
      blogPostsListing.objects = blogPostsListing.objects.filter(o => o.key.endsWith('.md'));
    }
    
    if (imagePrefix !== null) {
      blogImagesListing = await r2Bucket.list({
        prefix: imagePrefix,
      });
      
      // Filter to just image files
      blogImagesListing.objects = blogImagesListing.objects.filter(o => 
        o.key.endsWith('.jpg') || 
        o.key.endsWith('.png') || 
        o.key.endsWith('.jpeg'));
    }
    
    // Match posts to images
    const postsWithImages = [];
    const posts = blogPostsListing.objects.map(obj => {
      const key = obj.key;
      const filename = key.split('/').pop();
      const slug = filename.replace(/\.md$/i, '');
      return slug;
    });
    
    const images = blogImagesListing.objects.map(obj => {
      const key = obj.key;
      const filename = key.split('/').pop();
      const slug = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '');
      return slug;
    });
    
    // Find matches between posts and images
    for (const postSlug of posts) {
      if (images.includes(postSlug)) {
        postsWithImages.push(postSlug);
      }
    }
    
    // Create comprehensive diagnostic info
    const responseData = {
      status: 'ok',
      bucketAccess: !!bucketExists ? 'accessible' : 'inaccessible',
      environment: {
        availableKeys: Object.keys(env),
      },
      structure: {
        topLevelDirectories: topLevelPaths,
        allObjectsCount: allObjects.objects.length,
        sampleObjects: allObjects.objects.slice(0, 10).map(o => o.key),
        prefixAnalysis: prefixResults,
        detectedPostPrefix: postPrefix,
        detectedImagePrefix: imagePrefix
      },
      blogPosts: {
        count: blogPostsListing.objects.length,
        items: blogPostsListing.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
        })),
      },
      blogImages: {
        count: blogImagesListing.objects.length,
        items: blogImagesListing.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
        })),
      },
      matching: {
        postsWithImages,
        count: postsWithImages.length
      },
      imageAccessUrl: imagePrefix !== null && blogImagesListing.objects.length > 0 ? 
        `/directr2/${blogImagesListing.objects[0].key}` : 
        'No images found'
    };
    
    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error in blog status endpoint:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

async function handlePortfolioImage(request, env, pathname) {
  try {
    // Handle portfolio images
    const keyPath = pathname.replace('/images/portfolio/', '');
    console.log(`Fetching portfolio image: ${keyPath}`);
    
    // Use consistent bucket access order
    const r2Bucket = env.ASSETSBUCKET || env.R2_BUCKET || env.R2_BLOG_BUCKET;
    
    if (!r2Bucket) {
      console.error('No R2 bucket binding found for portfolio image:', keyPath);
      return new Response('R2 bucket not found', { status: 500 });
    }
    
    // First try with portfolio/ prefix - this is how images are referenced in MainContent.svelte
    let object = await r2Bucket.get(`portfolio/${keyPath}`);
    
    // If not found, try without the portfolio/ prefix
    if (!object) {
      console.log(`Image not found at portfolio/${keyPath}, trying direct path`);
      object = await r2Bucket.get(keyPath);
    }

    if (!object) {
      console.log(`Portfolio image not found: ${keyPath}`);
      return new Response('Portfolio image not found', { status: 404 });
    }

    console.log(`Successfully fetched portfolio image: ${keyPath}`);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error(`Error fetching portfolio image ${pathname}:`, error);
    return new Response(`Error fetching image: ${error.message}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

async function handleBlogImage(request, env, pathname) {
  try {
    // Handle blog images (supports both URL formats)
    let keyPath;
    if (pathname.startsWith('/images/blog/images/')) {
      keyPath = pathname.replace('/images/blog/images/', '');
    } else {
      keyPath = pathname.replace('/directr2/blog/images/', '');
    }
    
    console.log(`Fetching blog image: ${keyPath}`);
    
    // Use consistent bucket access order - exactly matching the portfolio handler
    const r2Bucket = env.ASSETSBUCKET || env.R2_BUCKET || env.R2_BLOG_BUCKET;
    
    if (!r2Bucket) {
      console.error('No R2 bucket binding found for blog image:', keyPath);
      return new Response('R2 bucket not found', { status: 500 });
    }
    
    // Try multiple paths for the image
    let object = null;
    
    // Try the paths in order (from most likely to least likely)
    const possiblePaths = [
      `blog/images/${keyPath}`,
      `images/${keyPath}`,
      keyPath, // Root level
    ];
    
    for (const path of possiblePaths) {
      console.log(`Trying to fetch image from path: ${path}`);
      object = await r2Bucket.get(path);
      if (object) {
        console.log(`Successfully found image at: ${path}`);
        break;
      }
    }
    
    // If still not found, try listing objects to see available paths
    if (!object) {
      console.log(`Image not found for key: ${keyPath}, listing similar objects for diagnosis`);
      
      // List all images with a similar name pattern
      const listed = await r2Bucket.list({
        prefix: '', // Search the whole bucket
        limit: 50
      });
      
      // Filter to find anything that might match this image
      const possibleMatches = listed.objects
        .filter(o => 
          o.key.endsWith('.jpg') || 
          o.key.endsWith('.png') || 
          o.key.endsWith('.jpeg'))
        .filter(o => {
          const filename = o.key.split('/').pop();
          return filename.includes(keyPath.split('/').pop().replace(/\.(jpg|jpeg|png)$/, ''));
        });
        
      console.log('Possible matching images:', possibleMatches.map(o => o.key));
      
      if (possibleMatches.length > 0) {
        // Try the first match
        object = await r2Bucket.get(possibleMatches[0].key);
        console.log(`Trying best match: ${possibleMatches[0].key}`);
      }
    }
    
    if (!object) {
      console.log(`Blog image still not found: ${keyPath}`);
      // List objects from bucket to see what's available
      const blogImages = await r2Bucket.list({
        prefix: 'blog/images/',
        delimiter: '/',
        limit: 10
      });
      
      // Also try without 'blog/' prefix
      const imagesOnly = await r2Bucket.list({
        prefix: 'images/',
        delimiter: '/',
        limit: 10
      });
      
      return new Response(JSON.stringify({
        error: 'Blog image not found',
        requestedPath: keyPath,
        requestedUrl: pathname,
        triedPaths: possiblePaths,
        availablePaths: {
          withBlogPrefix: blogImages.objects.map(o => o.key),
          withImagesPrefix: imagesOnly.objects.map(o => o.key)
        }
      }), { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`Successfully fetched blog image: ${keyPath}`);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error(`Error fetching blog image ${pathname}:`, error);
    return new Response(JSON.stringify({
      error: 'Error fetching blog image',
      message: error.message,
      stack: error.stack,
      pathname: pathname
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

async function handleBlogPostsRequest(request, env) {
  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    // Log all environment variables to see what's available
    console.log('Environment keys available:', Object.keys(env));
    
    const r2Bucket = env.ASSETSBUCKET || env.R2_BUCKET || env.R2_BLOG_BUCKET;
    
    if (!r2Bucket) {
      console.error('No R2 bucket binding found in env:', Object.keys(env));
      return new Response(JSON.stringify({
        error: 'R2 bucket binding not found',
        availableKeys: Object.keys(env)
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    console.log('Blog posts endpoint: Showing all R2 bucket contents for diagnosis');
    
    // First get ALL objects to see what's actually in the bucket
    const allObjects = await r2Bucket.list({
      limit: 100, // Increased limit to see more objects
    });
    
    console.log('ALL objects in bucket:', allObjects.objects.map(o => o.key));
    
    // Directory listing with delimiter to see the structure
    const topLevelList = await r2Bucket.list({
      delimiter: '/',
    });
    
    // Extract paths from the list for directory detection
    const topLevelPaths = topLevelList.delimitedPrefixes || [];
    console.log('Available top-level directories:', topLevelPaths);
    
    // Try manually checking for the patterns used in portfolio images that are working
    console.log('Checking for portfolio content (to compare with working pattern)');
    const portfolioList = await r2Bucket.list({
      prefix: 'portfolio/',
    });
    console.log('Portfolio objects:', portfolioList.objects.map(o => o.key));
    
    // Try different possible prefixes based on detected structure
    let prefix = 'blog/posts/';
    let imagePrefix = 'blog/images/';
    
    // If 'blog/' isn't found, try with just 'posts/' directly (no prefix)
    if (!topLevelPaths.includes('blog/')) {
      if (topLevelPaths.includes('posts/')) {
        prefix = 'posts/';
        imagePrefix = 'images/';
      } else {
        // Last resort - try with no prefixes at all, directly at root level
        prefix = '';
        imagePrefix = '';
      }
      console.log(`Changed path structure: posts=${prefix}, images=${imagePrefix}`);
    }
    
    // Try ALL the possible places where blog posts might be
    const possiblePrefixes = [
      'blog/posts/', 
      'posts/', 
      'blog/', 
      ''  // Root level
    ];
    
    let listed = { objects: [] };
    let usedPrefix = null;
    
    // Try each prefix until we find objects
    for (const testPrefix of possiblePrefixes) {
      console.log(`Looking for blog posts with prefix: "${testPrefix}"`);
      const testListed = await r2Bucket.list({
        prefix: testPrefix,
      });
      
      if (testListed.objects && testListed.objects.length > 0) {
        console.log(`Found ${testListed.objects.length} objects with prefix "${testPrefix}"`);
        console.log('First few keys:', testListed.objects.slice(0, 5).map(o => o.key));
        
        // Filter to just markdown files to identify blog posts
        const markdownFiles = testListed.objects.filter(o => o.key.endsWith('.md'));
        if (markdownFiles.length > 0) {
          console.log(`Found ${markdownFiles.length} markdown files with prefix "${testPrefix}"`);
          listed = { 
            objects: markdownFiles 
          };
          usedPrefix = testPrefix;
          break;
        } else {
          console.log(`No markdown files found with prefix "${testPrefix}"`);
        }
      } else {
        console.log(`No objects found with prefix "${testPrefix}"`);
      }
    }
    
    if (!listed.objects || listed.objects.length === 0) {
      console.log('No blog posts (markdown files) found in any location');
      return new Response(JSON.stringify({
        error: 'No blog posts found',
        checkedPrefixes: possiblePrefixes,
        availableTopLevel: topLevelPaths,
        allObjectsCount: allObjects.objects.length,
        sampleObjects: allObjects.objects.slice(0, 10).map(o => o.key)
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    console.log(`Found ${listed.objects.length} blog posts with prefix: ${usedPrefix}`);

    // Determine image prefix based on what we found
    if (usedPrefix === 'blog/posts/') {
      imagePrefix = 'blog/images/';
    } else if (usedPrefix === 'posts/') {
      imagePrefix = 'images/';
    } else if (usedPrefix === '') {
      imagePrefix = '';
    }
    
    // Also check where images actually are
    const possibleImagePrefixes = [
      'blog/images/',
      'images/',
      '',
    ];
    
    let foundImagePrefix = null;
    
    // Find where images are stored
    for (const imgPrefix of possibleImagePrefixes) {
      const imgTest = await r2Bucket.list({
        prefix: imgPrefix,
        delimiter: '/',
      });
      
      const imgFiles = imgTest.objects.filter(o => 
        o.key.endsWith('.jpg') || 
        o.key.endsWith('.png') || 
        o.key.endsWith('.jpeg'));
        
      if (imgFiles.length > 0) {
        console.log(`Found ${imgFiles.length} images with prefix "${imgPrefix}"`);
        foundImagePrefix = imgPrefix;
        break;
      }
    }
    
    if (foundImagePrefix) {
      console.log(`Using image prefix: ${foundImagePrefix}`);
      imagePrefix = foundImagePrefix;
    }

    const blogPosts = await Promise.all(
      listed.objects.map(async (object) => {
        try {
          if (!object.key || !object.key.endsWith('.md')) {
            console.log('Skipping non-markdown file:', object.key);
            return null;
          }

          console.log(`Processing blog post: ${object.key}`);
          // Get the markdown content
          const obj = await r2Bucket.get(object.key);
          if (!obj) {
            console.log('Could not read file:', object.key);
            return null;
          }

          const content = await obj.text();
          
          // Parse the markdown file
          const matter = parseFrontMatter(content);
          const filename = object.key.split('/').pop();
          const slug = filename.replace(/\.md$/, '');
          
          console.log(`Extracted slug: ${slug}`);
          
          // Extract title from first h1 or use slug
          const titleMatch = content.match(/^#\s+(.*)/m);
          const title = titleMatch ? titleMatch[1] : slug;
          
          // Extract first paragraph as summary 
          let summary = '';
          const lines = content.split('\n');
          let foundContent = false;
          
          for (const line of lines) {
            // Skip until we find non-empty content after the title
            if (!foundContent) {
              if (line.startsWith('#') || line.trim() === '') {
                continue;
              }
              foundContent = true;
            }
            
            // Get first non-empty paragraph
            if (line.trim() !== '' && !line.startsWith('#')) {
              summary += line.trim() + ' ';
            } else if (summary.length > 0 && line.trim() === '') {
              break;
            }
          }
          
          // Try multiple image patterns - using the exact pattern that works for direct image access
          // This is key - ensure we use the same pattern that works for direct image access
          
          // First possibility - direct match with imagePrefix
          const imageKey = `${imagePrefix}${slug}.jpg`;
          console.log(`Checking for image at: ${imageKey}`);
          let imageExists = await r2Bucket.head(imageKey);
          
          let finalImagePath = null;
          if (imageExists) {
            // Use exact same format as working portfolio images
            finalImagePath = `/directr2/${imageKey}`;
            console.log(`Found image at: ${imageKey}, path: ${finalImagePath}`);
          } else {
            // Try with blog/ prefix if not already using it
            const altImageKey = !imagePrefix.startsWith('blog/') ? `blog/images/${slug}.jpg` : `images/${slug}.jpg`;
            console.log(`Trying alternate image path: ${altImageKey}`);
            imageExists = await r2Bucket.head(altImageKey);
            
            if (imageExists) {
              finalImagePath = `/directr2/${altImageKey}`;
              console.log(`Found image at alternate path: ${altImageKey}, path: ${finalImagePath}`);
            } else {
              console.log(`No matching image found for: ${slug}`);
              // Try third option - root level
              const rootImageKey = `${slug}.jpg`;
              imageExists = await r2Bucket.head(rootImageKey);
              if (imageExists) {
                finalImagePath = `/directr2/${rootImageKey}`;
                console.log(`Found image at root level: ${rootImageKey}, path: ${finalImagePath}`);
              }
            }
          }
          
          return {
            id: slug,
            title: title,
            summary: summary.trim(),
            content: content,
            author: matter.author || 'AOK',
            published: matter.published || new Date().toISOString().split('T')[0],
            label: matter.label || 'Photography',
            image: finalImagePath
          };
        } catch (error) {
          console.error(`Error processing blog post ${object.key}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by date (newest first)
    const validPosts = blogPosts
      .filter(post => post !== null)
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    
    console.log(`Returning ${validPosts.length} valid posts`);
    
    return new Response(JSON.stringify(validPosts), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error in blog posts endpoint:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to retrieve blog posts',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

// Helper function to parse front matter
function parseFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontMatterRegex);
  
  if (!match) return {};
  
  const frontMatter = match[1];
  const data = {};
  
  // Split by lines and process each key-value pair
  frontMatter.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      // Remove quotes if present
      data[key] = value.replace(/^['"](.*)['"]$/, '$1');
    }
  });
  
  return data;
}
  