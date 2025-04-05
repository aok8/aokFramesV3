// @ts-ignore - suppress type errors for this diagnostic endpoint
import { json } from '@sveltejs/kit';

// @ts-ignore - suppress type errors for this diagnostic endpoint
export const GET = async (event) => {
  const { platform, url } = event;
  // Simple R2 test endpoint with detailed diagnostics
  try {
    // Test key to look for - default to the background image
    const testKey = url.searchParams.get('key') || 'constants/bg.jpg';
    
    // Basic diagnostics about the environment
    const diagnostics = {
      platform_available: !!platform,
      platform_env_available: !!platform?.env,
      r2_binding_exists: !!platform?.env?.ASSETS,
      test_key: testKey,
      r2_object: null,
      error: null,
      headers: {},
      stack: null
    };
    
    // Attempt to access the R2 bucket if it exists
    if (platform?.env?.ASSETS) {
      try {
        // Try to get the test object
        const object = await platform.env.ASSETS.get(testKey);
        
        if (object) {
          // Object found, collect info
          diagnostics.r2_object = {
            key: object.key,
            size: object.size,
            etag: object.etag,
            uploaded: object.uploaded?.toISOString()
          };
          
          // Get headers
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          diagnostics.headers = Object.fromEntries([...headers.entries()]);
        } else {
          // Object not found
          diagnostics.error = `Object not found: ${testKey}`;
        }
      } catch (err) {
        // Error accessing R2
        diagnostics.error = err instanceof Error ? err.message : String(err);
        diagnostics.stack = err instanceof Error ? err.stack || null : null;
      }
    } else {
      // R2 binding not available
      diagnostics.error = 'R2 binding not available';
    }
    
    return json(diagnostics);
  } catch (error) {
    // Unexpected error
    return json({
      error: 'Unexpected error', 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}; 