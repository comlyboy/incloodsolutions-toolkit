export enum ApplicationEnvironmentEnum {
	QA = 'qa',
	TEST = 'test',
	LOCAL = 'local',
	STAGING = 'staging',
	PRODUCTION = 'production',
	DEVELOPMENT = 'development'
}
export type ApplicationEnvironmentType = `${ApplicationEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;
// export type EnumToStringType<TType = any> = `${TType[keyof TType]}`;
