import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ['src/index.ts'],
		format: ['esm'],
		target: 'es2022',
		// Bundle the whole public type surface into a single `dist/index.d.ts`.
		dts: true,
		sourcemap: true,
		clean: true,
		bundle: true,
		splitting: false,
		treeshake: true,
		minify: false,
		platform: 'browser',
		keepNames: true,
		external: ["tslib", "react", "react-dom", "react-router-dom"],
		esbuildOptions(options) {
			options.keepNames = true;
			options.logLevel = 'error';
		}
	}
]);
