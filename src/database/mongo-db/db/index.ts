import { set, connect, disconnect, Connection, ConnectOptions } from 'mongoose';

import { CustomException } from '../../../error';
import { IBaseEnableDebug } from "../../../interface";

let cachedConnection = (global as any).mongoose as {
	customConnection: Connection | null;
	connectionPromise: Promise<Connection> | null;
};

if (!cachedConnection) {
	cachedConnection = (global as any).mongoose = { customConnection: null, connectionPromise: null };
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
	options?: {} & Partial<IBaseEnableDebug>;
	connectionOptions?: ConnectOptions;
}): Promise<{
	connection: Connection;
	closeConnection: () => Promise<void>;
}> {

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

	if (!cachedConnection.connectionPromise) {
		try {
			if (params?.options?.enableDebug) {
				set('debug', true);
			}

			cachedConnection.connectionPromise = connect(params?.url || process.env?.MONGO_DATABASE_URL, params?.connectionOptions) as any;

			cachedConnection.customConnection = await cachedConnection.connectionPromise;
		} catch (error) {
			cachedConnection.customConnection = null;
			cachedConnection.connectionPromise = null;
			throw new CustomException(error);
		}
	}

	cachedConnection.customConnection = await cachedConnection.connectionPromise;

	return {
		closeConnection,
		connection: cachedConnection.customConnection
	};

}