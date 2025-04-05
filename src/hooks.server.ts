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
    env_keys?: string[];
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
            
            // Add a list of environment keys for debugging
            if (event.platform?.env) {
                diagnostics.env_keys = Object.keys(event.platform.env);
            }
            
            if (event.platform?.env?.ASSETS) {
                try {
                    // Log details about the R2 binding for debugging
                    console.log('R2 Binding ASSETS details:');
                    console.log('Type:', typeof event.platform.env.ASSETS);
                    console.log('Properties:', Object.keys(event.platform.env.ASSETS));
                    
                    // Try accessing a known method on R2 bucket
                    const testMethods = [
                        'get', 'head', 'put', 'delete', 
                        'list', 'createMultipartUpload',
                        'fetch'
                    ];
                    
                    for (const method of testMethods) {
                        // @ts-ignore - Bypass type checking for dynamic property access
                        if (typeof event.platform.env.ASSETS[method] === 'function') {
                            console.log(`Method ${method} is available`);
                        } else {
                            console.log(`Method ${method} is NOT available`);
                        }
                    }
                    
                    // Simple test - just check if the R2 binding exists
                    // Don't try to call any methods that might not be implemented
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

    // Handle image requests in a simplified way
    if (pathname.startsWith('/directr2/') || pathname.startsWith('/images/') || pathname.startsWith('/constants/')) {
        try {
            let key;
            
            // Map the URL path to the correct R2 key
            if (pathname.startsWith('/directr2/')) {
                key = pathname.substring('/directr2/'.length);
            } else if (pathname.startsWith('/images/portfolio/')) {
                key = 'portfolio/' + pathname.substring('/images/portfolio/'.length);
            } else if (pathname.startsWith('/images/constants/')) {
                key = 'constants/' + pathname.substring('/images/constants/'.length);
            } else if (pathname.startsWith('/images/blog/')) {
                key = 'blog/' + pathname.substring('/images/blog/'.length);
            } else if (pathname.startsWith('/constants/')) {
                key = 'constants/' + pathname.substring('/constants/'.length);
            } else {
                console.error(`URL pattern not recognized: ${pathname}`);
                return new Response('Not Found', { status: 404 });
            }

            console.log(`Looking for R2 object with key: ${key}`);

            // Check if platform and R2 are available
            if (!event.platform?.env?.ASSETS) {
                console.error('R2 bucket binding not available');
                return new Response('R2 Configuration Error', { status: 500 });
            }
            
            // Print R2 binding details
            console.log('R2 Binding properties for image request:');
            console.log('Type:', typeof event.platform.env.ASSETS);
            console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(event.platform.env.ASSETS)));

            try {
                // Try to access the object from R2 directly
                // This is the most basic method that should be supported
                console.log(`Attempting to get R2 object with key: ${key}`);
                const object = await event.platform.env.ASSETS.get(key);
                
                if (!object) {
                    console.error(`Object not found: ${key}`);
                    return new Response(`Not Found: ${key}`, { status: 404 });
                }
                
                console.log(`Found R2 object: ${key}, properties:`, Object.keys(object));
                
                // Create headers manually instead of using writeHttpMetadata
                const headers = new Headers();
                
                // Set basic headers
                headers.set('Cache-Control', 'public, max-age=31536000');
                
                // Set content-type based on file extension
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
                    headers.set('content-type', contentTypes[fileExtension]);
                }
                
                // Return the object body with headers
                return new Response(object.body, {
                    headers
                });
            } catch (error) {
                console.error(`Error accessing R2 object: ${key}`, error);
                
                // Try an alternative approach for Cloudflare Pages
                try {
                    console.log(`Attempting alternative fetch method for: ${key}`);
                    // Use the Cloudflare R2 binding directly as a fetch source
                    // Some Cloudflare environments implement this method
                    // @ts-ignore - The fetch method is available in some Cloudflare deployments but not in type definition
                    const response = await event.platform.env.ASSETS.fetch(
                        new Request(`https://fake-host/${key}`)
                    );
                    
                    if (!response.ok) {
                        console.error(`Alternative fetch failed with status: ${response.status}`);
                        return new Response(`Object not found: ${key}`, { status: 404 });
                    }
                    
                    console.log(`Alternative fetch successful for: ${key}`);
                    
                    // Add caching headers
                    const headers = new Headers(response.headers);
                    headers.set('Cache-Control', 'public, max-age=31536000');
                    
                    return new Response(response.body, {
                        headers
                    });
                } catch (fetchError) {
                    console.error(`Alternative R2 fetch failed for: ${key}`, fetchError);
                    return new Response(
                        `R2 access failed. Please check Cloudflare R2 binding and permissions. Error: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                        { status: 500 }
                    );
                }
            }
        } catch (error) {
            console.error('R2 error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
        }
    }

    // For all other requests, proceed normally
    return resolve(event);
}; 