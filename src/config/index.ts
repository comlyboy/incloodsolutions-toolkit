import { ObjectType } from "src/interface";

const cachedEnvironmentVariables: ObjectType = {
	...process?.env
};

/** Initialize environment variable, no dotenv library */
export function initEnvironmentVariables<TSchema extends ObjectType>(schema: {
	[key in keyof Partial<TSchema>]: {
		required: boolean;
		defaultValue?: number | string | boolean | ObjectType;
	};
}, options?: { debug?: boolean; }) {
	Object.entries(schema).map(([key, config]) => {
		const envValue = process?.env[key];
		if (!envValue && config?.required && !config?.defaultValue) {
			throw new Error(`Environment variable "${key}" cannot be null/undefined!`);
		}
		const finalValue = envValue || config?.defaultValue;
		cachedEnvironmentVariables[key] = finalValue;

		if (options?.debug && process?.env?.NODE_ENV !== 'production') {
			console.log(
				`[DEBUG] ENV: ${key} | Value: ${finalValue !== undefined ? JSON.stringify(finalValue) : "undefined"
				} | Source: ${envValue !== undefined ? "process.env" : "defaultValue"}`
			);
		}

	});
	return cachedEnvironmentVariables as TSchema & ObjectType;
}