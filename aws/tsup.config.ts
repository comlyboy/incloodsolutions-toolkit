import { defineConfig } from 'tsup';

export default defineConfig([
	// 🔹 CJS build (Lambda + Node safe)
	{
		entry: ['src/**/*.ts'],
		format: ["cjs"],
		platform: 'node',
		target: "node18",
		dts: true,
		sourcemap: true,
		clean: true,
		bundle: true,
		splitting: false,
		treeshake: true,
		minify: false,
		noExternal: [
			"@incloodsolutions/toolkit"
		],
		external: ["tslib"],
		keepNames:true,
		esbuildOptions(options) {
			options.keepNames = true;
		},
	}
]);