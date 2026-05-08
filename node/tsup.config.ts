import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ["src/index.ts"],

	format: ["cjs", "esm"], // keep both
	target: "node18",
	dts: true,
	sourcemap: true,
	clean: true,

	bundle: true, // 🔥 important
	splitting: false,
	treeshake: true,

	external: [
		"express",
		/^@aws-sdk\//,
		"@incloodsolutions/toolkit" // ✅ only your internal lib
	],

	noExternal: [
		// optionally force bundle problematic deps if any appear later
	],

	esbuildOptions: (options) => {
		options.keepNames = true;
	},
});