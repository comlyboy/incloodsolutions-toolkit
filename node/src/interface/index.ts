import { AppEnvironmentType, IBaseEnableDebug, IBaseTimestamp, ObjectType } from "@incloodsolutions/toolkit";
import { Document, ObjectId } from "mongoose";

/** Base interface that enables debugging features */
export interface IBaseConstruct extends IBaseEnableDebug { }

/**
 * Interface representing the environment variables required by the application.
 */
export interface IBaseEnvironmentVariable {
	/**
	 * MongoDB connection string (optional if not used in some environments).
	 * Example: mong)odb+srv://user:password&@@cluster.mongodb.net/dbname
	 */
	MONGO_DATABASE_URL?: string;

	/**
	 * Telegram bot token for sending or receiving messages (optional).
	 * Example: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
	 */
	TELEGRAM_BOT_TOKEN?: string;

	/**
	 * The current runtime environment.
	 * Should be one of: 'development', 'production', 'test', etc.
	 */
	NODE_ENV: AppEnvironmentType;

	/**
 * Logging level: e.g., 'debug', 'info', 'warn', 'error'.
 */
	LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

	/**
 * Port number on which the application runs (optional).
 * Example: 8080
 */
	PORT?: number | string;

}


/** Base structure for HTTP error responses */
export interface IBaseErrorResponse extends IBaseTimestamp {
	/** HTTP path where the error occurred */
	path: string;
	/** HTTP method used (GET, POST, PATCH, PUT, DELETE, etc.) */
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


/** Represents a MongoDB identifier, which can either be an ObjectId or a string. */
export type MongoIdType = ObjectId | string;

/**
 * Base interface for MongoDB documents with a string-based `_id`.
 *
 * Extends Mongoose's `Document<string>` to ensure typed access to `id`.
 */
export interface IBaseMongoDocument<TType extends string | number | ObjectId = string> extends Document<TType> {
	/** The string representation of the MongoDB document ID */
	id: TType;
}

/**
 * Describes sorting directions for queries.
 * - `'ascending'` means lowest to highest.
 * - `'descending'` means highest to lowest.
 */
export type SortOrderType = 'descending' | 'ascending';
