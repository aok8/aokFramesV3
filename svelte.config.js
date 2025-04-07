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
			routes: {
				include: ['/*'],
				exclude: []
			}
		}),
		// Add proper handling for client-side routes
		paths: {
			base: ''
		}
	},

	extensions: ['.svelte', '.svx']
};

export default config;
