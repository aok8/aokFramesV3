addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
  });
  
  async function handleRequest(event) {
    const url = new URL(event.request.url);
    const pathname = url.pathname;
  
    // Route requests based on path
    if (pathname.startsWith('/images/portfolio/')) {
      return handleImageRequest(
        event,
        'images/portfolio/' + pathname.substring('/images/portfolio/'.length)
      );
    } else if (pathname.startsWith('/images/blog/images/')) {
      return handleImageRequest(
        event,
        'blog/images/' + pathname.substring('/images/blog/images/'.length)
      );
    } else if (pathname.startsWith('/blog/')) {
      return handleBlogpostRequest(
        event,
        'blog/posts/' + pathname.substring('/blog/'.length)
      );
    } else {
      return new Response('Not Found', { status: 404 });
    }
  }
  
  async function handleImageRequest(event, imageKey) {
    try {
      const object = await ASSETS.get(imageKey);
  
      if (!object) {
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
      return new Response(`Error fetching image: ${error.message}`, {
        status: 500,
      });
    }
  }
  
  async function handleBlogpostRequest(event, postKey) {
    try {
      const object = await ASSETS.get(postKey);
  
      if (!object) {
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
      return new Response(`Error fetching blog post: ${error.message}`, {
        status: 500,
      });
    }
  }
  