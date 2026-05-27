import { defineConfig } from "tsup";

export default defineConfig([
	// 🔹 CJS build (Lambda + Node safe)
	{
		entry: ['src/**/*.ts'],
		format: ["cjs"],
		target: "node18",
		dts: true,
		sourcemap: true,
		clean: true,
		bundle: true,
		splitting: false,
		treeshake: true,
		minify: true,
		noExternal: ["uuid", 'lodash.clonedeep'],
		external: ["tslib"],
		esbuildOptions(options) {
			options.keepNames = true;
		},
	},

	// 🔹 ESM build (modern environments)
	{
		entry: ['src/**/*.ts'],
		format: ["esm"],
		target: "es2020",
		dts: true,
		sourcemap: true,
		bundle: true,
		splitting: false,
		treeshake: true,
		minify: true,
		noExternal: ["uuid", 'lodash.clonedeep'],
		external: ["tslib"],
		esbuildOptions(options) {
			options.keepNames = true;
		},
	},
]);