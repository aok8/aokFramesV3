import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [
		sveltekit(),
		{
			name: 'copy-worker',
			generateBundle() {
				this.emitFile({
					type: 'asset',
					fileName: 'workers/r2-image-worker.js',
					source: resolve(__dirname, 'workers', 'r2-image-worker.js'),
				});
			},
		},
	],
	// Configure for Cloudflare Workers environment
	build: {
		// Ensure sourcemaps are readable by Cloudflare
		sourcemap: true,
		// Adjust for Cloudflare's requirements
		target: 'es2020',
	},
	// Handle special Cloudflare globals
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
	},
	// Add static file handling for development
	server: {
		fs: {
			allow: [
				'src/images',
				'src/content/blog/images',
				'public/images'
			]
		}
	}
});
