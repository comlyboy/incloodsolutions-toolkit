import { Express } from "express";
import { Document, ObjectId } from "mongoose";

import { AppEnvironmentType, IBaseErrorResponse, ObjectType } from "@incloodsolutions/toolkit";

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
	 *
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


/**
 * Standard API response structure.
 *
 * @template TData - The type of the response payload.
 */
export interface IBaseApiResult<TData = any> extends ObjectType {
	/**
	 * The main response data returned from the API.
	 * Typically contains the requested resource or result.
	 */
	data?: TData;

	/**
	 * A human-readable message describing the outcome of the request.
	 * Usually used for success or informational responses.
	 */
	message?: string;

	/**
	 * Error information returned when the request fails.
	 * Combines a base error structure with additional dynamic properties.
	 */
	error?: IBaseErrorResponse & ObjectType;
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


export interface INestAppInstance extends ObjectType {
	init: () => Promise<void>;
	getHttpAdapter: () => {
		getInstance: () => Express;
	} & ObjectType;
}