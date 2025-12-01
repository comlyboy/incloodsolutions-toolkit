import { writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import morgan, { Options } from 'morgan';
import { Request, Response } from 'express';
import { compare, genSalt, hash } from 'bcryptjs';
import { AES, enc, HmacSHA512, SHA512, } from 'crypto-js';
import { isValidObjectId, ObjectId, Types } from 'mongoose';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { isIP, isMongoId, validate, ValidationError, ValidatorOptions } from 'class-validator';
import { ClassConstructor, ClassTransformOptions, plainToInstance } from 'class-transformer';

import { getCurrentLambdaInvocation } from '../aws';
import { CustomException, IBaseEnableDebug, IBaseErrorResponse, ObjectType } from '@incloodsolutions/toolkit';


export function isIsoDate(date: string): boolean {
	return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[-+]\d{2}:\d{2})?)?$/.test(date);
}

/** Removes properties with values `undefined`, `null`, or `' '` */
export function sanitizeObject<TData extends ObjectType = any>({ data, keysToRemove = [] }: {
	data: TData;
	keysToRemove?: (keyof TData)[];
}): TData {
	const isInvalidObject = !Object.keys(data).length || typeof data !== 'object' || Array.isArray(data);
	if (isInvalidObject) return data;
	return Object.fromEntries(Object.entries(data)
		.filter(([key, value]) => ![undefined, null, '', 'undefined'].includes(value) || !keysToRemove.includes(key))
		.map(([key, value]) => [key, sanitizeObject(value)])
	) as TData;
}

/** Encrypted data using crypto-js. */
export function encryptData<TData>({ data, secret, type = 'aes256', enableDebug }: {
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
			logDebugger(encryptData.name, 'Encrypting with type aes256', data);
		}

		const dataToString = JSON.stringify(data);

		if (enableDebug) {
			logDebugger(encryptData.name, 'Stringified encryption data', dataToString);
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
			logDebugger(encryptData.name, error.message);
		}
		throw error;
	}
}

/** Decrypted data using crypto-js. aes256 type alone */
export function decryptData<TResponse>({ hashedData, secret, type = 'aes256', enableDebug }: {
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
			logDebugger(decryptData.name, 'Decryption WordArray to Utf8 string', decryptedString);
		}
		const result = JSON.parse(decryptedString);
		if (enableDebug) {
			logDebugger(decryptData.name, 'Decryption parsed data to JSON', result);
		}
		return result as TResponse;
	} catch (error) {
		error['message'] = error?.message || 'Decryption errored out!';
		if (enableDebug) {
			logDebugger(decryptData.name, error.message);
		}
		throw error;
	}
}

/** Get Current IP address from express.Request */
export function getIpAddress(req: Request) {
	const ipAddress = req?.ip;
	const remoteAddress = req?.socket?.remoteAddress;
	const xForwardedFor = req?.headers["x-forwarded-for"];

	if (xForwardedFor && typeof xForwardedFor === "string") {
		const ipCurrent = xForwardedFor.split(",")[0].trim();
		if (isIP(ipCurrent)) {
			return ipCurrent;
		}
	}

	if (remoteAddress && typeof remoteAddress === "string" && isIP(remoteAddress)) {
		return remoteAddress;
	}

	if (ipAddress && typeof ipAddress === "string" && isIP(ipAddress)) {
		return ipAddress;
	}

	return '';
}

/** Hash string using bcrypt-js */
export async function hashWithBcrypt(data: string, saltRounds?: number): Promise<string> {
	if (!data) {
		throw new CustomException('Cannot hash a null/undefined data!')
	}
	const salt = await genSalt(saltRounds);
	return await hash(data, salt);
}

/** Validates hashed string using bcrypt-js */
export async function validateHashWithBcrypt(plainData: string, hashedData: string) {
	if (!plainData || !hashedData) return false;
	return await compare(plainData, hashedData);
}


/** Write file to lambda function `/tmp` folder... Errors if not in lambda environment */
export async function writeFileToLambda({
	filePath,
	file
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
		fullFilePath = filePath.startsWith('/tmp') ? filePath : path.join('/tmp', filePath);
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

/** Get file from lambda function `/tmp` folder... Errors if not in lambda environment */
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

/** Check if currently in Lambda environment */
export function isLambdaEnvironment() {
	return Boolean(process.env?.LAMBDA_TASK_ROOT || process.env?.AWS_LAMBDA_FUNCTION_NAME);
}

/** Map and return API operation results */
export function apiResult<TBody extends ObjectType | ObjectType[]>({ data, message, error }: {
	message?: string;
	data?: TBody;
	error?: IBaseErrorResponse & ObjectType;
}) {
	return {
		message: message || null,
		data: data || null,
		error: error || null
	} as const;
}

/** Return API call response */
export function returnApiResponse<TBody extends ObjectType | ObjectType[]>(res: Response, data: {
	message?: string; data?: TBody;
	error?: IBaseErrorResponse & ObjectType;
}, statusCode = 200) {
	return res.status(statusCode).json({
		success: statusCode < 400,
		statusCode,
		...data,
	});
}

/** Encode URL */
export function encodeUrlComponent<TData = any>(data: TData) {
	return encodeURIComponent(typeof data === 'string' ? data : JSON.stringify(data));
}

/**
 * Checks if a string is a valid MongoDB ObjectId.
 *
 * @param data - The string to validate.
 * @returns `true` if the string is a valid ObjectId, otherwise `false`.
 */
export function isValidMongoId(data: string | ObjectType | ObjectId): boolean {
	if (typeof data === 'string') {
		return Types.ObjectId.isValid(data) && data.length === 24 && isValidObjectId(data) && isMongoId(data);
	}
	if ((data as any) instanceof Types.ObjectId) {
		return true;
	}
	return false;
}


/** Decode URL */
export function decodeUrlComponent<TType>(data: string) {
	return JSON.parse(decodeURIComponent(data)) as TType;
}

/** Create a custom logger instance */
export function createLogger(context?: string) {
	function logMessage(level: string, message: string) {
		const ctx = context ? `[${context}]` : '';
		return console.log(`${new Date().toISOString()} - ${level.toUpperCase()} ${ctx} ${message}`);
	}

	return {
		log: (message: string) => logMessage('log', message),
		info: (message: string) => logMessage('info', message),
		debug: (message: string) => logMessage('debug', message),
		error: (message: string) => logMessage('error', message)
	};
}

/** Return API homepage */
export function returnApiOverview({ name, docsUrl, primaryColor = '#4f46e5', description }: {
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
	</html>`
}

/** Log beautifully without library */
export function logDebugger(
	context: string,
	message: string,
	data?: any,
	options?: {
		prettify?: boolean;
		ignoreDate?: boolean;
	}
) {
	const yellowColor = "\x1b[33m";
	const resetColor = '\x1b[0m';
	const greenColor = '\x1b[32m';

	const ctx = context
		? options?.prettify
			? `${yellowColor}[${context}]${resetColor} `
			: `[${context}] `
		: '';

	const logLabel = options?.prettify ? `${greenColor}LOG${resetColor}` : 'LOG';
	const logMessage = options?.prettify ? `${greenColor}${message}${resetColor}` : message;

	console.log(`${options?.ignoreDate ? '' : new Date().toUTCString()} - ${logLabel} ${ctx}${logMessage}`, data || '');
}

/** Log request and response using morgan */
export function reqResLogger({ formats = [], options }: {
	formats?: string[];
	options?: Options<any, any>;
} = {}) {
	let requestId = new Date().toUTCString();
	formats = formats.map(format => format.startsWith(':') ? format : `:${format}`);
	const defaultFormats = [':id', ...isLambdaEnvironment() ? [':invocationId'] : [], ':method', ':status', ':url', ...formats, ':total-time ms', ':res[content-length]'];

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
export async function validateDataWithClassValidator<TData, TSchema extends ObjectType>(schema: ClassConstructor<TSchema>, data: TData, options: {
	validatorOptions: ValidatorOptions;
	transformOptions: ClassTransformOptions;
}): Promise<TSchema> {

	function flattenValidationErrors(errors: ValidationError[]): string[] {
		return errors.flatMap(error => {
			const currentConstraints = error.constraints ? Object.values(error.constraints).map(constraint => {
				const [first, ...rest] = constraint.split(' ');
				return `'${first}': ${rest.join(' ')}`;
			}) : [];
			const childConstraints = error.children?.length ? flattenValidationErrors(error.children) : [];
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
export function normalizeMongooseData<TData extends ObjectType>(data: TData): TData {
	if (!data || typeof data !== "object" || Array.isArray(data)) return data;
	data = typeof data?.toObject === 'function' ? data?.toObject() : data;

	const normalised: ObjectType = {
		...Object.fromEntries(
			Object.entries(data).map(([key, value]) => {
				// if (value && typeof value === "object") {
				// 	return this.normalizeMongooseData(value);
				// }
				return [key, isValidMongoId(value) ? `${value}` : value];
			})
		)
	} as TData;

	if (normalised?._id) {
		normalised.id = `${normalised._id}`;
	}

	return normalised as TData;
}