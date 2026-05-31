import { defineConfig } from 'tsup';

// export default defineConfig({
// 	entry: ["src/index.ts"],

// 	format: ["cjs", "esm"], // keep both
// 	target: "node18",
// 	dts: true,
// 	sourcemap: true,
// 	clean: true,

// 	bundle: true, // 🔥 important
// 	splitting: false,
// 	treeshake: true,

// 	external: [
// 		"express",
// 		/^@aws-sdk\//,
// 		"mongoose",
// 		"aws-cdk-lib",
// 		"@incloodsolutions/toolkit"
// 	],

// 	noExternal: [
// 		// optionally force bundle problematic deps if any appear later
// 	],

// 	esbuildOptions: (options) => {
// 		options.keepNames = true;
// 	},
// });

	export default defineConfig([
		// 🔹 CJS build (Lambda + Node safe)
		{
			entry: ['src/**/*.ts'],
			// entry: ['src/index.ts'],
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
			// noExternal: [
				// "@incloodsolutions/toolkit"
			// ],
			external: ["tslib"],
			keepNames: true,
			esbuildOptions(options) {
				options.keepNames = true;
				options.logLevel = 'error';
			},
		}
	]);