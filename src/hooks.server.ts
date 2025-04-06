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

    // Handle image requests in a simplified way that directly accesses the bucket
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
            if (!event.platform?.env?.ASSETSBUCKET) {
                console.error('R2 bucket binding not available');
                return new Response('R2 Bucket Not Available', { status: 500 });
            }
            
            // Based on the test results, we can see that 'head' and 'get' methods are available
            // Let's first check if the object exists with 'head', then get it with 'get'
            try {
                // First check if the object exists using head (which is faster)
                const headResult = await event.platform.env.ASSETSBUCKET.head(key);
                
                if (!headResult) {
                    console.error(`Object not found for key: ${key}`);
                    return new Response(`Object not found: ${key}`, { status: 404 });
                }
                
                // Object exists, now get it
                console.log(`Found object, retrieving: ${key}`);
                const obj = await event.platform.env.ASSETSBUCKET.get(key);
                
                if (!obj) {
                    console.error(`Object retrieval failed for key: ${key}`);
                    return new Response(`Object retrieval failed: ${key}`, { status: 404 });
                }
                
                // Set up appropriate headers
                const headers = new Headers();
                
                // Use the content-type from the object if available
                if (obj.httpMetadata?.contentType) {
                    headers.set('Content-Type', obj.httpMetadata.contentType);
                } else {
                    // Set content-type based on file extension if not in metadata
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
                        headers.set('Content-Type', contentTypes[fileExtension]);
                    }
                }
                
                // Add caching headers
                headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                
                // Return the object body with headers
                return new Response(obj.body, { headers });
                
            } catch (directAccessError) {
                console.error('Direct R2 access failed:', directAccessError);
                
                // If direct access fails, fall back to our public URL approach
                console.log('Falling back to public URL approach...');
            }
            
            // FALLBACK APPROACH: Try public URLs first, which could work if bucket has public access
            // Based on your R2 test results, we need to try different URL patterns
            
            const bucketName = 'aokframes-website-assets';
            // Try a standard public access format pattern rather than a specific ID
            // This format should be set up in your Cloudflare R2 dashboard
            
            // Try various URL patterns that could work with Cloudflare R2
            let publicUrls = [
                // R2 direct binding first
                `/r2/${bucketName}/${key}`,
                
                // Typical public URL formats
                `https://pub-${bucketName}.r2.dev/${key}`,
                `https://${bucketName}.r2.dev/${key}`,
                
                // Custom domain format if configured
                `https://r2.aokframes.com/${key}`,
                
                // Worker route patterns
                `https://aokframes.com/r2/${key}`,
            ];
            
            // Try each URL option until one works
            let response = null;
            let lastError = null;
            
            for (const url of publicUrls) {
                try {
                    console.log(`Trying to fetch from ${url}`);
                    const fetchResponse = await fetch(url, {
                        // No-store to avoid caching issues during testing
                        cache: 'no-store'
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
                console.error(`All access methods failed for ${key}`, lastError);
                return new Response(`Object not found or inaccessible: ${key}`, { status: 404 });
            }
            
            // Create a new response with appropriate headers
            const headers = new Headers(response.headers);
            headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
            
            // Add cross-origin headers to allow assets to be loaded from any origin
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            
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
    const response = await resolve(event);
    return response;
}; 