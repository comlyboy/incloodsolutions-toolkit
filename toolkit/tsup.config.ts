import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

/**
 * One bundle per public module, so a consumer imports only the area they use.
 * Subpaths mirror the source folder, e.g. `@incloodsolutions/toolkit/validator`
 * → `src/validator/index.ts`.
 *
 * There is no package-root export in `package.json` — consumers must import a
 * specific subpath so nothing pulls the whole package by accident. The `index`
 * bundle is still built (it is the test aggregation point) but is unreachable
 * by the package name.
 */
export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		noExternal: ['uuid'],
		// Keep every dependency external (axios, handlebars, zod, …) — never
		// bundle them. See `test/esm-bundle.spec.ts`.
		skipNodeModulesBundle: true,
		entry: {
			// Built but NOT exported from package.json — see the note above.
			index: 'src/index.ts',

			constant: 'src/constant/index.ts',
			error: 'src/error/index.ts',
			utility: 'src/utility/index.ts',
			validator: 'src/validator/index.ts',
			interface: 'src/interface/index.ts',
		},
	}
]);
