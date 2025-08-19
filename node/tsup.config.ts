import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	minify: false,
	treeshake: true,
	splitting: false,
	target: "es2024",
	esbuildOptions: (options) => {
		// options.sourcemap = "inline";
		options.keepNames = true;
	},
	skipNodeModulesBundle: true,
	external: ["tslib"],
});