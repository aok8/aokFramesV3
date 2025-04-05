import type { Handle } from '@sveltejs/kit';

// Use a type for diagnostics
interface DiagnosticResult {
    r2_binding_exists: boolean;
    platform_available: boolean;
    platform_env_available: boolean;
    context_available: boolean;
    request_headers: Record<string, string>;
    r2_bucket_test?: {
        success: boolean;
        error?: string;
    };
}

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;
    
    // Special diagnostics path for debugging R2 access
    if (pathname === '/api/r2-diagnostics') {
        try {
            const diagnostics: DiagnosticResult = {
                r2_binding_exists: !!(event.platform?.env?.ASSETS),
                platform_available: !!event.platform,
                platform_env_available: !!(event.platform?.env),
                context_available: !!(event.platform?.context),
                request_headers: Object.fromEntries([...new Headers(event.request.headers)])
            };
            
            if (event.platform?.env?.ASSETS) {
                try {
                    // Try a simple get operation instead of list
                    // Just checking if we can access the API
                    await event.platform.env.ASSETS.head('constants/bg.jpg');
                    diagnostics.r2_bucket_test = {
                        success: true
                    };
                } catch (testError) {
                    diagnostics.r2_bucket_test = {
                        success: false,
                        error: testError instanceof Error ? testError.message : String(testError)
                    };
                }
            }
            
            return new Response(JSON.stringify(diagnostics, null, 2), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Diagnostics error',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            }, null, 2), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    }

    // Handle direct R2 serving endpoint - for bypassing regular handler
    if (pathname.startsWith('/directr2/')) {
        try {
            // Extract the key from the path
            const key = pathname.substring('/directr2/'.length);
            
            if (!event.platform?.env?.ASSETS) {
                return new Response('R2 binding missing', { status: 500 });
            }
            
            // Use the fetch method from Cloudflare Workers
            // This accesses the R2 bucket through a different API call mechanism
            // that should work even when the normal methods don't
            // Use bucket name from wrangler.toml instead of assuming it has a bucket property
            const bucketName = 'aokframes-website-assets'; // Must match your R2 bucket name
            const r2Url = `https://${bucketName}.r2.dev/${key}`;
            
            // Create a new request for the R2 public endpoint
            const r2Request = new Request(r2Url);
            
            // Make the request to R2 public endpoint
            const r2Response = await fetch(r2Request);
            
            if (!r2Response.ok) {
                return new Response(`Failed to fetch from R2: ${r2Response.status} ${r2Response.statusText}`, 
                    { status: r2Response.status });
            }
            
            // Create a new response with caching headers
            const response = new Response(r2Response.body, {
                headers: new Headers(r2Response.headers)
            });
            
            // Set caching
            response.headers.set('Cache-Control', 'public, max-age=31536000');
            
            return response;
        } catch (error) {
            console.error('Direct R2 fetch error:', error);
            return new Response(`Direct R2 error: ${error instanceof Error ? error.message : String(error)}`, 
                { status: 500 });
        }
    }

    // Check direct paths without /images/ prefix - use direct R2 URL approach
    if (pathname.startsWith('/constants/')) {
        try {
            const key = 'constants/' + pathname.substring('/constants/'.length);
            console.log(`Looking for R2 object with key: ${key} (direct path)`);
            
            if (!event.platform?.env?.ASSETS) {
                console.error('Direct path: R2 bucket binding not available');
                return new Response('R2 Configuration Error', { status: 500 });
            }
            
            // Use public direct URL approach with hardcoded bucket name
            const bucketName = 'aokframes-website-assets'; // Must match your R2 bucket name
            const r2Url = `https://${bucketName}.r2.dev/${key}`;
            
            // Create a new request for the R2 public endpoint
            const r2Request = new Request(r2Url);
            
            // Make the request to R2 public endpoint
            const r2Response = await fetch(r2Request);
            
            if (!r2Response.ok) {
                console.error(`Direct path: R2 object not found: ${key}`);
                return new Response(`Not Found: ${key}`, { status: 404 });
            }
            
            console.log(`Direct path: Found R2 object: ${key}`);
            
            // Create a new response with caching headers
            const response = new Response(r2Response.body, {
                headers: new Headers(r2Response.headers)
            });
            
            // Set caching and content type if needed
            response.headers.set('Cache-Control', 'public, max-age=31536000');
            
            // Determine content type based on file extension if not set
            if (!response.headers.has('content-type')) {
                const fileExtension = key.split('.').pop()?.toLowerCase();
                const contentTypes: Record<string, string> = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'svg': 'image/svg+xml',
                    'md': 'text/markdown'
                };
                
                if (fileExtension && contentTypes[fileExtension]) {
                    response.headers.set('content-type', contentTypes[fileExtension]);
                }
            }
            
            return response;
        } catch (error) {
            console.error('Direct path R2 error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Direct path error: ${errorMessage}`, { status: 500 });
        }
    }
    
    // Handle image requests - also using direct URL approach
    if (pathname.startsWith('/images/')) {
        try {
            let key: string;
            
            // Map the URL path to the correct R2 key
            if (pathname.startsWith('/images/portfolio/')) {
                key = 'portfolio/' + pathname.substring('/images/portfolio/'.length);
            } else if (pathname.startsWith('/images/constants/')) {
                key = 'constants/' + pathname.substring('/images/constants/'.length);
            } else if (pathname.startsWith('/images/blog/')) {
                key = 'blog/' + pathname.substring('/images/blog/'.length);
            } else {
                console.error(`URL pattern not recognized: ${pathname}`);
                return new Response('Not Found', { status: 404 });
            }

            console.log(`Looking for R2 object with key: ${key}`);

            // Validate platform environment
            if (!event.platform?.env) {
                console.error('Platform environment not available');
                return new Response('Configuration Error', { status: 500 });
            }
            
            if (!event.platform.env.ASSETS) {
                console.error('R2 bucket binding not available');
                return new Response('R2 Configuration Error', { status: 500 });
            }

            // Use public direct URL approach with hardcoded bucket name
            const bucketName = 'aokframes-website-assets'; // Must match your R2 bucket name
            const r2Url = `https://${bucketName}.r2.dev/${key}`;
            
            // Create a new request for the R2 public endpoint
            const r2Request = new Request(r2Url);
            
            // Make the request to R2 public endpoint
            const r2Response = await fetch(r2Request);
            
            if (!r2Response.ok) {
                console.error(`R2 object not found: ${key}`);
                return new Response(`Not Found: ${key}`, { status: r2Response.status });
            }

            console.log(`Found R2 object: ${key}`);

            // Create a new response with caching headers
            const response = new Response(r2Response.body, {
                headers: new Headers(r2Response.headers)
            });
            
            // Set caching
            response.headers.set('Cache-Control', 'public, max-age=31536000');
            
            // Determine content type based on file extension if not set
            if (!response.headers.has('content-type')) {
                const fileExtension = key.split('.').pop()?.toLowerCase();
                const contentTypes: Record<string, string> = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'svg': 'image/svg+xml',
                    'md': 'text/markdown'
                };
                
                if (fileExtension && contentTypes[fileExtension]) {
                    response.headers.set('content-type', contentTypes[fileExtension]);
                }
            }
            
            return response;
        } catch (error) {
            console.error('R2 error:', error);
            // More detailed error for debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
        }
    }

    // For all other requests, proceed normally
    return resolve(event);
}; 