import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ['src/index.ts'],
		format: ["cjs", 'esm'],
		target: 'es2020',
		dts: true,
		sourcemap: true,
		clean: true,
		bundle: true,
		splitting: false,
		treeshake: true,
		minify: false,
		keepNames: true,
		external: ['tslib'],
		noExternal: ['uuid'],
		esbuildOptions(options) {
			options.keepNames = true;
			options.logLevel = 'error';
		}
	}
]);