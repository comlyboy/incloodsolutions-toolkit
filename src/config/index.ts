import { IBaseEnableDebug, IBaseEnvironmentVariable, ObjectType } from "../interface";

const cachedEnvironmentVariables: ObjectType = {} as const;

/** Initialize environment variable, no dotenv library */
export function initEnvironmentVariables<TSchema extends ObjectType = any>(schema: {
	[key in keyof Partial<TSchema & IBaseEnvironmentVariable>]: {
		required?: boolean;
		defaultValue?: number | string | boolean;
	};
}, options?: { envPath?: string; includeAllVariables?: boolean; } & Partial<IBaseEnableDebug>) {
	const redColor = '\x1b[31m';
	const resetColor = '\x1b[0m';
	const cyanColor = "\x1b[36m";
	const grayColor = "\x1b[90m";
	const greenColor = '\x1b[32m';
	const yellowColor = "\x1b[33m";

	Object.entries(schema).map(([key, config]) => {
		const envValue = process?.env[key];
		if (!envValue && config?.required && !config?.defaultValue) {
			throw new Error(`${greenColor}[ENV Error]${resetColor} | ${redColor} Environment variable "${key}" cannot be null/undefined!${resetColor}`);
		}
		const finalValue = envValue || config?.defaultValue;
		cachedEnvironmentVariables[key] = finalValue;

		if (options?.enableDebug && process?.env?.NODE_ENV !== 'production') {
			console.log(
				`${greenColor}[ENV]${resetColor} ${yellowColor}${key.padEnd(20)}${resetColor} | ${greenColor}Value:${resetColor} ${yellowColor}${String(finalValue).padEnd(30)}${resetColor} | ${greenColor}Source:${resetColor} ${envValue !== undefined ? `${cyanColor}process.env${resetColor}` : `${grayColor}defaultValue${resetColor}`}`
			);
		}
	});
	return { ...options?.includeAllVariables ? process?.env : {}, ...cachedEnvironmentVariables } as TSchema & IBaseEnvironmentVariable & ObjectType<string | number>;
}
