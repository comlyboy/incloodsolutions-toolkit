import { defineConfig } from "tsup";

export default defineConfig([
	// 🔹 CJS build (Lambda + Node safe)
	{
		entry: ["src/index.ts"],
		format: ["cjs"],
		target: "node18",
		dts: true,
		sourcemap: true,
		clean: true,

		bundle: true,
		splitting: false,
		treeshake: true,
		minify: false,

		noExternal: ["uuid"],
		external: ["tslib"],

		esbuildOptions(options) {
			options.keepNames = true;
		},
	},

	// 🔹 ESM build (modern environments)
	{
		entry: ["src/index.ts"],
		format: ["esm"],
		target: "es2020",
		dts: true,

		bundle: true,
		splitting: false,
		treeshake: true,
		minify: false,

		noExternal: ["uuid"],
		external: ["tslib"],
		esbuildOptions(options) {
			options.keepNames = true;
		},
	},
]);