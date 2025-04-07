import { build } from 'esbuild';
import TsconfigPathsPlugin from '@esbuild-plugins/tsconfig-paths';

build({
	keepNames: true,
	entryPoints: ['src/**/*.ts'],
	bundle: false,
	outdir: 'dist',
	format: 'esm',
	sourcemap: true,
	plugins: [TsconfigPathsPlugin({})],
	platform: 'node',
	target: 'node18'
}).catch(() => { });
