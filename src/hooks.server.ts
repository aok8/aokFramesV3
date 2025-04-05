import type { Handle } from '@sveltejs/kit';

// Use a type for diagnostics
interface DiagnosticResult {
    r2_binding_exists: boolean;
    platform_available: boolean;
    platform_env_available: boolean;
    context_available: boolean;
    request_headers: Record<string, string>;
    r2_bucket_list_test?: {
        success: boolean;
        objects_found?: number;
        truncated?: boolean;
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
                    // Check if we can list objects
                    const testResult = await event.platform.env.ASSETS.list({
                        limit: 1
                    });
                    diagnostics.r2_bucket_list_test = {
                        success: true,
                        objects_found: testResult.objects.length,
                        truncated: testResult.truncated,
                    };
                } catch (listError) {
                    diagnostics.r2_bucket_list_test = {
                        success: false,
                        error: listError instanceof Error ? listError.message : String(listError)
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

    // Check direct paths without /images/ prefix
    if (pathname.startsWith('/constants/')) {
        try {
            let key: string = 'constants/' + pathname.substring('/constants/'.length);
            console.log(`Looking for R2 object with key: ${key} (direct path)`);
            
            if (!event.platform?.env?.ASSETS) {
                console.error('Direct path: R2 bucket binding not available');
                return new Response('R2 Configuration Error', { status: 500 });
            }
            
            const object = await event.platform.env.ASSETS.get(key);
            
            if (!object) {
                console.error(`Direct path: R2 object not found: ${key}`);
                return new Response(`Not Found: ${key}`, { status: 404 });
            }
            
            console.log(`Direct path: Found R2 object: ${key}, size: ${object.size}`);
            
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000');
            
            const fileExtension = key.split('.').pop()?.toLowerCase();
            if (fileExtension && !headers.has('content-type')) {
                const contentTypes: Record<string, string> = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'svg': 'image/svg+xml',
                    'md': 'text/markdown'
                };
                
                if (contentTypes[fileExtension]) {
                    headers.set('content-type', contentTypes[fileExtension]);
                }
            }
            
            return new Response(object.body, { headers });
        } catch (error) {
            console.error('Direct path R2 error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Direct path error: ${errorMessage}`, { status: 500 });
        }
    }
    
    // Handle image requests
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

            // Get the object from R2
            if (!event.platform?.env) {
                console.error('Platform environment not available');
                return new Response('Configuration Error', { status: 500 });
            }
            
            if (!event.platform.env.ASSETS) {
                console.error('R2 bucket binding not available');
                return new Response('R2 Configuration Error', { status: 500 });
            }

            const object = await event.platform.env.ASSETS.get(key);

            if (!object) {
                console.error(`R2 object not found: ${key}`);
                return new Response(`Not Found: ${key}`, { status: 404 });
            }

            console.log(`Found R2 object: ${key}, size: ${object.size}`);

            // Set appropriate headers
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000');
            
            // Determine content type based on file extension if not set
            const fileExtension = key.split('.').pop()?.toLowerCase();
            if (fileExtension && !headers.has('content-type')) {
                const contentTypes: Record<string, string> = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp',
                    'svg': 'image/svg+xml',
                    'md': 'text/markdown'
                };
                
                if (contentTypes[fileExtension]) {
                    headers.set('content-type', contentTypes[fileExtension]);
                }
            }
            
            return new Response(object.body, { headers });
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