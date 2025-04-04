import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const pathname = event.url.pathname;

    // Handle image and blog post requests
    if (pathname.startsWith('/images/') || pathname.startsWith('/blog/')) {
        try {
            let key: string;
            
            // Map the URL path to the correct R2 key
            if (pathname.startsWith('/images/portfolio/')) {
                key = 'images/portfolio/' + pathname.substring('/images/portfolio/'.length);
            } else if (pathname.startsWith('/images/blog/images/')) {
                key = 'blog/images/' + pathname.substring('/images/blog/images/'.length);
            } else if (pathname.startsWith('/blog/')) {
                key = 'blog/posts/' + pathname.substring('/blog/'.length);
            } else {
                return new Response('Not Found', { status: 404 });
            }

            // Get the object from R2
            const object = await event.platform?.env.ASSETS.get(key);

            if (!object) {
                return new Response('Not Found', { status: 404 });
            }

            // Set appropriate headers based on content type
            const headers = new Headers();
            if (pathname.startsWith('/blog/')) {
                headers.set('Content-Type', 'text/markdown; charset=utf-8');
                headers.set('Cache-Control', 'public, max-age=86400');
                return new Response(await object.text(), { headers });
            } else {
                object.writeHttpMetadata(headers);
                headers.set('etag', object.httpEtag);
                headers.set('Cache-Control', 'public, max-age=31536000');
                return new Response(object.body, { headers });
            }
        } catch (error) {
            console.error('R2 error:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    // For all other requests, proceed normally
    return resolve(event);
}; 