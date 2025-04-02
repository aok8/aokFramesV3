import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
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
		}
	]
});
