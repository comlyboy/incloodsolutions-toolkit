import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
	plugins: [
		dts({
			insertTypesEntry: true,
		}),
	],

	build: {
		outDir: 'dist',
		minify: false,
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'IncloodSolutionsToolkit',
			fileName: 'index',
		},
		rollupOptions: {
			external: ['tslib'],
		}
	}
});