import fs from 'fs';
import path from 'path';

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AES, enc, lib, } from 'crypto-js';
import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';
import { isIP } from 'validator';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { compare, genSalt, hash } from 'bcryptjs';
import cloneDeep from 'lodash.clonedeep';
import { CountryCode, PhoneNumber, parsePhoneNumberFromString, parsePhoneNumberWithError } from 'libphonenumber-js';

import { ObjectType } from 'src/interface';

/** Generates ISO date */
export function generateISODate(date?: string | number | Date) {
	return date ? new Date(date).toISOString() : new Date().toISOString();
}

/** Transform text */
export function transformText({ text, format, trim = false }: {
	text: string;
	trim?: boolean;
	format?: 'uppercase' | 'lowercase' | 'titlecase' | 'capitalize';
}) {
	if (!text || typeof text !== 'string') return text;
	if (format === 'uppercase') {
		text = text.toUpperCase();
	}
	if (format === 'lowercase') {
		text = text.toLowerCase();
	}
	if (format === 'capitalize') {
		text = text.toLowerCase().replace(/\b\w/g, (match: string) => match.toUpperCase());
	}
	if (format === 'titlecase') {
		text = text.replace(/^./, text[0].toUpperCase());
	}
	if (trim) {
		text.trim();
	}
	return text;
}

export function isISODate(date: string): boolean {
	return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[-+]\d{2}:\d{2})?)?$/.test(date);
}

/** Generates customized uuid. */
export function generateCustomUUID({ asUpperCase = false, symbol = '' }: {
	asUpperCase?: boolean;
	symbol?: string;
} = {}): string {
	let identity = uuidv4();
	if (symbol !== '') {
		if (symbol === ' ') symbol = '';
		identity = identity.replace(/-/gi, symbol);
	}
	if (asUpperCase) { identity = identity.toUpperCase(); }
	return identity;
}

/** Send Http request with Axios. */
export async function sendHttpRequest<TResponse = any, TBody extends ObjectType = any>(options: AxiosRequestConfig<TBody>) {
	try {
		const response = await axios({ ...options }) as unknown as AxiosResponse<TResponse, TBody>;
		return await response.data as TResponse;
	} catch (error) {
		const errorObject = error?.response.data;
		const message = errorObject?.message || errorObject || error?.message || 'Http call errored out!';
		throw { ...errorObject, message };
	}
}

/** Throws error if the phonenumber format isn't correct */
export function parsePhonenumberWithError(phoneNumber: string, defaultCountry?: CountryCode): PhoneNumber {
	if (!phoneNumber || phoneNumber === ' ') throw Error('Invalid phoneNumber format!');
	return parsePhoneNumberWithError(phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`, defaultCountry);
}

/** Returns undefined if the phonenumber format isn't correct */
export function parsePhonenumber(phoneNumber: string, defaultCountry?: CountryCode): PhoneNumber | undefined {
	if (!phoneNumber || phoneNumber === ' ') return undefined;
	return parsePhoneNumberFromString(phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`, defaultCountry);
}

/** Removes properties with values `undefined`, `null`, or `' '` */
export function sanitizeObject<TData extends ObjectType = any>({ data, keysToRemove = [] }: {
	data: TData;
	keysToRemove?: (keyof TData)[];
}): TData {
	const isValidObject = !Object.keys(data).length || typeof data !== 'object' || Array.isArray(data);
	if (isValidObject) return data;
	return Object.fromEntries(Object.entries(data)
		.filter(([key, value]) => ![undefined, null, '', 'undefined'].includes(value) || !keysToRemove.includes(key))
		.map(([key, value]) => [key, sanitizeObject(value)])
	) as TData;
}

/** Encrypted data using crypto-js. */
export function encryptData<TData>({ data, secret, options }: {
	data: TData;
	secret: string;
	options?: {
		iv?: lib.WordArray;
		format?: {
			stringify?: () => string;
			parse?: (str: string) => lib.CipherParams;
		}
	} & ObjectType
}): string {
	try {
		if (!data) return null;
		if (!secret) {
			throw new Error('Secret key is required for encryption!');
		}
		const dataToString = typeof data === 'string' ? data : JSON.stringify(data);
		// const updatedOptions = {
		// 	...options,
		// 	format: {
		// 		stringify: options?.format?.stringify || ((cipherParams: any) => cipherParams.toString()),
		// 		parse: options?.format?.parse
		// 	}
		// };
		return AES.encrypt(dataToString, secret).toString();
	} catch (error) {
		error['message'] = error?.message || 'Encryption errored out!';
		throw error;
	}
}

/** Decrypted data using crypto-js. */
export function decryptData<TResponse>({ hashedData, secret }: {
	hashedData: string;
	secret: string;
}): TResponse {
	try {
		if (!hashedData) return null;
		if (!secret) {
			throw new Error('Secret key is required for decryption!');
		}
		const dataInBytes = AES.decrypt(hashedData, secret);
		return JSON.parse(dataInBytes.toString(enc.Utf8)) as TResponse;
	} catch (error) {
		error['message'] = error?.message || 'Encryption errored out!';
		throw error;
	}
}

/** Generate QR-Code as base64 string */
export async function generateQrCode<TData>(qrData: TData, options?: QRCodeToDataURLOptions): Promise<string> {
	const payload = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
	let qrImage = await toDataURL(payload, {
		...options,
		width: options?.width || 220,
		margin: options?.margin || 2,
		color: {
			light: options?.color?.light || '#fff',
			dark: options?.color?.dark || '#3B3D45',
		}
	});
	return `data:image/png;base64,${qrImage}`;
}

/** Get Current IP address from express.Request */
export function getIpAddress(req: Request) {
	const ipAddress = req.ip;
	const remoteAddress = req.socket?.remoteAddress;
	const xForwardedFor = req.headers["x-forwarded-for"];

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

/** Gets current date as number... e.g 20240412-010255666 or 20240412010255666 */
export function generateDateInNumber({ date, withSeparation = false }: {
	date?: string | number | Date;
	withSeparation?: boolean;
} = {}): string {
	const isoDate = generateISODate(date);
	const _date = isoDate.split('T').at(0);
	const time = isoDate.split('T').at(1);
	const year = _date.split('-').at(0);
	const month = _date.split('-').at(1);
	const day = _date.split('-').at(2);
	const hour = time.split(':').at(0);
	const minute = time.split(':').at(1);
	const seconds = time.split(':').at(2).slice(0, 2);
	const milliseconds = time.split('.').at(1).slice(0, 3);
	return `${year}${month}${day}${hour}${minute}${seconds}${milliseconds}`;
}

/** Hash string using bcrypt-js */
export async function hashWithBcrypt(data: string, saltRounds?: number): Promise<string> {
	if (!data) {
		throw new Error('Cannot hash a null/undefined data!')
	}
	const salt = await genSalt(saltRounds);
	return await hash(data, salt);
}

/** Validates hashed string using bcrypt-js */
export async function validateHashWithBcrypt(plainData: string, hashedData: string) {
	if (!plainData || !hashedData) return false;
	return await compare(plainData, hashedData);
}

/** Clone object/array deep */
export function deepClone<TData = ObjectType>(data: TData) {
	// const objectIsValid = typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
	// const arrayIsValid = Array.isArray(data) && data?.length > 0;
	if (!data || typeof data !== 'object') return data
	return cloneDeep(data);
}

/** Remove duplicate from an array */
export function removeDuplicates<TData extends any[]>(dataList: TData, property?: string[]) {
	if (!dataList || !dataList.length || !Array.isArray(dataList)) return dataList;
	const dataSet = new Set();
	return dataList.filter(data => {
		const condition = (property.length && typeof data === 'object') ? property.toString() : data;
		if (dataSet.has(condition)) return false;
		dataSet.add(condition);
		return true;
	});
}

/** Send message to Telegram */
export async function sendMessageToTelegram({ chatId, secret, message }: {
	chatId: string;
	secret: string;
	message: string;
}) {
	return await sendHttpRequest({
		url: `https://api.telegram.org/bot${secret}/sendMessage`,
		method: 'post',
		data: {
			chat_id: chatId,
			text: message,
			parse_mode: 'Markdown'
		}
	});
}

/** Write file to lambda function `/tmp` folder... Errors if not in lambda environment */
export async function writeFileToLambda({ fileName, file }: {
	fileName?: string;
	file: string | NodeJS.ArrayBufferView | File;
}) {
	return new Promise<string>(async (resolve, reject) => {
		try {
			if (!file) return null;
			if (!isLambdaEnvironment()) {
				reject('Not in lambda environment!');
			}
			const inferredName = file instanceof File ? file.name : fileName;
			const filePath = path.join('/tmp', inferredName);
			if (file instanceof File) {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				fs.writeFileSync(filePath, buffer);
			} else {
				fs.writeFileSync(filePath, file);
			}
			resolve(filePath);
		} catch (error) {
			reject(error);
		}
	});
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
			if (!fs.existsSync(filePath)) return resolve(null);
			const file = fs.readFileSync(filePath);
			resolve(file);
		} catch (error) {
			reject(error);
		}
	});
}

/** Check if currently in Lambda environment */
export async function isLambdaEnvironment() {
	return process.env?.LAMBDA_TASK_ROOT !== undefined || process.env?.AWS_LAMBDA_FUNCTION_NAME !== undefined;
}

/** Map and return API operation results */
export function apiResult<TBody extends ObjectType | ObjectType[]>({ data, message, error }: {
	data?: TBody;
	message?: string;
	error?: ObjectType;
}) {
	return {
		data: data || null,
		message: message || null,
		error: error || null
	} as const;
}

/** Return API call response */
export function returnApiResponse<TBody extends ObjectType | ObjectType[]>(res: Response, data: { data?: TBody; message?: string; error?: ObjectType; }, statusCode = 200) {
	return res.status(statusCode).json({ statusCode, ...data });
}