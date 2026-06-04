import { defineConfig } from 'tsup';

	export default defineConfig([
		{
			// entry: ['src/**/*.ts'],
			entry: ['src/index.ts'],
			format: ["cjs"],
			platform: 'node',
			target: "es2022",
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