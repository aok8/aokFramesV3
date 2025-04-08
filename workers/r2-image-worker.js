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
    const r2Bucket = env.R2_BLOG_BUCKET || env.R2_BUCKET;
    
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
    
    // Check bucket access
    const bucketExists = await r2Bucket.head('test-access');
    
    // List blog posts with 'blog/posts/' prefix
    const blogPostsListing = await r2Bucket.list({
      prefix: 'blog/posts/',
      delimiter: '/',
    });
    
    // List blog images with 'blog/images/' prefix
    const blogImagesListing = await r2Bucket.list({
      prefix: 'blog/images/',
      delimiter: '/',
    });
    
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
  
  const object = await env.R2_BUCKET.get(`blog/images/${keyPath}`);

  if (!object) {
    return new Response('Blog image not found', { status: 404 });
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
    const r2Bucket = env.R2_BLOG_BUCKET || env.R2_BUCKET;
    
    // List objects with prefix 'blog/posts/'
    const listed = await r2Bucket.list({
      prefix: 'blog/posts/',
      delimiter: '/',
    });

    if (!listed || !listed.objects || listed.objects.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const blogPosts = await Promise.all(
      listed.objects.map(async (object) => {
        try {
          if (!object.key || !object.key.endsWith('.md')) {
            console.log('Skipping non-markdown file:', object.key);
            return null;
          }

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
          
          // Check if a matching image exists
          const imageKey = `blog/images/${slug}.jpg`;
          const imageExists = await r2Bucket.head(imageKey);
          
          return {
            id: slug,
            title: title,
            summary: summary.trim(),
            content: content,
            author: matter.author || 'AOK',
            published: matter.published || new Date().toISOString().split('T')[0],
            label: matter.label || 'Photography',
            image: imageExists ? `/directr2/blog/images/${slug}.jpg` : undefined
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
  