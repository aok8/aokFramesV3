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
      r2_object: null as any, // Using any here to avoid TS errors
      error: null as any,
      headers: {} as any,
      stack: null as any,
      direct_r2_test: {
        success: false,
        error: null as any,
        status: null as any,
        headers: null as any
      },
      methods_available: {} as Record<string, boolean>,
      r2_fetch_test: {
        attempted: false,
        success: false,
        error: null as any,
        headers: null as any
      }
    };
    
    // Check which methods are available on ASSETS binding
    if (platform?.env?.ASSETS) {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(platform.env.ASSETS));
      diagnostics.methods_available = methods.reduce((acc: Record<string, boolean>, method) => {
        acc[method] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
    
    // Attempt to access the R2 bucket if it exists
    if (platform?.env?.ASSETS) {
      try {
        // Try to get the test object using the R2 API
        // This may fail with the RPC error but we try it anyway
        try {
          const object = await platform.env.ASSETS.get(testKey);
          
          if (object) {
            diagnostics.r2_object = {
              key: object.key,
              size: object.size,
              etag: object.etag,
              uploaded: object.uploaded?.toISOString()
            };
            
            // Get headers
            const headers = new Headers();
            try {
              object.writeHttpMetadata(headers);
              diagnostics.headers = Object.fromEntries([...headers.entries()]);
            } catch (headerErr) {
              diagnostics.headers = { error: headerErr instanceof Error ? headerErr.message : String(headerErr) };
            }
          } else {
            diagnostics.error = `Object not found: ${testKey}`;
          }
        } catch (apiErr) {
          diagnostics.error = apiErr instanceof Error ? apiErr.message : String(apiErr);
          diagnostics.stack = apiErr instanceof Error ? apiErr.stack || null : null;
        }
        
        // Test the R2 fetch method which might be available in some environments
        try {
          diagnostics.r2_fetch_test.attempted = true;
          // @ts-ignore - The fetch method is available in some Cloudflare deployments
          const fetchResponse = await platform.env.ASSETS.fetch(new Request(`https://fake-host/${testKey}`));
          diagnostics.r2_fetch_test.success = fetchResponse.ok;
          diagnostics.r2_fetch_test.headers = Object.fromEntries([...fetchResponse.headers.entries()]);
        } catch (fetchErr) {
          diagnostics.r2_fetch_test.error = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        }
        
        // Also try the direct R2 URL approach as a backup
        try {
          // This approach won't work without proper public access configuration
          // But testing it provides useful diagnostics
          const bucketName = 'aokframes-website-assets'; // Must match your R2 bucket name
          const r2Url = `https://${bucketName}.r2.dev/${testKey}`;
          
          // Create a new request for the R2 public endpoint
          const r2Request = new Request(r2Url);
          
          // Make the request to R2 public endpoint
          const r2Response = await fetch(r2Request);
          
          diagnostics.direct_r2_test = {
            success: r2Response.ok,
            status: r2Response.status,
            error: r2Response.ok ? null : await r2Response.text().catch(() => 'Failed to get response text'),
            headers: Object.fromEntries([...r2Response.headers.entries()])
          };
        } catch (directErr) {
          diagnostics.direct_r2_test.error = directErr instanceof Error 
            ? directErr.message 
            : String(directErr);
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