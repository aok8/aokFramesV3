import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],

	kit: {
		// Using Cloudflare adapter for Cloudflare Pages deployment
		adapter: adapter({
			// Ensure we're using the correct target for Cloudflare
			// Static files (JS/CSS chunks under /_app, files in /static) are served straight from
			// Cloudflare's asset store. With `exclude: []` every one of them also went through the
			// worker first, adding a function invocation and latency to each request.
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		// Add proper handling for client-side routes
		paths: {
			base: ''
		},
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Log all prerendering errors
				console.warn(`PRERENDER ERROR [${path}] (referred from ${referrer}): ${message}`);
				
				// Don't fail build on HTTP errors
				return false;
			}
		}
	},

	extensions: ['.svelte', '.svx']
};

export default config;
