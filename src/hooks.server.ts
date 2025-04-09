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

// Only use local images in development mode
const USE_LOCAL_IMAGES = dev;

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;
    const platform = event.platform; // Get platform context

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

            // --- Refined /directr2/ Handling ---
            if (pathname.startsWith('/directr2/')) {
                console.log(`[Hook] Intercepting /directr2/ request for key: ${key}`);

                // Production logic: Use R2 bucket
                if (!dev && platform?.env?.ASSETSBUCKET) {
                    console.log(`[Hook Prod] Attempting R2 get for key: ${key}`);
                    try {
                        // Type assertion might be needed depending on platform definition
                        const R2Bucket = platform.env.ASSETSBUCKET as R2Bucket;
                        const object = await R2Bucket.get(key);

                        if (object !== null) {
                            console.log(`[Hook Prod] R2 get successful for key: ${key}. Streaming response.`);
                            const headers = new Headers();
                            object.writeHttpMetadata(headers);
                            headers.set('etag', object.httpEtag);
                            // headers.set('Cache-Control', 'public, max-age=3600'); // Optional caching
                            return new Response(object.body, { headers });
                        } else {
                            // Object not found in R2
                            console.warn(`[Hook Prod] Object not found in R2 for key: ${key}. Returning 404.`);
                            return new Response('Not Found in R2', { status: 404 });
                        }
                    } catch (err) {
                        console.error(`[Hook Prod] Error fetching key ${key} from R2:`, err);
                        return new Response('Internal Server Error fetching from R2', { status: 500 });
                    }
                }
                // Development logic: Use local path fallback
                else if (dev) {
                    console.log(`[Hook Dev] Looking for local path for key: ${key}`);
                    const localPath = getLocalPath(key); // Use existing helper

                    if (localPath) {
                        console.log(`[Hook Dev] Found local path: ${localPath}. Assuming Vite handles src/ path.`);
                        // In dev, allow request to proceed - Vite might handle src/ paths directly
                        // or the fetch in +page.ts might resolve it. No explicit return needed here.
                    } else {
                        console.warn(`[Hook Dev] No local path mapping found for key: ${key}. Passing through.`);
                        // Fall through to resolve(event) if no local mapping
                    }
                }
                // Fallback / Error case
                else {
                    console.error('[Hook] Invalid state for /directr2/: Not dev and no ASSETSBUCKET binding.');
                    return new Response('Server Configuration Error', { status: 500 });
                }
                // If dev logic fell through, let SvelteKit handle it
                // Production logic always returns explicitly
                if (dev) {
                   console.log(`[Hook Dev] Passing ${pathname} to SvelteKit resolver after /directr2 check.`);
                   // Continue to resolve normally for dev if no specific action taken
                } else {
                   // Should be unreachable as prod cases return explicitly
                   console.error('[Hook Prod] Reached unexpected state after /directr2 handling.');
                   return new Response('Internal Server Error', { status: 500 });
                }
            }
            // --- End Refined /directr2/ Handling ---

            // In production or when not using local images, use R2
            if (!USE_LOCAL_IMAGES) {
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
    console.log(`[getLocalPath] Mapping key: ${key}`);
    if (key.startsWith('portfolio/')) {
        const path = `/src/images/Portfolio/${key.substring('portfolio/'.length)}`;
        console.log(`[getLocalPath] Mapped portfolio key to: ${path}`);
        return path;
    } else if (key.startsWith('blog/')) {
        const blogPath = key.substring('blog/'.length); 
        const path = `/src/content/blog/posts/${blogPath}`; // Use corrected posts path
        console.log(`[getLocalPath] Mapped blog key to: ${path}`);
        return path;
    } else if (key.startsWith('constants/')) {
        const path = `/public/images/${key.substring('constants/'.length)}`;
        console.log(`[getLocalPath] Mapped constants key to: ${path}`);
        return path;
    }
    console.log(`[getLocalPath] No mapping found for key: ${key}`);
    return null;
}

// Add a minimal R2Bucket type if not globally available (adjust if needed)
interface R2Bucket {
    get(key: string): Promise<R2Object | null>;
    head(key: string): Promise<R2ObjectMeta | null>;
}
interface R2Object {
    body: ReadableStream;
    writeHttpMetadata(headers: Headers): void;
    httpEtag: string;
    // Add other properties if used
}
interface R2ObjectMeta {
    httpEtag: string;
    // Add other properties if used
} 