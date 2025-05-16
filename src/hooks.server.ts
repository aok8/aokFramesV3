import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import fs from 'node:fs/promises'; // Import fs for local dev file reading
import path from 'node:path'; // Import path for local dev file reading
import { createServerLogger } from '$lib/utils/logger';

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
    const serverLogger = createServerLogger(event.platform?.env);
    const pathname = event.url.pathname;

    // --- START: Development Mode R2 Emulation for /directr2/ ---
    if (dev && pathname.startsWith('/directr2/')) {
        try {
            const key = pathname.substring('/directr2/'.length);
            serverLogger.log(`[Hook Dev] Intercepting /directr2/ request for key: ${key}`);

            // Determine the local file path based on the key structure
            let localFilePath: string;
            if (key.startsWith('blog/posts/')) {
                // Blog content files are in src/content
                 const relativePath = key.substring('blog/posts/'.length); // e.g., my-post/index.md
                 localFilePath = path.resolve('src', 'content', 'blog', 'posts', relativePath);
            } else if (key.startsWith('works/')) {
                // Works images are in src/content/works
                const relativePath = key.substring('works/'.length);
                // Decode URL-encoded paths (for spaces in folder names like "Boxing%20Tournament")
                const decodedPath = decodeURIComponent(relativePath);
                localFilePath = path.resolve('src', 'content', 'works', decodedPath);
            } else if (key.startsWith('blog/')) {
                 // Might be blog images not under posts, e.g., blog/some-image.webp
                 // Check if it should map to src/content/blog/posts/<slug>/header.webp
                 const potentialSlug = key.substring('blog/'.length).replace('/header.webp', '');
                 const possibleHeaderPath = path.resolve('src', 'content', 'blog', 'posts', potentialSlug, 'header.webp');
                 if (await fs.stat(possibleHeaderPath).then(() => true).catch(() => false)) {
                      localFilePath = possibleHeaderPath;
                      serverLogger.log(`[Hook Dev] Mapping blog key "${key}" to header: ${localFilePath}`);
                 } else {
                     // Fallback: Assume it's in static/images/blog/...
                     const relativePath = key.substring('blog/'.length);
                     localFilePath = path.resolve('static', 'images', 'blog', relativePath);
                     serverLogger.log(`[Hook Dev] Mapping blog key "${key}" to static: ${localFilePath}`);
                 }
            } else if (key.startsWith('portfolio/')) {
                // Portfolio images are in static/images/Portfolio
                const relativePath = key.substring('portfolio/'.length); // e.g., w1920/image.webp
                localFilePath = path.resolve('static', 'images', 'Portfolio', relativePath);
            } else if (key.startsWith('constants/')) {
                 // Constants images have specific paths
                 const constantPath = key.substring('constants/'.length); // e.g., "w1024/bg.webp" or "Profile_Pic.webp"

                 if (constantPath.includes('/bg.webp')) { // Background image
                     // Maps constants/w1024/bg.webp -> public/images/bg/w1024/bg.webp
                     localFilePath = path.resolve('public', 'images', 'bg', constantPath);
                     serverLogger.log(`[Hook Dev] Mapping constants BG key "${key}" to: ${localFilePath}`);
                 } else if (constantPath === 'Profile_Pic.webp') { // Profile picture
                     // Maps constants/Profile_Pic.webp -> public/images/Profile_Pic.webp
                     localFilePath = path.resolve('public', 'images', constantPath);
                     serverLogger.log(`[Hook Dev] Mapping constants Profile Pic key "${key}" to: ${localFilePath}`);
                 } else if (constantPath === 'Prints.webp') { // Prints image
                     // Maps constants/Prints.webp -> public/images/Prints.webp
                     localFilePath = path.resolve('public', 'images', constantPath);
                     serverLogger.log(`[Hook Dev] Mapping constants Prints key "${key}" to: ${localFilePath}`);
                 } else if (['favicon.ico', 'apple-touch-icon.png', 'site.webmanifest', 'favicon.png'].includes(constantPath)) { // Root icons/manifest (Assume these ARE in static)
                     // Maps constants/favicon.ico -> static/favicon.ico
                     localFilePath = path.resolve('static', constantPath);
                     serverLogger.log(`[Hook Dev] Mapping constants Root Asset key "${key}" to: ${localFilePath}`);
                 } else {
                     // Fallback for any other constants keys? 
                     // Where should other constants map in dev?
                     serverLogger.warn(`[Hook Dev] Unhandled constants key "${key}". Passing to SvelteKit.`);
                     return resolve(event); // Let SvelteKit handle if structure is unknown
                 }
            } else {
                serverLogger.warn(`[Hook Dev] Unhandled R2 key structure for local mapping: ${key}`);
                return resolve(event); // Let SvelteKit handle if structure is unknown
            }

            serverLogger.log(`[Hook Dev] Attempting to read local file: ${localFilePath}`);

            // Check if file exists
            try {
                 await fs.access(localFilePath); // Check existence first
            } catch (accessError) {
                 serverLogger.warn(`[Hook Dev] Local file not found or inaccessible: ${localFilePath}`);
                 return new Response('Not Found (Local Dev)', { status: 404 });
            }


            // Handle HEAD request for existence check
            if (event.request.method === 'HEAD') {
                 serverLogger.log(`[Hook Dev] HEAD request successful for local file: ${localFilePath}`);
                 const stats = await fs.stat(localFilePath);
                 const headers = new Headers();
                 headers.set('Content-Length', stats.size.toString());
                 const contentType = getContentType(localFilePath); // Use helper
                 if (contentType) {
                    headers.set('Content-Type', contentType);
                 }
                 headers.set('Accept-Ranges', 'bytes');
                 // Add other headers like ETag if needed, based on file stats
                 return new Response(null, { status: 200, headers });
            }

            // Handle GET request to serve the file content
            if (event.request.method === 'GET') {
                serverLogger.log(`[Hook Dev] GET request: Reading local file: ${localFilePath}`);
                 const fileContent = await fs.readFile(localFilePath);
                 const headers = new Headers();
                 const contentType = getContentType(localFilePath); // Use helper
                 if (contentType) {
                    headers.set('Content-Type', contentType);
                 }
                 headers.set('Content-Length', fileContent.length.toString());
                 // Add Cache-Control, ETag etc. if desired for dev
                 serverLogger.log(`[Hook Dev] Serving local file ${localFilePath} with type ${contentType}`);
                 return new Response(fileContent, { status: 200, headers });
            }

             // Method not allowed for local files via this hook
            serverLogger.warn(`[Hook Dev] Method ${event.request.method} not allowed for local file: ${localFilePath}`);
            return new Response('Method Not Allowed (Local Dev)', { status: 405 });

        } catch (error) {
            serverLogger.error('[Hook Dev] Error serving local file:', error);
            return new Response('Internal Server Error (Local Dev Hook)', { status: 500 });
        }
    }
    // --- END: Development Mode R2 Emulation for /directr2/ ---

    // --- START: Production Mode R2 Handling ---
    // Handle R2 requests ONLY in production OR if not specifically a /directr2/ dev request
    // This block now handles paths like /images/, /constants/ etc. ONLY in production
    const isProdAssetPath = !dev && (
        pathname.startsWith('/images/') ||
        pathname.startsWith('/constants/') ||
        pathname === '/favicon.ico' ||
        pathname === '/apple-touch-icon.png' ||
        pathname === '/site.webmanifest'
    );
    const isProdDirectR2Path = !dev && pathname.startsWith('/directr2/');

    if (isProdDirectR2Path || isProdAssetPath) {
        // Check if platform is available (only relevant in production)
                if (!event.platform?.env?.ASSETSBUCKET) {
             serverLogger.error('[Hook Prod] R2 bucket binding not available');
                    return new Response('R2 Bucket Not Available', { status: 500 });
                }
                
                try {
             let key: string;

             // Map URL path to R2 key (same logic as before, but now only runs in prod)
              if (pathname === '/favicon.ico') key = 'constants/favicon.ico';
              else if (pathname === '/apple-touch-icon.png') key = 'constants/apple-touch-icon.png';
              else if (pathname === '/site.webmanifest') key = 'constants/site.webmanifest';
              else if (pathname === '/images/favicon.png') key = 'constants/favicon.png';
              else if (pathname.startsWith('/directr2/')) {
                let rawKey = pathname.substring('/directr2/'.length);
                // Decode URL-encoded paths in the key if it's for works
                if (rawKey.startsWith('works/')) {
                  // We don't decode the full key, just the portion after 'works/'
                  const prefix = 'works/';
                  const relativePath = rawKey.substring(prefix.length);
                  const decodedPath = decodeURIComponent(relativePath);
                  key = prefix + decodedPath;
                } else {
                  key = rawKey;
                }
              }
              else if (pathname.startsWith('/images/portfolio/')) key = 'portfolio/' + pathname.substring('/images/portfolio/'.length);
              else if (pathname.startsWith('/images/constants/')) key = 'constants/' + pathname.substring('/images/constants/'.length);
              else if (pathname.startsWith('/images/blog/')) {
                   const requestedFile = pathname.substring('/images/blog/'.length);
                   key = 'blog/' + requestedFile; // Simpler mapping for prod
              }
              else if (pathname.startsWith('/constants/')) key = 'constants/' + pathname.substring('/constants/'.length);
              else {
                   // Should not happen given the isProdAssetPath check, but good to have a fallback
                  serverLogger.error(`[Hook Prod] URL pattern not recognized: ${pathname}`);
                  return new Response('Not Found', { status: 404 });
              }

              serverLogger.log(`[Hook Prod] Attempting R2 access for key: ${key} via path ${pathname}`);

                    const R2Bucket = event.platform.env.ASSETSBUCKET as IR2Bucket;

              // HEAD Request
              if (event.request.method === 'HEAD') {
                    const headResult = await R2Bucket.head(key);
                    if (!headResult) {
                       serverLogger.warn(`[Hook Prod] HEAD - Object not found for key: ${key}`);
                        return new Response(`Object not found: ${key}`, { status: 404 });
                    }
                        serverLogger.log(`[Hook Prod] HEAD request successful for key: ${key}. Returning 200 OK.`);
                        const headers = new Headers();
                        headers.set('etag', headResult.httpEtag);
                   const contentType = getContentType(key);
                   if (contentType) headers.set('Content-Type', contentType);
                        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                        return new Response(null, { status: 200, headers });
                    }
                    
              // GET Request
                    else if (event.request.method === 'GET') {
                        const obj = await R2Bucket.get(key);
                        if (!obj) {
                       serverLogger.warn(`[Hook Prod] GET - Object not found for key: ${key}`);
                       return new Response(`Object not found: ${key}`, { status: 404 });
                        }
                   serverLogger.log(`[Hook Prod] Streaming GET response for key: ${key}`);
                        const headers = new Headers();
                   obj.writeHttpMetadata(headers);
                        headers.set('etag', obj.httpEtag);
                        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                        return new Response(obj.body, { headers });
                    }
                    
              // Other methods
                    else {
                         serverLogger.warn(`[Hook Prod] Method ${event.request.method} not allowed for key: ${key}`);
                         return new Response('Method Not Allowed', { status: 405 });
                    }

                } catch (error) {
              serverLogger.error('[Hook Prod] R2 error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
        }
    }
    // --- END: Production Mode R2 Handling ---

    // If none of the above conditions were met, let SvelteKit handle the request normally
    serverLogger.log(`[Hook] Path "${pathname}" not handled by custom R2 logic, passing to SvelteKit resolver.`);
    return resolve(event);
};

// Add explicit error handling
export const handleError = async ({ error, event }) => {
    const serverLogger = createServerLogger(event.platform?.env);
    serverLogger.error('[handleError] SvelteKit error handler invoked with:', {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        url: event.url.pathname,
        routeId: event.route.id
    });
    
    // Return an object that conforms to App.Error
    return {
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
};

// Helper function to get the local path for a key
function getLocalPath(key: string): string | null {
    if (key.startsWith('portfolio/')) {
        return `/src/images/Portfolio/${key.substring('portfolio/'.length)}`;
    } else if (key.startsWith('blog/')) {
        const blogPath = key.substring('blog/'.length); // Extract path part, e.g., "night-photo/header.webp"
        // Construct path relative to the 'posts' directory
        return `/src/content/blog/posts/${blogPath}`;
    } else if (key.startsWith('constants/')) {
        return `/public/images/${key.substring('constants/'.length)}`;
    }
    return null;
}

// Helper function to determine Content-Type from file extension
function getContentType(filePathOrKey: string): string | undefined {
    const ext = filePathOrKey.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'webmanifest': 'application/manifest+json',
        'md': 'text/markdown; charset=utf-8'
        // Add more types as needed
    };
    return types[ext || ''];
}

// Removed the unused getLocalPath function
// --- END Helper Functions ---

// --- START Diagnostics Endpoint (Optional) ---
// You might want to keep or remove this depending on your needs
async function handleDiagnostics({ event }: { event: any }): Promise<Response> {
    const serverLogger = createServerLogger(event.platform?.env);
    serverLogger.log("[Diagnostics] Running diagnostics...");
    // Add actual diagnostic logic here
    const diagnosticsData = { message: "Diagnostics endpoint needs implementation." }; 
    return new Response(JSON.stringify(diagnosticsData), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
    });
} 