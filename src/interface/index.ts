import { CountryCode, TimezoneName } from "countries-and-timezones";

export interface IBaseId<TType = string> {
	id: TType;
}

export interface IBaseName {
	name: string;
}

export interface IBaseRoles {
	roles: string[];
}

export interface IBaseTimestamp {
	timestamp: string;
}

export interface IBaseStatus<TEntity> {
	status: TEntity;
}

export interface IBaseDescription {
	description: string;
}

export interface IBasePassword {
	password: string;
}

export interface IBaseEnvironmentVariable {
	NODE_ENV: AppEnvironmentType;
	TELEGRAM_BOT_TOKEN: string;
}

export interface IBaseErrorResponse {
	statusCode: number;
	timestamp: string,
	method: string;
	path: string;
	message: string;
}

export interface IBaseCdkConstructProps<TOptions extends ObjectType = any> {
	readonly stage?: AppEnvironmentType;
	readonly options?: TOptions;
	readonly stackName?: string;
	readonly appName?: string;
}

export enum AppEnvironmentEnum {
	QA = 'qa',
	TEST = 'test',
	LOCAL = 'local',
	STAGING = 'staging',
	PRODUCTION = 'production',
	DEVELOPMENT = 'development'
}

export type TimezoneType = TimezoneName;
export type CountryCodeType = CountryCode;

export type AppEnvironmentType = `${AppEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;