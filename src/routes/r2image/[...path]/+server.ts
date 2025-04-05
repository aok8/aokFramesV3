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
    
    // Use direct R2 URL approach instead of trying to use the SDK
    const bucketName = 'aokframes-website-assets'; // Must match your R2 bucket name
    const r2Url = `https://${bucketName}.r2.dev/${path}`;
    
    // Create a new request for the R2 public endpoint
    const r2Request = new Request(r2Url);
    
    // Make the request to R2 public endpoint
    const r2Response = await fetch(r2Request);
    
    if (!r2Response.ok) {
      console.error(`R2 object not found: ${path}`);
      return new Response(`Image not found: ${path}`, { status: 404 });
    }
    
    console.log(`Found R2 image: ${path}`);
    
    // Create a new response with caching headers
    const response = new Response(r2Response.body, {
      headers: new Headers(r2Response.headers)
    });
    
    // Set caching
    response.headers.set('Cache-Control', 'public, max-age=31536000');
    
    // Add content type based on file extension if not set
    if (!response.headers.has('content-type')) {
      const fileExtension = path.split('.').pop()?.toLowerCase() || '';
      const contentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml'
      };
      
      // Use a type-safe approach
      if (fileExtension && Object.keys(contentTypes).includes(fileExtension)) {
        response.headers.set('content-type', contentTypes[fileExtension as keyof typeof contentTypes]);
      }
    }
    
    // Return the image
    return response;
  } catch (error) {
    console.error('Error serving R2 image:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}; 