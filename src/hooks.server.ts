import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;

    // Handle image and blog post requests
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
                return new Response('Not Found', { status: 404 });
            }

            // Get the object from R2
            const object = await event.platform?.env.ASSETS.get(key);

            if (!object) {
                console.error(`R2 object not found: ${key}`);
                return new Response('Not Found', { status: 404 });
            }

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
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    // For all other requests, proceed normally
    return resolve(event);
}; 