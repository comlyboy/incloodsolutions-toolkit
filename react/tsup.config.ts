import { defineConfig } from "tsup";

// export default defineConfig({
// 	entry: ["src/index.ts"],
// 	format: ['esm'],
// 	dts: true,
// 	sourcemap: true,
// 	clean: true,
// 	minify: false,
// 	treeshake: true,
// 	splitting: false,
// 	target: "es2020",
// 	esbuildOptions: (options) => {
// 		// options.sourcemap = "inline";
// 		options.keepNames = true;
// 	},
// 	skipNodeModulesBundle: true,
// 	platform: "browser",
// 	external: ["react", "react-dom", "react-router-dom"] // Don't bundle peer deps
// });

// import { defineConfig } from "tsup";

export default defineConfig([
	{
		// entry: ['src/**/*.ts'],
		entry: ['src/**/*.{ts,tsx}'],
		// entry: ['src/index.ts'],
		format: ['esm'],
		target: 'es2022',
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