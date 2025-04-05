// @ts-ignore - suppress type errors for this diagnostic endpoint
export const GET = async (event) => {
  const { platform, params } = event;
  const path = params.path || '';
  
  try {
    console.log(`Attempting to serve R2 image: ${path}`);
    
    // Check if platform and R2 are available
    if (!platform?.env?.ASSETS) {
      console.error('R2 bucket binding not available');
      return new Response('R2 Configuration Error', { status: 500 });
    }
    
    // Get the object from R2
    const object = await platform.env.ASSETS.get(path);
    
    if (!object) {
      console.error(`R2 object not found: ${path}`);
      return new Response(`Image not found: ${path}`, { status: 404 });
    }
    
    console.log(`Found R2 image: ${path}, size: ${object.size}`);
    
    // Set appropriate headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    // Add content type based on file extension if not set
    if (!headers.has('content-type')) {
      const fileExtension = path.split('.').pop()?.toLowerCase();
      const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
      };
      
      if (fileExtension && contentTypes[fileExtension]) {
        headers.set('content-type', contentTypes[fileExtension]);
      }
    }
    
    // Return the image
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error serving R2 image:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}; 