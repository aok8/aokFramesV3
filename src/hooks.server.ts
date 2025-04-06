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
                r2_binding_exists: !!(event.platform?.env?.ASSETSBUCKET),
                platform_available: !!event.platform,
                platform_env_available: !!(event.platform?.env),
                context_available: !!(event.platform?.context),
                request_headers: Object.fromEntries([...new Headers(event.request.headers)])
            };
            
            // Add a list of environment keys for debugging
            if (event.platform?.env) {
                diagnostics.env_keys = Object.keys(event.platform.env);
            }
            
            if (event.platform?.env?.ASSETSBUCKET) {
                try {
                    // Log details about the R2 binding for debugging
                    console.log('R2 Binding ASSETSBUCKET details:');
                    console.log('Type:', typeof event.platform.env.ASSETSBUCKET);
                    console.log('Properties:', Object.keys(event.platform.env.ASSETSBUCKET));
                    
                    // Try accessing a known method on R2 bucket
                    const testMethods = [
                        'get', 'head', 'put', 'delete', 
                        'list', 'createMultipartUpload',
                        'fetch'
                    ];
                    
                    for (const method of testMethods) {
                        // @ts-ignore - Bypass type checking for dynamic property access
                        if (typeof event.platform.env.ASSETSBUCKET[method] === 'function') {
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

    // Handle image requests in a simplified way that directly accesses the bucket via its public URL
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

            // Check if platform is available - this is our minimal requirement 
            if (!event.platform?.env) {
                console.error('Platform environment not available');
                return new Response('Configuration Error', { status: 500 });
            }
            
            // Try to use a public URL for the bucket
            // This is the most compatible approach when Workers KV integration has limitations
            
            // Construct a direct public URL to the R2 bucket
            // First, attempt using environment variable if available
            const bucketName = 'aokframes-website-assets';
            
            // For Cloudflare R2, the public URL format is usually:
            // https://<accountid>.r2.dev/<bucketname>/<key>
            // or if you have a custom domain setup:
            // https://r2.yourdomain.com/<key>
            
            // Try to determine the appropriate URL
            let publicUrls = [
                // Standard public URLs (if enabled in Cloudflare dashboard)
                `https://pub-${bucketName}.r2.dev/${key}`,
                
                // Account-specific URL format (if known)
                //`https://<your-account-id>.r2.dev/${bucketName}/${key}`,
                
                // Custom domain if configured
                //`https://r2.yourdomain.com/${key}`,
                
                // Fallback with bucket name as subdomain
                `https://${bucketName}.r2.dev/${key}`
            ];
            
            // Try each URL option until one works
            let response = null;
            let lastError = null;
            
            for (const url of publicUrls) {
                try {
                    console.log(`Trying to fetch from ${url}`);
                    const fetchResponse = await fetch(url, {
                        // Use standard cache options
                        cache: 'force-cache'
                    });
                    
                    if (fetchResponse.ok) {
                        console.log(`Successfully fetched from ${url}`);
                        response = fetchResponse;
                        break;
                    } else {
                        console.log(`Failed to fetch from ${url}: ${fetchResponse.status}`);
                        lastError = new Error(`Failed with status ${fetchResponse.status}`);
                    }
                } catch (err) {
                    console.error(`Error fetching from ${url}:`, err);
                    lastError = err;
                }
            }
            
            if (!response) {
                console.error(`All public URL attempts failed for ${key}`, lastError);
                
                // Final fallback - try using the Cloudflare Worker ASSETSBUCKET binding differently
                try {
                    if (event.platform.env.ASSETSBUCKET && typeof event.platform.env.ASSETSBUCKET === 'object') {
                        // If the R2 binding is present but methods aren't working
                        // This is a last-ditch effort
                        console.log("Attempting proxy fetch using default bucket host");
                        
                        const proxyUrl = `https://aokframes-website-assets.r2.dev/${key}`;
                        const proxyResponse = await fetch(proxyUrl);
                        
                        if (proxyResponse.ok) {
                            console.log(`Proxy fetch succeeded for ${key}`);
                            
                            // Create a new response with appropriate headers
                            const headers = new Headers(proxyResponse.headers);
                            headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                            
                            // Set content-type based on file extension if not already set
                            if (!headers.has('content-type')) {
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
                            }
                            
                            return new Response(proxyResponse.body, { headers });
                        }
                    }
                } catch (proxyError) {
                    console.error("Proxy fetch failed:", proxyError);
                }
                
                return new Response(`Object not found: ${key}`, { status: 404 });
            }
            
            // Create a new response with appropriate headers
            const headers = new Headers(response.headers);
            headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
            
            // Set content-type based on file extension if not already set
            if (!headers.has('content-type')) {
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
            }
            
            return new Response(response.body, {
                headers
            });
        } catch (error) {
            console.error('R2 error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
        }
    }

    // For all other requests, proceed normally
    return resolve(event);
}; 