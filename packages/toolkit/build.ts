import TsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';
import { build } from 'esbuild';

build({
	keepNames: true,
	entryPoints: ['src/**/*.ts'],
	bundle: false,
	outdir: 'dist',
	format: 'esm',
	sourcemap: true,
	plugins: [TsconfigPathsPlugin({})],
	platform: 'node',
	target: 'node18',
}).catch(() => {});
