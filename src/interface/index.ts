import { Document, ObjectId } from "mongoose";
import { CountryCode, TimezoneName } from "countries-and-timezones";

/** Base interface for objects with an ID of generic type */
export interface IBaseId<TType = string> {
	/** Unique identifier */
	id: TType;
}

/** Base interface for objects with a name property */
export interface IBaseName {
	/** Name of the entity */
	name: string;
}

/** Base interface for objects that have a referenced entity name */
export interface IBaseEntityName<TEntity> {
	/** Name of the related entity */
	entityName: TEntity;
}

/** Base interface for objects with a list of roles */
export interface IBaseRoles {
	/** List of assigned roles */
	roles: string[];
}

/** Base interface for timestamped entities */
export interface IBaseTimestamp {
	/** Timestamp of the entity */
	timestamp: string;
}

/** Base interface for tracking progress using an array of progress items */
export interface IBaseRecordProgress<TProgress> {
	/** Array of progress records */
	progress: TProgress[];
}

/** Base interface for tracking status using a generic type */
export interface IBaseStatus<TStatus> {
	/** Current status */
	status: TStatus;
}

/** Base interface for monetary or numeric amounts */
export interface IBaseAmount {
	/** Numeric amount */
	amount: number;
}

/** Base interface for objects with a description */
export interface IBaseDescription {
	/** Textual description */
	description: string;
}

/** Base interface for objects containing a password */
export interface IBasePassword {
	/** Password string */
	password: string;
}

/** Base interface for referenceable entities */
export interface IBaseReferenceId {
	/** Reference ID string */
	referenceId: string;
}

/** Base interface that enables debugging features */
export interface IBaseConstruct extends IBaseEnableDebug { }

/** Base interface for objects associated with a business entity */
export interface IBaseBusiness<TBusiness extends ObjectType = any> {
	/** ID of the business */
	businessId: string;
	/** Optional full business object */
	business?: TBusiness;
}

/** Base interface for objects associated with a store entity */
export interface IBaseStore<TStore extends ObjectType = any> {
	/** ID of the store */
	storeId: string;
	/** Optional full store object */
	store?: TStore;
}

/** Base interface for objects associated with a customer entity */
export interface IBaseCustomer<TCustomer extends ObjectType = any> {
	/** ID of the customer */
	customerId: string;
	/** Optional full customer object */
	customer?: TCustomer;
}

/** Base interface for soft-deletable entities */
export interface IBaseDelete<TDeleter extends ObjectType = any> {
	/** Indicates whether the item is deleted */
	isDeleted: boolean;
	/** Timestamp of deletion */
	deletedAtDate?: string;
	/** ID of the user who deleted the item */
	deletedByUserId?: string;
	/** Optional full user object who performed deletion */
	deletedBy?: TDeleter;
}

/** Base interface for tracking creator metadata */
export interface IBaseCreator<TCreator extends ObjectType<any> = any> {
	/** Timestamp of creation */
	createdAtDate: string;
	/** ID of the user who created the item */
	createdByUserId?: string;
	/** Optional full user object who created the item */
	createdBy?: TCreator;
}

/** Base interface for tracking last modified metadata */
export interface IBaseEditor<TModifier extends ObjectType = any> {
	/** Timestamp of the last modification */
	lastModifiedAtDate?: string;
	/** ID of the user who last modified the item */
	lastModifiedByUserId?: string;
	/** Optional full user object who modified the item */
	lastModifiedBy?: TModifier;
}

/** Base interface for enabling debug mode */
export interface IBaseEnableDebug {
	/** Enable debugging mode */
	enableDebug: boolean;
}

/** Interface representing application environment variables */
export interface IBaseEnvironmentVariable {
	/** Current environment (e.g. development, production) */
	NODE_ENV: AppEnvironmentType;
	/** Optional Telegram bot token */
	TELEGRAM_BOT_TOKEN?: string;
}

/** Base structure for HTTP error responses */
export interface IBaseErrorResponse extends IBaseTimestamp {
	/** HTTP path where the error occurred */
	path: string;
	/** HTTP method used (GET, POST, etc.) */
	method: string;
	/** Error message */
	message: string;
	/** Optional success flag */
	success?: boolean;
	/** HTTP status code */
	statusCode: number;
}

/** Base interface for CDK construct configuration */
export interface IBaseCdkConstructProps<TOptions extends ObjectType = any> extends Readonly<Partial<IBaseEnableDebug>> {
	/** Deployment stage/environment */
	readonly stage?: AppEnvironmentType;
	/** Additional construct options */
	readonly options?: Readonly<TOptions>;
	/** Optional stack name */
	readonly stackName?: string;
	/** Optional application name */
	readonly appName?: string;
}

/** Supported application environments */
export enum AppEnvironmentEnum {
	QA = 'qa',
	TEST = 'test',
	LOCAL = 'local',
	STAGING = 'staging',
	PRODUCTION = 'production',
	DEVELOPMENT = 'development'
}

/** Alias for IANA timezone names */
export type TimezoneType = TimezoneName;

/** Alias for ISO country codes */
export type CountryCodeType = CountryCode;

/** Extracts value types from a given entity object */
export type ExtractValueTypes<TEntity> = TEntity[keyof TEntity];

/** Literal string type of AppEnvironmentEnum values */
export type AppEnvironmentType = `${AppEnvironmentEnum}`;

/** Generic key-value object type */
export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;

/**
 * Represents a MongoDB identifier, which can either be an ObjectId or a string.
 */
export type MongoIdType = ObjectId | string;

/**
 * Represents a generic MongoDB document of a specific type.
 * @template TType - The type of the document's content, defaults to `string`.
 */
export type MongoDocumentType<TType = string> = Document<TType>;

/**
 * Describes sorting directions for queries.
 * - `'ascending'` means lowest to highest.
 * - `'descending'` means highest to lowest.
 */
export type SortType = 'descending' | 'ascending';
