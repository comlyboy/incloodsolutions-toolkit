import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ['esm'],
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
	platform: "browser",
	external: ["react", "react-dom", "react-router-dom"] // Don't bundle peer deps
});