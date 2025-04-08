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
    const r2Bucket = env.R2_BLOG_BUCKET || env.R2_BUCKET || env.ASSETSBUCKET;
    
    if (!r2Bucket) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'R2 bucket environment variable not configured'
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
    
    // First list top-level directories to determine structure
    const topLevelList = await r2Bucket.list({
      delimiter: '/',
    });
    
    // Extract paths from the list for directory detection
    const topLevelPaths = topLevelList.delimitedPrefixes || [];
    console.log('Available top-level directories:', topLevelPaths);
    
    // Check bucket access
    const bucketExists = await r2Bucket.head('test-access');
    
    // Determine prefixes based on bucket structure
    let postPrefix = 'blog/posts/';
    let imagePrefix = 'blog/images/';
    
    // If 'blog/' isn't found but 'posts/' is, adjust prefix
    if (!topLevelPaths.includes('blog/') && 
        topLevelPaths.includes('posts/')) {
      postPrefix = 'posts/';
      imagePrefix = 'images/';
      console.log('Using alternate structure with posts/ and images/ prefixes');
    }
    
    // List blog posts with detected prefix
    let blogPostsListing = await r2Bucket.list({
      prefix: postPrefix,
      delimiter: '/',
    });
    
    // If no posts found, try alternate prefix
    if (!blogPostsListing.objects || blogPostsListing.objects.length === 0) {
      const altPostPrefix = postPrefix === 'blog/posts/' ? 'posts/' : 'blog/posts/';
      console.log(`No blog posts found with ${postPrefix}, trying ${altPostPrefix}`);
      
      blogPostsListing = await r2Bucket.list({
        prefix: altPostPrefix,
        delimiter: '/',
      });
      
      if (blogPostsListing.objects && blogPostsListing.objects.length > 0) {
        postPrefix = altPostPrefix;
        imagePrefix = altPostPrefix === 'blog/posts/' ? 'blog/images/' : 'images/';
      }
    }
    
    // List blog images with detected prefix
    let blogImagesListing = await r2Bucket.list({
      prefix: imagePrefix,
      delimiter: '/',
    });
    
    // If no images found, try alternate prefix
    if (!blogImagesListing.objects || blogImagesListing.objects.length === 0) {
      const altImagePrefix = imagePrefix === 'blog/images/' ? 'images/' : 'blog/images/';
      console.log(`No blog images found with ${imagePrefix}, trying ${altImagePrefix}`);
      
      blogImagesListing = await r2Bucket.list({
        prefix: altImagePrefix,
        delimiter: '/',
      });
      
      if (blogImagesListing.objects && blogImagesListing.objects.length > 0) {
        imagePrefix = altImagePrefix;
      }
    }
    
    // Also check for images at the root level if none were found
    if (!blogImagesListing.objects || blogImagesListing.objects.length === 0) {
      console.log('No images found in standard locations, checking root level');
      blogImagesListing = await r2Bucket.list({
        delimiter: '/',
        include: ['*.jpg', '*.jpeg', '*.png', '*.gif']
      });
    }
    
    // Match posts to images for diagnostic purposes
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
    
    // Create response with diagnostic info
    const responseData = {
      status: 'ok',
      bucketAccess: !!bucketExists ? 'accessible' : 'inaccessible',
      structure: {
        topLevelDirectories: topLevelPaths,
        postPrefix: postPrefix,
        imagePrefix: imagePrefix
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
      }
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
  // Handle portfolio images
  const keyPath = pathname.replace('/images/portfolio/', '');
  const object = await env.R2_BUCKET.get(`portfolio/${keyPath}`);

  if (!object) {
    return new Response('Portfolio image not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000');
  
  return new Response(object.body, {
    headers,
  });
}

async function handleBlogImage(request, env, pathname) {
  // Handle blog images (supports both URL formats)
  let keyPath;
  if (pathname.startsWith('/images/blog/images/')) {
    keyPath = pathname.replace('/images/blog/images/', '');
  } else {
    keyPath = pathname.replace('/directr2/blog/images/', '');
  }
  
  // Try alternative paths if the standard one fails
  let object = await env.R2_BUCKET.get(`blog/images/${keyPath}`);
  
  // If not found with standard path, try non-prefixed path
  if (!object) {
    console.log(`Blog image not found at blog/images/${keyPath}, trying different paths`);
    
    // Try without 'blog/' prefix
    object = await env.R2_BUCKET.get(`images/${keyPath}`);
  }
  
  // If still not found, try listing objects to see available paths
  if (!object) {
    console.log(`Image still not found, listing objects with similar paths for diagnosis`);
    // List objects from bucket to see what's available
    const listed = await env.R2_BUCKET.list({
      prefix: 'blog/',
      delimiter: '/',
      limit: 10
    });
    
    // Also try without 'blog/' prefix
    const listedAlt = await env.R2_BUCKET.list({
      prefix: 'images/',
      delimiter: '/',
      limit: 10
    });
    
    console.log('Available paths with blog/ prefix:', listed.objects.map(o => o.key));
    console.log('Available paths with images/ prefix:', listedAlt.objects.map(o => o.key));
    
    return new Response(JSON.stringify({
      error: 'Blog image not found',
      requestedPath: keyPath,
      availablePaths: {
        withBlogPrefix: listed.objects.map(o => o.key),
        withImagesPrefix: listedAlt.objects.map(o => o.key)
      }
    }), { 
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  
  return new Response(object.body, {
    headers,
  });
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
    console.log('Blog posts endpoint called, using the confirmed working direct access pattern');
    
    // Log all environment variables to see what's available
    console.log('Environment keys available:', Object.keys(env));
    
    // Use the same bucket access order that works for images
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
    
    // First, list all objects in the bucket to see what's available (limited to 100)
    const allObjects = await r2Bucket.list({
      limit: 100,
    });
    
    console.log('All objects in bucket:', allObjects.objects.map(o => o.key));
    
    // Now specifically look for markdown files in blog/posts/ which we know exists
    const blogPostsList = await r2Bucket.list({
      prefix: 'blog/posts/',
    });
    
    console.log('Blog posts found:', blogPostsList.objects.map(o => o.key));
    
    // Filter to just markdown files
    const markdownFiles = blogPostsList.objects.filter(o => o.key.endsWith('.md'));
    
    if (markdownFiles.length === 0) {
      console.log('No markdown files found in blog/posts/');
      return new Response(JSON.stringify({
        error: 'No blog posts found',
        availableFiles: blogPostsList.objects.map(o => o.key),
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    console.log(`Found ${markdownFiles.length} markdown files to process`);
    
    // Process each markdown file to extract blog post data
    const blogPosts = await Promise.all(
      markdownFiles.map(async (object) => {
        try {
          console.log(`Processing ${object.key}`);
          
          // Get the file content using direct access, since we know this works
          const content = await fetchMarkdownContent(r2Bucket, object.key);
          if (!content) {
            console.log(`Could not read content for ${object.key}`);
            return null;
          }
          
          // Extract slug from the filename
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
          
          // Extract frontmatter data
          const matter = parseFrontMatter(content);
          
          // Check for a matching image using the pattern that works for images
          // First try with blog/images prefix (most likely)
          const imageKey = `blog/images/${slug}.jpg`;
          let imageExists = await r2Bucket.head(imageKey);
          let imagePath = null;
          
          if (imageExists) {
            // Use the working /directr2/ format that we know works for images
            imagePath = `/directr2/${imageKey}`;
            console.log(`Found matching image at ${imageKey}`);
          } else {
            // Try alternate locations
            const alternateKeys = [
              `images/${slug}.jpg`,
              `${slug}.jpg` // root level
            ];
            
            for (const altKey of alternateKeys) {
              imageExists = await r2Bucket.head(altKey);
              if (imageExists) {
                imagePath = `/directr2/${altKey}`;
                console.log(`Found image at alternate location: ${altKey}`);
                break;
              }
            }
          }
          
          return {
            id: slug,
            title: title || slug,
            summary: summary.trim() || 'No summary available',
            content: content,
            author: matter.author || 'AOK',
            published: matter.published || new Date().toISOString().split('T')[0],
            label: matter.label || 'Photography',
            image: imagePath
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
    
    console.log(`Successfully processed ${validPosts.length} valid blog posts`);
    
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

// Helper function to fetch markdown content using multiple methods
async function fetchMarkdownContent(bucket, key) {
  try {
    // First try direct bucket access
    const obj = await bucket.get(key);
    if (obj) {
      return await obj.text();
    }
    
    // If that fails, try raw fetch (this might not work in the worker context)
    try {
      const directPath = `/directr2/${key}`;
      console.log(`Trying direct fetch from ${directPath}`);
      const response = await fetch(directPath);
      if (response.ok) {
        return await response.text();
      }
    } catch (fetchError) {
      console.log('Direct fetch failed:', fetchError);
    }
    
    console.error(`Failed to fetch content for ${key} using multiple methods`);
    return null;
  } catch (error) {
    console.error(`Error fetching markdown content for ${key}:`, error);
    return null;
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
  