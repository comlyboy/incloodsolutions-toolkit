import { ObjectType } from "src/interfaces";

require('dotenv').config();

const cachedEnvironmentVariables: ObjectType<string, string> = {};

export function initEnvironmentVariables<TSchema extends ObjectType>(validation: TSchema, importantFields: (keyof TSchema)[] = []) {
	Object.entries(process.env).forEach(([key, envValue]) => {
		if (!envValue && importantFields.includes(key)) {
			throw new Error(`Environment variable " ${key} " cannot be null/undefined!`);
		}
		cachedEnvironmentVariables[key] = envValue;
	});
	return cachedEnvironmentVariables as TSchema;
}
