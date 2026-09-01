import {
	ObjectType,
	IBaseEnableDebug,
	CustomException,
} from '@incloodsolutions/toolkit';
import { IBaseEnvironmentVariable } from '../interface';

/**
 * Module-level cache of resolved variables, shared across every call so that
 * repeated `initEnvironmentVariables` calls accumulate rather than recompute.
 */
const cachedEnvironmentVariables: ObjectType = {} as const;

/**
 * Reads and validates environment variables from `process.env` against a schema,
 * without depending on `dotenv`.
 *
 * For each schema entry the value is taken from `process.env`, falling back to
 * `defaultValue`. A `required` entry with neither an env value nor a
 * `defaultValue` throws. Resolved values are cached at module scope and returned
 * merged together on every call.
 *
 * @typeParam TSchema - Shape of your environment object. The result is typed as
 *   `TSchema & IBaseEnvironmentVariable & ObjectType`.
 * @param schema - Map of variable name to its rules.
 * @param schema.<key>.required - Throw if the variable is absent and has no `defaultValue`. Defaults to `false`.
 * @param schema.<key>.defaultValue - Value used when the variable is not set in `process.env`.
 * @param options - Additional options.
 * @param options.envPath - Reserved for a future custom `.env` file path. Currently unused.
 * @param options.includeAllVariables - Spread the entire `process.env` into the
 *   result in addition to the schema keys. Defaults to `false`.
 * @param options.enableDebug - Log each resolved variable and its source
 *   (`process.env` vs `defaultValue`). Suppressed when `NODE_ENV === 'production'`.
 *   Defaults to `false`.
 * @returns The resolved, typed environment object.
 * @throws {CustomException} When a `required` variable is missing and has no default.
 *
 * @example
 * export const env = initEnvironmentVariables(
 *   {
 *     NODE_ENV: { required: true, defaultValue: 'development' },
 *     PORT: { defaultValue: 8080 },
 *     MONGO_DATABASE_URL: { required: true },
 *   },
 *   { enableDebug: true },
 * );
 */
export function initEnvironmentVariables<TSchema extends ObjectType = any>(
	schema: {
		[key in keyof Partial<TSchema & IBaseEnvironmentVariable>]: {
			required?: boolean;
			defaultValue?: number | string | boolean;
		};
	},
	options?: {
		envPath?: string;
		includeAllVariables?: boolean;
	} & Partial<IBaseEnableDebug>,
) {
	const redColor = '\x1b[31m';
	const resetColor = '\x1b[0m';
	const cyanColor = '\x1b[36m';
	const grayColor = '\x1b[90m';
	const greenColor = '\x1b[32m';
	const yellowColor = '\x1b[33m';

	Object.entries(schema).map(([key, config]) => {
		const envValue = process?.env[key];
		if (!envValue && config?.required && !config?.defaultValue) {
			throw new CustomException(
				`${greenColor}[ENV Error]${resetColor} | ${redColor} Environment variable "${key}" cannot be null/undefined!${resetColor}`,
			);
		}
		const finalValue = envValue || config?.defaultValue;
		cachedEnvironmentVariables[key] = finalValue;

		if (options?.enableDebug && process?.env?.NODE_ENV !== 'production') {
			console.log(
				`${greenColor}[ENV]${resetColor} ${yellowColor}${key.padEnd(20)}${resetColor} | ${greenColor}Value:${resetColor} ${yellowColor}${String(finalValue).padEnd(30)}${resetColor} | ${greenColor}Source:${resetColor} ${envValue !== undefined ? `${cyanColor}process.env${resetColor}` : `${grayColor}defaultValue${resetColor}`}`,
			);
		}
	});
	return {
		...(options?.includeAllVariables ? process?.env : {}),
		...cachedEnvironmentVariables,
	} as TSchema & IBaseEnvironmentVariable & ObjectType;
}
