import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

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

// --- START Moved R2 Type Definitions ---
interface R2Object {
    body: ReadableStream;
    writeHttpMetadata(headers: Headers): void;
    httpEtag: string;
    // Add other properties if used (like httpMetadata for Content-Type)
    httpMetadata?: { contentType?: string }; 
}
interface R2ObjectMeta {
    httpEtag: string;
    // Add other properties if used
}
interface IR2Bucket { // Renamed interface to avoid collision
    get(key: string): Promise<R2Object | null>;
    head(key: string): Promise<R2ObjectMeta | null>;
}
// --- END Moved R2 Type Definitions ---

// Only use local images in development mode
const USE_LOCAL_IMAGES = dev;

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;

    // Handle image requests and specific root files
    if (pathname.startsWith('/directr2/') || pathname.startsWith('/images/') || pathname.startsWith('/constants/') || 
        pathname === '/favicon.ico' || pathname === '/apple-touch-icon.png' || pathname === '/site.webmanifest') { // Added root files
        try {
            let key;
            
            // Handle root level files first
            if (pathname === '/favicon.ico') {
                key = 'constants/favicon.ico';
                console.log(`[Hook] Mapped root request ${pathname} to key ${key}`);
            } else if (pathname === '/apple-touch-icon.png') {
                key = 'constants/apple-touch-icon.png';
                console.log(`[Hook] Mapped root request ${pathname} to key ${key}`);
            } else if (pathname === '/site.webmanifest') {
                key = 'constants/site.webmanifest';
                console.log(`[Hook] Mapped root request ${pathname} to key ${key}`);
            }
            // --- START Favicon Handling ---
            else if (pathname === '/images/favicon.png') {
                key = 'constants/favicon.png';
                console.log(`[Hook] Mapped favicon request ${pathname} to key ${key}`);
            }
            // --- END Favicon Handling ---
            // Map the URL path to the correct R2 key
            if (pathname.startsWith('/directr2/')) {
                key = pathname.substring('/directr2/'.length);
                console.log(`[Hook] Intercepting /directr2/ request for path: ${pathname}`);
                
                // --- START R2 Key Correction ---
                // If it's a blog asset, ensure the 'posts' directory is in the key
                if (key.startsWith('blog/') && !key.startsWith('blog/posts/')) {
                    const originalKey = key;
                    key = key.replace('blog/', 'blog/posts/');
                    console.log(`[Hook] Corrected blog asset key from "${originalKey}" to "${key}"`);
                }
                // --- END R2 Key Correction ---

                console.log(`[Hook] Using R2 key: ${key}`);
            } else if (pathname.startsWith('/images/portfolio/')) {
                key = 'portfolio/' + pathname.substring('/images/portfolio/'.length);
            } else if (pathname.startsWith('/images/constants/')) {
                key = 'constants/' + pathname.substring('/images/constants/'.length);
            } else if (pathname.startsWith('/images/blog/')) {
                // --- MODIFIED KEY GENERATION LOGIC --- 
                const requestedFile = pathname.substring('/images/blog/'.length);
                const parts = requestedFile.split('/');

                // Check if the request looks like a direct slug reference, e.g., /images/blog/slug.jpg
                if (parts.length === 1 && requestedFile.endsWith('.jpg')) { 
                    const slug = requestedFile.replace('.jpg', '');
                    // Assume this conventional request means "get the header image for this slug"
                    // Force the key to point to 'header.jpg' within that slug's assumed directory
                    key = `blog/${slug}/header.jpg`; 
                    console.log(`[Hook] Mapped conventional request ${pathname} to key ${key}`);
                } else {
                    // Otherwise, assume the path is relative within the 'blog' namespace
                    // e.g., /images/blog/night-photo/mamiya6.jpg -> blog/night-photo/mamiya6.jpg
                    key = 'blog/' + requestedFile;
                     console.log(`[Hook] Mapped direct blog image request ${pathname} to key ${key}`);
                }
                // --- END MODIFIED KEY GENERATION LOGIC ---
            } else if (pathname.startsWith('/constants/')) {
                key = 'constants/' + pathname.substring('/constants/'.length);
            } else {
                console.error(`URL pattern not recognized: ${pathname}`);
                return new Response('Not Found', { status: 404 });
            }

            console.log(`Development mode: ${dev}, Using local images: ${USE_LOCAL_IMAGES}`);
            console.log(`Looking for ${USE_LOCAL_IMAGES ? 'local' : 'R2'} object with key: ${key}`);

            // In production or when not using local images, use R2
            if (!USE_LOCAL_IMAGES) {
                // Check if platform is available
                if (!event.platform?.env?.ASSETSBUCKET) {
                    console.error('R2 bucket binding not available');
                    return new Response('R2 Bucket Not Available', { status: 500 });
                }
                
                try {
                    // Assert type for R2 Bucket
                    const R2Bucket = event.platform.env.ASSETSBUCKET as IR2Bucket;

                    // First check if the object exists using head (which is faster)
                    console.log(`[Hook Prod] Attempting R2 head for key: ${key}`);
                    const headResult = await R2Bucket.head(key);
                    
                    if (!headResult) {
                        console.warn(`[Hook Prod] Object not found via HEAD for key: ${key}`);
                        return new Response(`Object not found: ${key}`, { status: 404 });
                    }
                    
                    // --- START Explicit HEAD Method Handling ---
                    if (event.request.method === 'HEAD') {
                        console.log(`[Hook Prod] HEAD request successful for key: ${key}. Returning 200 OK.`);
                        const headers = new Headers();
                        // Copy metadata if possible and needed (check R2 documentation for headResult properties)
                        // headResult.writeHttpMetadata(headers); // Example if available
                        headers.set('etag', headResult.httpEtag);
                        
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
                            headers.set('Content-Type', contentTypes[fileExtension]);
                        }
                        // Add caching headers
                        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                        
                        return new Response(null, { status: 200, headers });
                    }
                    // --- END Explicit HEAD Method Handling ---
                    
                    // --- START Explicit GET Method Handling ---
                    else if (event.request.method === 'GET') {
                        // Object exists, now get it (for GET requests)
                        console.log(`[Hook Prod] GET request: Found object via HEAD, retrieving: ${key}`);
                        const obj = await R2Bucket.get(key);
                        
                        if (!obj) {
                            // Should be rare if HEAD succeeded, but handle defensively
                            console.error(`[Hook Prod] Object retrieval failed for key: ${key} after HEAD success`);
                            return new Response(`Object retrieval failed: ${key}`, { status: 404 });
                        }
                        
                        // Set up appropriate headers
                        const headers = new Headers();
                        obj.writeHttpMetadata(headers); // Standard way to copy headers from R2Object
                        headers.set('etag', obj.httpEtag);
                        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                        
                        // Return the object body with headers
                        console.log(`[Hook Prod] Streaming GET response for key: ${key}`);
                        return new Response(obj.body, { headers });
                    }
                    // --- END Explicit GET Method Handling ---
                    
                    else {
                         // Handle other methods (POST, PUT, DELETE, etc.) if necessary
                         console.warn(`[Hook Prod] Method ${event.request.method} not allowed for key: ${key}`);
                         return new Response('Method Not Allowed', { status: 405 });
                    }

                } catch (error) {
                    console.error('R2 error:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
                }
            }

            // In development with local images, redirect to the static file
            // This will be handled by Vite's dev server
            const localPath = getLocalPath(key);
            if (!localPath) {
                return new Response(`Local file path not found for key: ${key}`, { status: 404 });
            }

            // Redirect to the static file
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': localPath
                }
            });
        } catch (error) {
            console.error('Error handling request:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
        }
    }

    // For all other requests, proceed normally
    const response = await resolve(event);
    return response;
};

// Helper function to get the local path for a key
function getLocalPath(key: string): string | null {
    if (key.startsWith('portfolio/')) {
        return `/src/images/Portfolio/${key.substring('portfolio/'.length)}`;
    } else if (key.startsWith('blog/')) {
        const blogPath = key.substring('blog/'.length); // Extract path part, e.g., "night-photo/header.jpg"
        // Construct path relative to the 'posts' directory
        return `/src/content/blog/posts/${blogPath}`;
    } else if (key.startsWith('constants/')) {
        return `/public/images/${key.substring('constants/'.length)}`;
    }
    return null;
} 