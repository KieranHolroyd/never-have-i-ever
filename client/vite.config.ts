import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: false // Disable auto-install for faster builds
		})
	],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	},
	build: {
		// Optimize chunk splitting for better caching
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Only chunk for client-side code, not SSR
					if (id.includes('node_modules')) {
						// Chunk svelte core separately
						if (id.includes('svelte/')) {
							return 'svelte-vendor';
						}
						// Chunk icons separately
						if (id.includes('lucide-svelte')) {
							return 'icons';
						}
					}
				}
			}
		},
		// Increase chunk size warning limit (default is 500kb)
		chunkSizeWarningLimit: 1000,
		// Use esbuild for faster minification (default, faster than terser)
		minify: 'esbuild',
		// Improve source map generation speed
		sourcemap: false, // Disable source maps for faster builds
		// Enable CSS code splitting
		cssCodeSplit: true,
		// Target modern browsers for smaller bundles
		target: 'es2020'
	},
	esbuild: {
		// Drop console and debugger statements in production
		drop: ['console', 'debugger']
	},
	optimizeDeps: {
		// Pre-bundle dependencies for faster dev server startup
		include: [
			'uuid',
			'lucide-svelte',
			'svelte-outside-click'
		],
		// Exclude packages that don't need optimization
		exclude: ['$app']
	},
	// Improve resolution performance
	resolve: {
		dedupe: ['svelte']
	}
});
