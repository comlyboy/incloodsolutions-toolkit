
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from 'glob';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

import packageJSON from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [tsconfigPaths(), react(), dts({ rollupTypes: true })],
	build: {
		cssCodeSplit: true,
		target: 'esnext',
		minify: true,
		emptyOutDir: true,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, join('src', 'index.ts')),
			formats: ['es'],
		},
		rollupOptions: {
			input: Object.fromEntries(
				glob
					.sync('src/**/*.{ts,tsx}', {
						ignore: [
							'src/**/*.stories.tsx',
							'src/**/*.test.{ts,tsx}',
							'src/**/*.{md,mdx}',
							'src/docs/**/*',
							'src/**/types/*.ts',
							'src/**/types.ts',
							'src/vitest.setup.ts',
							'src/test/**/*',
							'src/**/*.d.ts',
							...glob.sync('src/**/index.ts', {
								ignore: ['src/index.ts'],
							}),
						],
					})
					.map((file) => [
						// The name of the entry point
						// src/nested/foo.ts becomes nested/foo
						relative('src', file.slice(0, file.length - extname(file).length)),
						// The absolute path to the entry file
						// src/nested/foo.ts becomes /project/src/nested/foo.ts
						fileURLToPath(new URL(file, import.meta.url)),
					]),
			),
			output: {
				entryFileNames: '[name].js',
				assetFileNames: (assetInfo) => {
					if (!assetInfo.names) {
						return 'assets/[name][extname]';
					}

					if (assetInfo.names.includes('index.css')) {
						return 'assets/style[extname]';
					}

					return 'assets/[name].module[extname]';
				},
				manualChunks: Object.keys(packageJSON.dependencies).reduce(
					(chunks, dependency) => {
						return {
							...chunks,
							[`dependencies/${dependency.replace('@', '').replace('/', '-')}`]: [dependency],
						}
					}, {}),
			},
			external: [
				'react/jsx-runtime',
				...Object.keys(packageJSON.peerDependencies),
			],
		},
	},
});
