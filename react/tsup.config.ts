// import { defineConfig } from "tsup";

// export default defineConfig([
// 	{
// 		entry: ['src/index.ts'],
// 		format: ['esm'],
// 		target: 'es2022',
// 		// Bundle the whole public type surface into a single `dist/index.d.ts`.
// 		dts: true,
// 		sourcemap: true,
// 		clean: true,
// 		bundle: true,
// 		splitting: false,
// 		treeshake: true,
// 		minify: false,
// 		platform: 'browser',
// 		keepNames: true,
// 		external: ["tslib", "react", "react-dom", "react-router-dom"],
// 		esbuildOptions(options) {
// 			options.keepNames = true;
// 			options.logLevel = 'error';
// 		}
// 	}
// ]);

import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

/**
 * One bundle per public module, so a consumer imports only the area they use.
 * Subpaths mirror the source folder, e.g. `@incloodsolutions/react-toolkit/validators`
 * → `src/validators/index.ts`.
 *
 * There is no package-root export in `package.json` — consumers must import a
 * specific subpath so nothing pulls the whole package (and all of `usehooks-ts`
 * and `react-use`) by accident. The `index` bundle is still built (it is the
 * aggregation point for the type build) but is unreachable by the package name.
 *
 * ESM only, with every dependency left external.
 */
export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		format: ['esm'],
		external: [...tsupBaseConfig.external, "react", "react-dom"],
		skipNodeModulesBundle: true,
		platform: 'browser',
		entry: {
			// Built but NOT exported from package.json — see the note above.
			index: 'src/index.ts',

			hooks: 'src/hooks/index.ts',
			utilities: 'src/utilities/index.ts',
			validators: 'src/validators/index.ts',
			types: 'src/types/index.ts',
		},
	}
]);
