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
		{
			name: 'markdown',
			transform(code, id) {
				if (!id.endsWith('.md?raw')) return null;
				
				// Remove the ?raw suffix for processing
				const actualId = id.slice(0, -4);
				if (!actualId.endsWith('.md')) return null;

				// Read the markdown file
				const fs = require('fs');
				const content = fs.readFileSync(actualId, 'utf-8');
				
				return {
					code: `export default ${JSON.stringify(content)};`,
					map: null
				};
			}
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
