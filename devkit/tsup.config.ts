import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		entry: ['src/**/*.{ts,js}'],
		// entry: [
		// 	// 'src/index.ts',
		// 	'src/aws/index.ts',
		// 	// 'src/logger/index.ts',
		// 	// 'src/env/index.ts',
		// ]
	}
]);