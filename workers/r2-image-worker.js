addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
  });
  
  async function handleRequest(event) {
    const url = new URL(event.request.url);
    const pathname = url.pathname;
    
    console.log('R2 worker handling request for path:', pathname);
  
    // Route requests based on path
    if (pathname.startsWith('/images/portfolio/')) {
      return handleImageRequest(
        event,
        'portfolio/' + pathname.substring('/images/portfolio/'.length)
      );
    } else if (pathname.startsWith('/images/blog/images/')) {
      return handleImageRequest(
        event,
        'blog/images/' + pathname.substring('/images/blog/images/'.length)
      );
    } else if (pathname.startsWith('/directr2/blog/images/')) {
      return handleImageRequest(
        event,
        pathname.substring('/directr2/'.length)
      );
    } else if (pathname.startsWith('/blog/')) {
      return handleBlogpostRequest(
        event,
        'blog/posts/' + pathname.substring('/blog/'.length)
      );
    } else if (pathname === '/api/blog-posts') {
      return handleBlogPostsListRequest(event);
    } else {
      console.log('Path not matched:', pathname);
      return new Response('Not Found', { status: 404 });
    }
  }
  
  async function handleImageRequest(event, imageKey) {
    try {
      console.log('Fetching image with key:', imageKey);
      // Try both ASSETSBUCKET and env.ASSETSBUCKET to ensure compatibility
      const bucket = ASSETSBUCKET || env.ASSETSBUCKET;
      const object = await bucket.get(imageKey);
  
      if (!object) {
        console.log('Image not found:', imageKey);
        return new Response('Image not found', { status: 404 });
      }
  
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
  
      return new Response(object.body, {
        headers,
      });
    } catch (error) {
      console.error(`Error fetching image ${imageKey}:`, error);
      return new Response(`Error fetching image: ${error.message}`, {
        status: 500,
      });
    }
  }
  
  async function handleBlogpostRequest(event, postKey) {
    try {
      console.log('Fetching blog post with key:', postKey);
      // Try both ASSETSBUCKET and env.ASSETSBUCKET to ensure compatibility
      const bucket = ASSETSBUCKET || env.ASSETSBUCKET;
      const object = await bucket.get(postKey);
  
      if (!object) {
        console.log('Blog post not found:', postKey);
        return new Response('Blog post not found', { status: 404 });
      }
  
      const content = await object.text();
      return new Response(content, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (error) {
      console.error(`Error fetching blog post ${postKey}:`, error);
      return new Response(`Error fetching blog post: ${error.message}`, {
        status: 500,
      });
    }
  }
  
  async function handleBlogPostsListRequest(event) {
    try {
      console.log('Listing blog posts');
      
      // Try both variable formats to ensure compatibility with different Cloudflare Workers environments
      const bucket = ASSETSBUCKET || env.ASSETSBUCKET;
      
      // List all objects with 'blog/posts/' prefix
      const objects = await bucket.list({
        prefix: 'blog/posts/'
      });
      
      console.log('Found blog posts:', objects.objects?.length);
      
      if (!objects.objects || objects.objects.length === 0) {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Process each markdown file to extract blog post data
      const posts = await Promise.all(
        objects.objects
          .filter(obj => obj.key.toLowerCase().endsWith('.md'))
          .map(async (obj) => {
            try {
              // Get the slug from the filename (without extension)
              const filename = obj.key.split('/').pop() || '';
              const slug = filename.replace(/\.md$/i, '');
              
              // Get the actual markdown content
              const fileObject = await bucket.get(obj.key);
              if (!fileObject) {
                throw new Error(`File not found: ${obj.key}`);
              }
              
              const content = await fileObject.text();
              
              // Basic content extraction for worker environment
              // Extract title from first heading
              const titleMatch = content.match(/^#\s+(.*)/m);
              const title = titleMatch ? titleMatch[1] : 'Untitled';
              
              // Extract frontmatter if present
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
              const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
              
              // Parse frontmatter for author, published date, and label
              const authorMatch = frontmatter.match(/author:\s*(.*)/);
              const publishedMatch = frontmatter.match(/published:\s*(.*)/);
              const labelMatch = frontmatter.match(/label:\s*(.*)/);
              
              const author = authorMatch ? authorMatch[1].trim() : 'AOK';
              const published = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString().split('T')[0];
              const label = labelMatch ? labelMatch[1].trim() : 'Photography';
              
              // Extract summary (first paragraph after title)
              const contentWithoutFrontmatter = frontmatterMatch 
                ? content.substring(frontmatterMatch[0].length) 
                : content;
              
              const paragraphs = contentWithoutFrontmatter.split('\n\n');
              // Skip the title paragraph if it exists
              const firstParagraphIndex = paragraphs.findIndex(p => !p.startsWith('#') && p.trim() !== '');
              const summary = firstParagraphIndex >= 0 
                ? paragraphs[firstParagraphIndex].replace(/\n/g, ' ').trim() 
                : '';
              
              // Check if a corresponding image exists
              const imageKey = `blog/images/${slug}.jpg`;
              const imageExists = await bucket.head(imageKey) !== null;
              
              return {
                id: slug,
                title,
                summary,
                content: contentWithoutFrontmatter,
                author,
                published,
                label,
                image: imageExists ? `/directr2/${imageKey}` : undefined
              };
            } catch (error) {
              console.error(`Error processing blog post ${obj.key}:`, error);
              return null;
            }
          })
      );
      
      // Filter out any null entries and sort by published date
      const validPosts = posts
        .filter(post => post !== null)
        .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
      
      console.log('Returning valid posts count:', validPosts.length);
      
      return new Response(JSON.stringify(validPosts), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } catch (error) {
      console.error('Error listing blog posts:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  