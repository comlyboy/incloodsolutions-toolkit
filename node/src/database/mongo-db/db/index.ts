import { set, connect, disconnect, Connection, ConnectOptions } from 'mongoose';
import { logDebugger } from '../../../utility';
import { CustomException, IBaseEnableDebug } from '@incloodsolutions/toolkit';

let cachedConnection = (global as any).mongoose as {
	customConnection: Connection | null;
	connectionPromise: Promise<Connection> | null;
};

if (!cachedConnection) {
	cachedConnection = (global as any).mongoose = {
		customConnection: null,
		connectionPromise: null
	};
}

/**
 * Initializes a singleton Mongoose connection that is cached globally to
 * support environments like serverless functions or Lambda.
 *
 * @param {Object} [params] - Optional parameters for connecting to MongoDB.
 * @param {string} [params.url] - MongoDB connection URI. Defaults to `process.env.MONGO_DATABASE_URL`.
 * @param {Object} [params.options] - Unused. Reserved for future config merging.
 * @param {ConnectOptions} [params.connectionOptions] - Connection options passed directly to Mongoose.
 * @param {boolean} [params.enableDebug] - Enables Mongoose debug mode for verbose logging.
 *
 * @returns {Promise<{ closeConnection: () => Promise<void>, connection: Connection }>}
 * An object containing the active `connection` and a method `closeConnection` to close it.
 *
 * @throws {CustomException} When connection fails or disconnection throws an error.
 */
export async function initMongooseConnection(params?: {
	url?: string;
	options?: {
		retries?: number;
		retryDelayMs?: number;
	} & Partial<IBaseEnableDebug>;
	connectionOptions?: ConnectOptions;
}): Promise<{ connection: Connection; closeConnection: () => Promise<void> }> {
	const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

	async function closeConnection() {
		try {
			if (cachedConnection.customConnection) {
				await disconnect();
				cachedConnection.customConnection = null;
				cachedConnection.connectionPromise = null;
			}
		} catch (error) {
			cachedConnection.customConnection = null;
			cachedConnection.connectionPromise = null;
			throw new CustomException(error);
		}
	}

	const maxRetries = params?.options?.retries ?? 5;
	const retryDelay = params?.options?.retryDelayMs ?? 5000;
	const enableDebug = params?.options?.enableDebug ?? false;

	// 1️⃣ Reuse cached connection if healthy
	if (cachedConnection.customConnection) {
		try {
			await cachedConnection.customConnection.db.admin().ping();
			if (cachedConnection.customConnection.readyState === 1) {
				if (enableDebug) logDebugger('MongooseDbConnection', 'Reusing existing connection!');
				return {
					connection: cachedConnection.customConnection,
					closeConnection,
				};
			}
		} catch {
			if (enableDebug) logDebugger('MongooseDbConnection', 'Detected stale connection, reconnecting...');
			await closeConnection();
		}
	}

	// 2️⃣ Try to establish new connection (with retries)
	let attempts = 0;
	while (attempts < maxRetries) {
		try {
			if (enableDebug) logDebugger('MongooseDbConnection', `Connecting to database (Attempt ${attempts + 1})`);
			if (enableDebug) set('debug', true);

			cachedConnection.connectionPromise = connect(
				params?.url || process.env.MONGO_DATABASE_URL!,
				{
					maxPoolSize: 1,
					minPoolSize: 1,
					maxIdleTimeMS: 10000,
					serverSelectionTimeoutMS: 5000,
					socketTimeoutMS: 30000,
					bufferCommands: false,
					autoIndex: false,
					autoCreate: false,
					...params?.connectionOptions,
				},
			) as unknown as Promise<Connection>;

			cachedConnection.customConnection = await cachedConnection.connectionPromise;

			if (enableDebug) logDebugger('MongooseDbConnection', '✅ MongoDB connected');
			break;
		} catch (error) {
			attempts++;
			if (attempts >= maxRetries) {
				cachedConnection.customConnection = null;
				cachedConnection.connectionPromise = null;
				throw new CustomException(error);
			}
			if (enableDebug)
				logDebugger('MongooseDbConnection', `Retrying in ${retryDelay / 1000}s (${attempts}/${maxRetries})`);
			await delay(retryDelay);
		}
	}

	return {
		closeConnection,
		connection: cachedConnection.customConnection!,
	};
}
