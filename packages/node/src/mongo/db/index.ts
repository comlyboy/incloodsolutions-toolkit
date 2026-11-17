import { CustomException } from '@incloodsolutions/toolkit/error';
import { IBaseEnableDebug } from '@incloodsolutions/toolkit/interface';
import { consoleLog } from '@incloodsolutions/toolkit/utility';

import { set, connect, disconnect, Connection, ConnectOptions } from 'mongoose';

let cachedConnection = (global as any).mongoose as {
	customConnection: Connection | null;
	connectionPromise: Promise<Connection> | null;
};

if (!cachedConnection) {
	cachedConnection = (global as any).mongoose = {
		customConnection: null,
		connectionPromise: null,
	};
}

/**
 * Initializes a singleton Mongoose connection that is cached globally to
 * support environments like serverless functions or Lambda.
 *
 * A healthy cached connection is reused. Otherwise it connects, retrying on failure.
 *
 * @param params - Optional parameters for connecting to MongoDB.
 * @param params.url - MongoDB connection URI. Defaults to `process.env.MONGO_DATABASE_URL`.
 * @param params.options - Retry and logging options.
 * @param params.options.retries - Connection attempts before giving up. Defaults to `5`.
 * @param params.options.retryDelayMs - Wait between attempts, in milliseconds. Defaults to `5000`.
 * @param params.options.enableDebug - Enables Mongoose debug mode and logs each step. Defaults to `false`.
 * @param params.connectionOptions - Connection options passed directly to Mongoose.
 *
 * @returns An object containing the active `connection` and a method `closeConnection` to close it.
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
				if (enableDebug)
					consoleLog({
						context: 'MongooseDbConnection',
						message: 'Reusing existing connection!',
					});
				return {
					connection: cachedConnection.customConnection,
					closeConnection,
				};
			}
		} catch {
			if (enableDebug)
				consoleLog({
					context: 'MongooseDbConnection',
					message: 'Detected stale connection, reconnecting...',
				});
			await closeConnection();
		}
	}

	// 2️⃣ Try to establish new connection (with retries)
	let attempts = 0;
	while (attempts < maxRetries) {
		try {
			if (enableDebug)
				consoleLog({
					context: 'MongooseDbConnection',
					message: `Connecting to database (Attempt ${attempts + 1})`,
				});
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

			cachedConnection.customConnection =
				await cachedConnection.connectionPromise;

			if (enableDebug)
				consoleLog({
					context: 'MongooseDbConnection',
					message: '✅ MongoDB connected',
				});
			break;
		} catch (error) {
			attempts++;
			if (attempts >= maxRetries) {
				cachedConnection.customConnection = null;
				cachedConnection.connectionPromise = null;
				throw new CustomException(error);
			}
			if (enableDebug)
				consoleLog({
					context: 'MongooseDbConnection',
					message: `Retrying in ${retryDelay / 1000}s (${attempts}/${maxRetries})`,
				});
			await delay(retryDelay);
		}
	}

	return {
		closeConnection,
		connection: cachedConnection.customConnection!,
	};
}
