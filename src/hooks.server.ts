import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;

    // Handle image requests
    if (pathname.startsWith('/images/')) {
        try {
            // Check if R2 is available
            if (!event.platform?.env?.ASSETS) {
                console.error('R2 binding not found. Check Cloudflare Pages configuration.');
                return new Response('Service Unavailable', { status: 503 });
            }

            let key: string;
            
            // Map the URL path to the correct R2 key
            if (pathname.startsWith('/images/portfolio/')) {
                key = 'portfolio/' + pathname.substring('/images/portfolio/'.length);
            } else if (pathname.startsWith('/images/constants/')) {
                key = 'constants/' + pathname.substring('/images/constants/'.length);
            } else {
                console.warn(`Invalid image path requested: ${pathname}`);
                return new Response('Not Found', { status: 404 });
            }

            console.log(`Fetching R2 object: ${key}`);
            const object = await event.platform.env.ASSETS.get(key);

            if (!object) {
                console.error(`R2 object not found: ${key}`);
                return new Response('Not Found', { status: 404 });
            }

            // Set appropriate headers
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000');
            
            return new Response(object.body, { headers });
        } catch (error) {
            console.error('R2 error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    // For all other requests, proceed normally
    const response = await resolve(event);
    return response;
}; 