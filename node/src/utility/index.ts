import { writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// import sqlBrick from 'sql-bricks';
import morgan, { Options } from 'morgan';
import { compare, genSalt, hash } from 'bcryptjs';
import { Express, Request, Response } from 'express';
// `crypto-js` is CJS-only with no named ESM exports — default-import it so the
// built ESM bundle loads in a real ESM runtime (Node ESM, NestJS 12, Vite).
import cryptoJs from 'crypto-js';
import { isValidObjectId, ObjectId, Types } from 'mongoose';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { toBuffer as qrBarcodeFn, RenderOptions } from 'bwip-js';
// import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';
import { v7 as uuidv7, v4 as uuidv4, validate as uuidValidate } from 'uuid';
import {
	isIP,
	isMongoId,
	validate,
	ValidationError,
	ValidatorOptions,
} from 'class-validator';
import {
	ClassConstructor,
	ClassTransformOptions,
	plainToInstance,
} from 'class-transformer';

import {
	CustomException,
	IBaseEnableDebug,
	ObjectType,
} from '@incloodsolutions/toolkit';

import { getCurrentLambdaInvocation } from '../aws';
import { IBaseApiResult, INestAppInstance } from '../interface';

const { AES, enc, HmacSHA512, SHA512 } = cryptoJs;

/**
 * Recursively removes "empty" properties (`undefined`, `null`, `''`, or the
 * string `'undefined'`) from an object. Arrays and non-objects pass through
 * unchanged. Mirrors `sanitizeObject` from `@incloodsolutions/toolkit`.
 *
 * @typeParam TData - Shape of the object being sanitised.
 * @param options - Options.
 * @param options.data - The object to sanitise.
 * @param options.keysToRemove - Keys preserved even when empty. Defaults to `[]`.
 * @returns A new object with empty properties removed.
 */
export function sanitizeObject<TData extends ObjectType = any>({
	data,
	keysToRemove = [],
}: {
	data: TData;
	keysToRemove?: (keyof TData)[];
}): TData {
	const isInvalidObject =
		!Object.keys(data).length ||
		typeof data !== 'object' ||
		Array.isArray(data);
	if (isInvalidObject) return data;
	return Object.fromEntries(
		Object.entries(data)
			.filter(
				([key, value]) =>
					![undefined, null, '', 'undefined'].includes(value) ||
					!keysToRemove.includes(key),
			)
			.map(([key, value]) => [key, sanitizeObject(value)]),
	) as TData;
}

/**
 * Encrypts or hashes a value with `crypto-js`.
 *
 * The value is `JSON.stringify`-ed first. `aes256` is reversible with
 * {@link decryptData}; the SHA/HMAC variants are one-way digests.
 *
 * @typeParam TData - Type of the value being encrypted.
 * @param options - Options.
 * @param options.data - The value to encrypt. A falsy value is returned as-is.
 * @param options.secret - Secret key. Required for `aes256` and `hmacSha512`
 *   (not required for plain `sha512`).
 * @param options.type - Algorithm. Defaults to `'aes256'`.
 *   - `'aes256'`: reversible AES encryption.
 *   - `'hmacSha512'`: keyed HMAC-SHA-512 hex digest.
 *   - `'sha512'` / `'sha256'`: unkeyed SHA-512 hex digest.
 * @param options.enableDebug - Log intermediate steps. Defaults to `false`.
 * @returns The cipher text (AES) or hex digest (SHA/HMAC).
 * @throws {CustomException} When a secret is required but missing.
 */
export function encryptData<TData>({
	data,
	secret,
	type = 'aes256',
	enableDebug,
}: {
	data?: TData;
	secret: string;
	type?: 'hmacSha512' | 'aes256' | 'sha512' | 'sha256';
} & Partial<IBaseEnableDebug>): string {
	try {
		if (!data) return data as string;
		if (!secret && type !== 'sha512') {
			throw new CustomException('Secret key is required for encryption!');
		}

		if (enableDebug) {
			printLog(encryptData.name, 'Encrypting with type aes256', data);
		}

		const dataToString = JSON.stringify(data);

		if (enableDebug) {
			printLog(encryptData.name, 'Stringified encryption data', dataToString);
		}

		if (type === 'hmacSha512') {
			return HmacSHA512(dataToString, secret).toString(enc.Hex);
		} else if (type === 'sha512') {
			return SHA512(dataToString).toString(enc.Hex);
		} else {
			return AES.encrypt(dataToString, secret).toString();
		}
	} catch (error) {
		error['message'] = error?.message || 'Encryption errored out!';
		if (enableDebug) {
			printLog(encryptData.name, error.message);
		}
		throw error;
	}
}

/**
 * Decrypts an AES-256 cipher text produced by {@link encryptData} and
 * `JSON.parse`-s the result.
 *
 * Only `aes256` is supported (the SHA/HMAC modes are one-way).
 *
 * @typeParam TResponse - Expected type of the decrypted value.
 * @param options - Options.
 * @param options.hashedData - The AES cipher text. A falsy value yields `null`.
 * @param options.secret - The same secret used to encrypt.
 * @param options.type - Fixed to `'aes256'`. Defaults to `'aes256'`.
 * @param options.enableDebug - Log intermediate steps. Defaults to `false`.
 * @returns The decrypted, parsed value typed as `TResponse`.
 * @throws {CustomException} When the secret is missing or decryption produces no output.
 */
export function decryptData<TResponse>({
	hashedData,
	secret,
	type = 'aes256',
	enableDebug,
}: {
	secret: string;
	hashedData: string;
	type?: 'aes256';
} & Partial<IBaseEnableDebug>): TResponse {
	try {
		if (!hashedData) return null;
		if (!secret) {
			throw new CustomException('Secret key is required for decryption!');
		}
		const decryptedString = AES.decrypt(hashedData, secret).toString(enc.Utf8);
		if (!decryptedString) {
			throw new CustomException('Decryption failed. Possibly wrong secret!');
		}

		if (enableDebug) {
			printLog(
				decryptData.name,
				'Decryption WordArray to Utf8 string',
				decryptedString,
			);
		}
		const result = JSON.parse(decryptedString);
		if (enableDebug) {
			printLog(decryptData.name, 'Decryption parsed data to JSON', result);
		}
		return result as TResponse;
	} catch (error) {
		error['message'] = error?.message || 'Decryption errored out!';
		if (enableDebug) {
			printLog(decryptData.name, error.message);
		}
		throw error;
	}
}

/**
 * Extracts the best-guess client IP address from an Express request.
 *
 * Checks, in order: the first entry of the `x-forwarded-for` header, then
 * `socket.remoteAddress`, then `req.ip` — returning the first that is a valid
 * IP. Returns `''` when none qualifies.
 *
 * @param req - The Express `Request`.
 * @returns The client IP string, or `''` if it cannot be determined.
 */
export function getIpAddress(req: Request) {
	const ipAddress = req?.ip;
	const remoteAddress = req?.socket?.remoteAddress;
	const xForwardedFor = req?.headers['x-forwarded-for'];

	if (xForwardedFor && typeof xForwardedFor === 'string') {
		const ipCurrent = xForwardedFor.split(',')[0].trim();
		if (isIP(ipCurrent)) {
			return ipCurrent;
		}
	}

	if (
		remoteAddress &&
		typeof remoteAddress === 'string' &&
		isIP(remoteAddress)
	) {
		return remoteAddress;
	}

	if (ipAddress && typeof ipAddress === 'string' && isIP(ipAddress)) {
		return ipAddress;
	}

	return '';
}

/**
 * Hashes a string with bcrypt (`bcryptjs`).
 *
 * @param data - The plaintext to hash. Must be non-empty.
 * @param saltRounds - Cost factor passed to `genSalt`. When omitted, `bcryptjs`
 *   uses its own default (10).
 * @returns The bcrypt hash string.
 * @throws {CustomException} When `data` is null/undefined/empty.
 */
export async function hashWithBcrypt(
	data: string,
	saltRounds?: number,
): Promise<string> {
	if (!data) {
		throw new CustomException('Cannot hash a null/undefined data!');
	}
	const salt = await genSalt(saltRounds);
	return await hash(data, salt);
}

/**
 * Compares a plaintext string against a bcrypt hash.
 *
 * @param plainData - The candidate plaintext.
 * @param hashedData - The stored bcrypt hash.
 * @returns `true` when they match; `false` when they do not, or when either argument is missing.
 */
export async function validateHashWithBcrypt(
	plainData: string,
	hashedData: string,
) {
	if (!plainData || !hashedData) return false;
	return await compare(plainData, hashedData);
}

/**
 * Writes a file into the AWS Lambda writable directory (`/tmp`).
 *
 * A relative `filePath` is resolved under `/tmp`; an absolute path outside
 * `/tmp` is still forced under `/tmp`. When `filePath` is omitted and `file` is
 * a `File`, its `name` is used.
 *
 * @param options - Options.
 * @param options.filePath - Destination path (relative to `/tmp`, or absolute).
 * @param options.file - Contents: a string, an `ArrayBufferView`, or a `File`.
 * @returns The absolute path the file was written to.
 * @throws {CustomException} When `file` is missing, when not running in Lambda,
 *   or when no destination path can be determined.
 */
export async function writeFileToLambda({
	filePath,
	file,
}: {
	filePath?: string;
	file: string | NodeJS.ArrayBufferView | File;
}): Promise<string> {
	if (!file) {
		throw new CustomException('File is required');
	}
	if (!isLambdaEnvironment()) {
		throw new CustomException('Not in lambda environment!');
	}

	let fullFilePath: string;

	if (filePath) {
		// Ensure the path starts with /tmp for Lambda security
		fullFilePath = filePath.startsWith('/tmp')
			? filePath
			: path.join('/tmp', filePath);
	} else if (file instanceof File && file.name) {
		// Fallback to File.name if no filePath provided
		fullFilePath = path.join('/tmp', file.name);
	} else {
		throw new CustomException('File path is required');
	}

	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await writeFile(fullFilePath, buffer);
	} else {
		await writeFile(fullFilePath, file);
	}

	return fullFilePath;
}

/**
 * Reads a file from the AWS Lambda writable directory (`/tmp`).
 *
 * @param fileName - File name relative to `/tmp`.
 * @returns The file contents as a `Buffer`, or `null` when `fileName` is falsy
 *   or the file does not exist.
 * @throws When not running in a Lambda environment (rejects with a string message).
 */
export async function readFileFromLambda(fileName: string) {
	return new Promise<Buffer>((resolve, reject) => {
		try {
			if (!fileName) return null;
			if (!isLambdaEnvironment()) {
				reject('Not in lambda environment!');
			}
			const filePath = path.join('/tmp', fileName);
			if (!existsSync(filePath)) return resolve(null);
			const file = readFileSync(filePath);
			resolve(file);
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Detects whether the current process is running inside AWS Lambda.
 *
 * @returns `true` when both `LAMBDA_TASK_ROOT` and `AWS_LAMBDA_FUNCTION_NAME`
 *   environment variables are set.
 */
export function isLambdaEnvironment() {
	return Boolean(
		process.env?.LAMBDA_TASK_ROOT && process.env?.AWS_LAMBDA_FUNCTION_NAME,
	);
}

/**
 * Checks whether a string is a valid UUID, using the `uuid` package's validator.
 *
 * @param uuid - The string to test.
 * @returns `true` when the string is a well-formed UUID.
 */
export function isValidUUID(uuid: string) {
	return uuidValidate(uuid);
}

/**
 * Generates a UUID with optional formatting tweaks.
 *
 * @param options - Options.
 * @param options.version - UUID version to generate, `4` or `7`. Defaults to `7`
 *   (time-ordered, better for database keys).
 * @param options.symbol - When set, every `-` in the UUID is replaced with this string.
 * @param options.asUpperCase - Return the UUID upper-cased. Defaults to `false`.
 * @returns The generated UUID string.
 *
 * @example
 * generateCustomUUID();                              // "0190a1b2-..." (v7)
 * generateCustomUUID({ version: 4, asUpperCase: true });
 * generateCustomUUID({ symbol: '' });                // dashes stripped
 */
export function generateCustomUUID({
	asUpperCase = false,
	symbol,
	version = 7,
}: {
	asUpperCase?: boolean;
	symbol?: string;
	version?: 4 | 7;
} = {}): string {
	let uuid = version === 4 ? uuidv4() : uuidv7();
	uuid = symbol && symbol.trim() ? uuid.replace(/-/g, symbol) : uuid;
	return asUpperCase ? uuid.toUpperCase() : uuid;
}

/**
 * Returns a shallow, read-only copy of an API result object.
 *
 * A light normalisation helper for building `{ data, message, error }` payloads
 * before passing them to {@link returnApiResponse}.
 *
 * @typeParam TBody - Shape of `data`.
 * @param apiResponse - The {@link IBaseApiResult} to freeze.
 * @returns A `Readonly<IBaseApiResult>` copy.
 */
export function apiResult<TBody extends ObjectType | ObjectType[]>(
	apiResponse: IBaseApiResult<TBody>,
) {
	return { ...apiResponse } as Readonly<IBaseApiResult>;
}

/**
 * Sends a JSON API response through an Express `Response`.
 *
 * The body is `{ success, statusCode, ...data.data }`, where `success` is
 * `statusCode < 400`.
 *
 * @typeParam TBody - Shape of `data.data`.
 * @param res - The Express `Response`.
 * @param data - An {@link IBaseApiResult}; only its `data` field is spread into the body.
 * @param statusCode - HTTP status code. Defaults to `200`.
 * @returns The Express `Response` (result of `res.status().json()`).
 */
export function returnApiResponse<TBody extends ObjectType | ObjectType[]>(
	res: Response,
	data: IBaseApiResult<TBody>,
	statusCode = 200,
) {
	return res.status(statusCode).json({
		success: statusCode < 400,
		statusCode,
		...data.data,
	});
}

/**
 * URL-encodes a value (strings directly, everything else `JSON.stringify`-ed
 * first). Round-trips with {@link decodeUrlComponent}.
 *
 * @typeParam TData - Type of the value being encoded.
 * @param data - The value to encode.
 * @returns The percent-encoded string.
 */
export function encodeUrlComponent<TData = any>(data: TData) {
	return encodeURIComponent(
		typeof data === 'string' ? data : JSON.stringify(data),
	);
}

/**
 * Checks if a string is a valid MongoDB ObjectId.
 *
 * @param data - The string to validate.
 * @returns `true` if the string is a valid ObjectId, otherwise `false`.
 */
export function isValidMongoId(data: string | ObjectType | ObjectId): boolean {
	if (typeof data === 'string') {
		return (
			Types.ObjectId.isValid(data) &&
			data.length === 24 &&
			isValidObjectId(data) &&
			isMongoId(data)
		);
	}
	if ((data as any) instanceof Types.ObjectId) {
		return true;
	}
	return false;
}

/**
 * Decodes a string produced by {@link encodeUrlComponent} and `JSON.parse`-s it.
 *
 * @typeParam TType - Expected type of the decoded value.
 * @param data - The percent-encoded, JSON string.
 * @returns The parsed value typed as `TType`.
 */
export function decodeUrlComponent<TType>(data: string) {
	return JSON.parse(decodeURIComponent(data)) as TType;
}

/**
 * Creates a minimal timestamped console logger.
 *
 * Each call prints `<ISO date> - <LEVEL> [context] <message>`.
 *
 * @param context - Optional label shown in brackets on every line.
 * @returns An object with `log`, `info`, `debug`, and `error` methods, each `(message: string) => void`.
 *
 * @example
 * const logger = initCustomLogger('Payments');
 * logger.info('charge succeeded');
 */
export function initCustomLogger(context?: string) {
	function logMessage(level: string, message: string) {
		const ctx = context ? `[${context}]` : '';
		const msg = `${new Date().toISOString()} - ${level.toUpperCase()} ${ctx} ${message}`;
		return console.log(msg.trim());
	}

	return {
		log: (message: string) => logMessage('log', message),
		info: (message: string) => logMessage('info', message),
		debug: (message: string) => logMessage('debug', message),
		error: (message: string) => logMessage('error', message),
	};
}

/**
 * Builds a small self-contained HTML "API overview" page, handy as the response
 * for an API's root route.
 *
 * The rendered card shows the name, description, docs link, current `NODE_ENV`,
 * status `200`, and a timestamp.
 *
 * @param options - Options.
 * @param options.name - API name shown as the heading and `<title>`.
 * @param options.docsUrl - Optional documentation link.
 * @param options.description - Optional short description.
 * @param options.primaryColor - Accent colour for the card's left border. Defaults to `'#4f46e5'`.
 * @returns A complete HTML document string.
 */
export function returnApiOverview({
	name,
	docsUrl,
	primaryColor = '#4f46e5',
	description,
}: {
	name: string;
	docsUrl?: string;
	primaryColor?: string;
	description?: string;
}) {
	return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>${name} summary</title>
			<meta content="IE=edge" http-equiv="X-UA-Compatible">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				body {
					font-family: monospace;
					background: #e3e8f1;
					margin: 0;
					padding: .5rem;
					display: flex;
					justify-content: center;
					align-items: center;
					height: 100vh;
				}

				.card {
					border-left: 5px solid ${primaryColor};
					max-width: 550px;
					width: 100%;
					background: #ffffff;
					padding: 2rem 1.5rem .6rem;
					border-radius: 10px;
					box-shadow: 0 10px 10px rgba(0, 0, 0, 0.05);
				}

				h2 {
					margin-top: 0;
					font-size: 1.5rem;
					color: #384353;
					text-decoration: underline;
				}

				.row {
					color: #62748e;
					margin-bottom: 1rem;
				}

				.label {
					display: inline-block;
					font-weight: bold;
				}

				a {
					color: #2563eb;
					text-decoration: none;
				}

				a:hover {
					text-decoration: underline;
				}
			</style>
		</head>

		<body>
			<div class="card">
				<h2>API Overview</h2>
				<div class="row"><span class="label">Name:</span> ${name}</div>
				<div class="row"><span class="label">Description:</span> ${description || ' '}</div>
				<div class="row"><span class="label">Docs URL:</span> <a href=${docsUrl || ' '} target="_blank">${docsUrl || ' '}</a></div>
				<div class="row"><span class="label">Environment:</span> ${process.env?.NODE_ENV}</div>
				<div class="row"><span class="label">Status:</span> 200</div>
				<div class="row"><span class="label">Timestamp:</span> ${new Date().toUTCString()}</div>
			</div>
		</body>
	</html>`;
}

/**
 * Writes a formatted line to `console.log` without a logging library. Mirrors
 * `printLog` from `@incloodsolutions/toolkit`.
 *
 * Output: `<UTC date> - LOG [context] message <data>`.
 *
 * @param context - Short bracketed label.
 * @param message - The message text.
 * @param data - Optional payload appended to the line.
 * @param options - Options.
 * @param options.prettify - Apply ANSI colours. Defaults to `false`.
 * @param options.ignoreDate - Omit the leading UTC timestamp. Defaults to `false`.
 */
export function printLog(
	context: string,
	message: string,
	data?: any,
	options?: {
		prettify?: boolean;
		ignoreDate?: boolean;
	},
) {
	const yellowColor = '\x1b[33m';
	const resetColor = '\x1b[0m';
	const greenColor = '\x1b[32m';

	const ctx = context
		? options?.prettify
			? `${yellowColor}[${context}]${resetColor} `
			: `[${context}] `
		: '';

	const logLabel = options?.prettify ? `${greenColor}LOG${resetColor}` : 'LOG';
	const logMessage = options?.prettify
		? `${greenColor}${message}${resetColor}`
		: message;

	console.log(
		`${options?.ignoreDate ? '' : new Date().toUTCString()} - ${logLabel} ${ctx}${logMessage}`,
		data || '',
	);
}

/**
 * Builds a `morgan` request/response logging middleware with extra tokens.
 *
 * The log line is `:id | :method | :status | :url | <your formats> | :total-time ms | :res[content-length]`,
 * plus an `:invocationId` segment when running in AWS Lambda. A per-request `:id`
 * token is registered (the API Gateway request id in Lambda, otherwise a
 * timestamp).
 *
 * @param options - Options.
 * @param options.formats - Extra `morgan` token names to append. A leading `:` is
 *   added automatically if missing. Defaults to `[]`.
 * @param options.options - `morgan` {@link Options} passed through to `morgan()`.
 * @returns An Express-compatible middleware function.
 *
 * @example
 * app.use(reqResLogger({ formats: ['user-agent', 'referrer'] }));
 */
export function reqResLogger({
	formats = [],
	options,
}: {
	formats?: string[];
	options?: Options<any, any>;
} = {}) {
	let requestId = new Date().toUTCString();
	formats = formats.map((format) =>
		format.startsWith(':') ? format : `:${format}`,
	);
	const defaultFormats = [
		':id',
		...(isLambdaEnvironment() ? [':invocationId'] : []),
		':method',
		':status',
		':url',
		...formats,
		':total-time ms',
		':res[content-length]',
	];

	if (isLambdaEnvironment()) {
		const { context, event } = getCurrentLambdaInvocation() as {
			context: Context;
			event: APIGatewayProxyEventV2;
		};

		requestId = event?.requestContext?.requestId || requestId;
		morgan.token('invocationId', () => context?.awsRequestId);
	}

	morgan.token('id', () => requestId);
	return morgan(defaultFormats.join(' | '), options);
}

/**
 * Validates and transforms raw input data using `class-transformer` and `class-validator`.
 *
 * @template TData - The shape of the incoming raw data.
 * @template TSchema - The class schema type used for validation.
 *
 * @param {new () => TSchema} schema - A class constructor defining the validation schema.
 * @param {TData} data - The raw data to be transformed and validated.
 * @param {Object} options - Configuration options.
 * @param {ValidatorOptions} options.validatorOptions - Options for class-validator.
 * @param {ClassTransformOptions} options.transformOptions - Options for class-transformer.
 *
 * @throws {CustomException} If validation fails, an exception is thrown containing flattened error messages.
 *
 * @returns {Promise<TSchema>} A promise that resolves with the validated and transformed instance of the schema.
 */
export async function validateDataWithClassValidator<
	TData,
	TSchema extends ObjectType,
>(
	schema: ClassConstructor<TSchema>,
	data: TData,
	options: {
		validatorOptions: ValidatorOptions;
		transformOptions: ClassTransformOptions;
	},
): Promise<TSchema> {
	function flattenValidationErrors(errors: ValidationError[]): string[] {
		return errors.flatMap((error) => {
			const currentConstraints = error.constraints
				? Object.values(error.constraints).map((constraint) => {
						const [first, ...rest] = constraint.split(' ');
						return `'${first}': ${rest.join(' ')}`;
					})
				: [];
			const childConstraints = error.children?.length
				? flattenValidationErrors(error.children)
				: [];
			return [...currentConstraints, ...childConstraints];
		});
	}

	const instance = plainToInstance(schema, data, options.transformOptions);
	const errors = await validate(instance, options.validatorOptions);

	if (errors.length > 0) {
		throw new CustomException(flattenValidationErrors(errors) as any, 400);
	}
	return instance;
}

/**
 * Normalises a MongoDB document by:
 * - Converting `ObjectId` values to string format.
 * - Adding a stringified `id` property from `_id` if it exists.
 * - Preserving all other properties as-is.
 *
 * Note: This function does not perform deep normalization (i.e., nested objects are left untouched).
 *
 * @template TData - The type of the object to normalise.
 * @param {TData} data - The MongoDB document or plain object to normalise.
 * @returns {TData} The normalised object with MongoDB `ObjectId`s converted to strings.
 */
export function normalizeMongooseData<TData extends ObjectType>(
	data: TData,
): TData {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
	data = typeof data?.toObject === 'function' ? data?.toObject() : data;

	const normalised: ObjectType = {
		...Object.fromEntries(
			Object.entries(data).map(([key, value]) => {
				// if (value && typeof value === "object") {
				// 	return this.normalizeMongooseData(value);
				// }
				return [key, isValidMongoId(value) ? `${value}` : value];
			}),
		),
	} as TData;

	if (normalised?._id) {
		normalised.id = `${normalised._id}`;
	}

	return normalised as TData;
}

/**
 * Normalizes Mongoose documents and plain JavaScript data structures
 * into API-safe, frontend-friendly objects.
 *
 * @remarks
 * This utility is designed for use at application boundaries (e.g. REST or
 * GraphQL responses). It performs a deep traversal of objects and arrays,
 * converting MongoDB ObjectIds into strings and exposing a stable `id` field
 * derived from `_id`.
 *
 * The function is intentionally non-mutating and preserves the original
 * data shape. Mongoose documents are converted using `toObject()` before
 * normalization.
 *
 * @template T
 * The input data type. The returned value preserves this shape.
 *
 * @param data
 * A Mongoose document, plain object, array, or primitive value.
 *
 * @returns
 * A deeply normalized version of the input where:
 * - MongoDB ObjectIds are converted to strings
 * - Nested objects and arrays are fully normalized
 * - An `id` field is added when `_id` is present
 *
 * @throws
 * This function may throw a `TypeError` if a `Symbol` value is encountered
 * during string coercion (e.g. when converting ObjectIds).
 *
 * @example
 * ```ts
 * const user = await UserModel.findById(id);
 *
 * const normalized = normalizeMongooseData(user);
 *
 * // Result:
 * // {
 * //   _id: "64fa123",
 * //   id: "64fa123",
 * //   name: "John Doe",
 * //   roles: ["admin", "editor"]
 * // }
 * ```
 *
 * @example
 * ```ts
 * normalizeMongooseData([
 *   { _id: new ObjectId("1") },
 *   { _id: new ObjectId("2") }
 * ]);
 *
 * // Result:
 * // [
 * //   { _id: "1", id: "1" },
 * //   { _id: "2", id: "2" }
 * // ]
 * ```
 */
export function normalizeMongooseData_v2<T>(data: T): T {
	if (data === null || data === undefined) return data;

	if (Array.isArray(data)) {
		return data.map((item) => normalizeMongooseData(item)) as T;
	}

	if (typeof data !== 'object') {
		return data;
	}

	const plain =
		typeof (data as any).toObject === 'function'
			? (data as any).toObject()
			: data;

	const normalized: any = {};

	for (const [key, value] of Object.entries(plain)) {
		if (isValidMongoId(value)) {
			normalized[key] = String(value);
		} else {
			normalized[key] = normalizeMongooseData(value);
		}
	}

	if (normalized._id && !normalized.id) {
		normalized.id = String(normalized._id);
	}

	return normalized as T;
}

/**
 * Type guard that distinguishes a NestJS application instance from a bare
 * Express app, by checking for a `getHttpAdapter` method.
 *
 * @param instance - An Express app or a NestJS app instance.
 * @returns `true` (narrowing to {@link INestAppInstance}) when `instance` looks like a Nest app.
 */
export function isNestApplication(
	instance: Express | INestAppInstance,
): instance is INestAppInstance {
	return (
		typeof instance === 'object' &&
		instance &&
		typeof (instance as INestAppInstance).getHttpAdapter === 'function'
	);
}

/**
 * Generates a QR code or barcode as a Base64-encoded PNG image string.
 *
 * @template TData - The type of data to encode. Can be an object (`ObjectType`) or a string.
 *
 * @param {TData} qrData - The data to be encoded. If an object, it will be stringified as JSON.
 * @param {Object} [options] - Optional rendering configuration.
 * @param {'qrcode' | 'barcode'} [options.type='qrcode'] - The type of code to generate.
 *   - `'qrcode'` (default): Generates a QR code.
 *   - `'barcode'`: Generates a Code128 barcode.
 *
 * @returns {Promise<string>} A promise that resolves to a Base64-encoded PNG image string,
 * prefixed with `data:image/png;base64,`.
 *
 * @example
 * // Generate a QR code from text (default type is 'qrcode')
 * const qr = await generateQrBarcode('Hello World');
 * console.log(qr); // data:image/png;base64,iVBORw0...
 *
 * @example
 * // Generate a barcode from an object
 * const barcode = await generateQrBarcode({ id: 123 }, { type: 'barcode' });
 * console.log(barcode); // data:image/png;base64,iVBORw0...
 */
export async function generateQrBarcode<TData extends ObjectType | string>(
	qrData: TData,
	options?: {
		type?: 'qrcode' | 'barcode';
		renderOptions: RenderOptions;
	},
): Promise<string> {
	const renderOptions: RenderOptions = {
		...(options?.renderOptions || {}),
		bcid: options?.type === 'barcode' ? 'code128' : 'qrcode',
		text: typeof qrData === 'object' ? JSON.stringify(qrData) : qrData,
		paddingwidth: options?.type === 'barcode' ? 3 : 5,
		paddingheight: options?.type === 'barcode' ? 3 : 5,
		scale: options?.type === 'barcode' ? 16 : 10,
		includetext: true,
		textyoffset: 4,
		barcolor: '121214',
		textxalign: 'center',
		backgroundcolor: 'ffffff',
	};

	if (options?.type === 'qrcode') {
		renderOptions.width = 120;
		renderOptions.height = 120;
	}

	const pngBuffer = await qrBarcodeFn({ ...renderOptions });
	return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

// export function sqlBuilder<TEntitySchema extends Record<string, any>>(tableName: string) {
// 	if (!tableName.trim()) throw new Error('Table name is needed!');
// 	return knex<{ [k in keyof TEntitySchema as Lowercase<keyof TEntitySchema & string>]: TEntitySchema[k] }, TEntitySchema>({
// 		client: 'pg',
// 		connection: false as any,
// 		pool: { min: 0, max: 0 }
// 	})(tableName);
// }

// export function initSqlParser<TEntitySchema extends ObjectType = ObjectType>(tableName: string) {
// 	if (!tableName.trim()) throw new Error('Table name is needed!');
// 	return {
// 		select: (...columns: any[]) => {
// 			return sqlBrick.select(columns.length ? columns : ['*'])
// 				.from(tableName);
// 		},
// 		insert: (values: Partial<TEntitySchema>) => {
// 			return sqlBrick.insert(tableName, values).into(tableName).;
// 		},
// 		update: (values: Partial<TEntitySchema>) => {
// 			return sqlBrick.update(tableName, values);
// 		},
// 		delete: () => {
// 			return sqlBrick.delete().from(tableName);
// 		}
// 	};
// }
