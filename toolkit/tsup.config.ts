import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		noExternal: ['uuid'],
	}
]);