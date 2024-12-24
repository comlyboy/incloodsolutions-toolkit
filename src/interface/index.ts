
export interface IBaseId<TType = string> {
	id: TType;
}

export interface IBaseName {
	name: string;
}

export interface IBasePassword {
	password: string;
}

export interface IBaseConstructProps<TOptions extends ObjectType = any> {
	readonly stage?: AppEnvironmentType;
	readonly options?: TOptions;
	readonly stackName?: string;
}

export enum AppEnvironmentEnum {
	QA = 'qa',
	TEST = 'test',
	LOCAL = 'local',
	STAGING = 'staging',
	PRODUCTION = 'production',
	DEVELOPMENT = 'development'
}

export type AppEnvironmentType = `${AppEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;