export interface IErrorResponse {
	statusCode: number;
	timestamp: string,
	method: string;
	path: string;
	message: string;
}

export enum ApplicationEnvironmentEnum {
	DEVELOPMENT = 'development',
	PRODUCTION = 'production',
	STAGING = 'staging'
}

export type ApplicationEnvironmentType = `${ApplicationEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;
