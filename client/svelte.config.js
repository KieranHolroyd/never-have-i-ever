import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			runtime: 'nodejs22.x'
		}),
		// Optimize asset handling
		inlineStyleThreshold: 1024 // Inline small CSS files
	},
	// Vite plugin configuration for Svelte
	vitePlugin: {
		// Optimize inspector (disable in production)
		inspector: {
			toggleKeyCombo: 'meta-shift',
			showToggleButton: 'never'
		}
	}
};

export default config;
