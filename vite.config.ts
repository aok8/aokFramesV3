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
	]
});
