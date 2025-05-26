import { CountryCode, TimezoneName } from "countries-and-timezones";

export interface IBaseId<TType = string> {
	id: TType;
}

export interface IBaseName {
	name: string;
}

export interface IBaseEntityName<TEntity> {
	entityName: TEntity;
}

export interface IBaseRoles {
	roles: string[];
}

export interface IBaseTimestamp {
	timestamp: string;
}

export interface IBaseRecordProgress<TProgress> {
	progress: TProgress[];
}

export interface IBaseStatus<TStatus> {
	status: TStatus;
}

export interface IBaseAmount {
	amount: number;
}

export interface IBaseDescription {
	description: string;
}

export interface IBasePassword {
	password: string;
}

export interface IBaseReferenceId {
	referenceId: string;
}

export interface IBaseConstruct extends IBaseEnableDebug { }

export interface IBaseBusiness<TBusiness extends ObjectType = any> {
	businessId: string;
	business?: TBusiness;
}

export interface IBaseStore<TStore extends ObjectType = any> {
	storeId: string;
	store?: TStore;
}

export interface IBaseCustomer<TCustomer extends ObjectType = any> {
	customerId: string;
	customer?: TCustomer;
}

export interface IBaseDelete<TDeleter extends ObjectType = any> {
	isDeleted: boolean;
	deletedAtDate?: string;
	deletedByUserId?: string;
	deletedBy?: TDeleter;
}

export interface IBaseCreator<TCreator extends ObjectType = any> {
	createdAtDate: string;
	createdByUserId?: string;
	createdBy?: TCreator;
}

export interface IBaseEditor<TModifier extends ObjectType = any> {
	lastModifiedAtDate?: string;
	lastModifiedByUserId?: string;
	lastModifiedBy?: TModifier;
}

export interface IBaseEnableDebug {
	/** Enable debuging mode */
	enableDebug: boolean;
}

export interface IBaseEnvironmentVariable {
	NODE_ENV: AppEnvironmentType;
	TELEGRAM_BOT_TOKEN?: string;
}

export interface IBaseErrorResponse extends IBaseTimestamp {
	path: string;
	method: string;
	message: string;
	success?: boolean;
	statusCode: number;
}

export interface IBaseCdkConstructProps<TOptions extends ObjectType = any> extends IBaseEnableDebug {
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
export type ExtractValueTypes<TEntity> = TEntity[keyof TEntity];
export type AppEnvironmentType = `${AppEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;