import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AES, enc } from 'crypto-js';
import parsePhoneNumberFromString, { CountryCode, PhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';
import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { compare, genSalt, hash } from 'bcryptjs';
import cloneDeep from 'lodash.clonedeep';

import { ObjectType } from 'src/interfaces';

/** Generates ISO date */
export function generateISODate(date?: string | number | Date) {
	return date ? new Date(date).toISOString() : new Date().toISOString();
}

/** Transform text */
export function transformText({ text, format, trim = false }: {
	text: string;
	format?: 'uppercase' | 'lowercase' | 'titlecase' | 'capitalize';
	trim?: boolean
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
export async function sendHttpRequest<TResponse = any, TBody extends Record<string, any> = any>(options: AxiosRequestConfig<TBody>) {
	try {
		const response = await axios({ ...options }) as unknown as AxiosResponse<TResponse, TBody>;
		return response.data as TResponse;
	} catch (error) {
		const errorObject = error?.response.data;
		const message = errorObject?.message || errorObject || error.message || 'Http call errored out!';
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
	keysToRemove?: string[];
}): TData {
	const isValidObject = !Object.keys(data).length || typeof data !== 'object' || Array.isArray(data);
	if (isValidObject) return data;
	return Object.fromEntries(
		Object.entries(data)
			.filter(([_, value]) => ![undefined, null, '', 'undefined'].includes(value))
			.map(([key, value]) => [key, sanitizeObject(value)])
	) as TData;

}

/** Encrypted data using crypto-js. */
export function encryptData<TData>({ data, secret }: {
	data: TData;
	secret: string;
}): string {
	try {
		if (!data) return null;
		const dataToString = typeof data === 'string' ? data : JSON.stringify(data);
		return AES.encrypt(dataToString, secret).toString();
	} catch (error) {
		error['message'] = 'Encryption errored out!';
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
		const dataInBytes = AES.decrypt(hashedData, secret);
		return JSON.parse(dataInBytes.toString(enc.Utf8)) as TResponse;
	} catch (error) {
		error['message'] = 'Decryption errored out!';
		throw error;
	}
}

/** Generate qrcode as base64 string */
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
		if (validator.isIP(ipCurrent)) {
			return ipCurrent;
		}
	}

	if (remoteAddress && typeof remoteAddress === "string" && validator.isIP(remoteAddress)) {
		return remoteAddress;
	}

	if (ipAddress && typeof ipAddress === "string" && validator.isIP(ipAddress)) {
		return ipAddress;
	}

	return ''
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
	const salt = await genSalt(saltRounds);
	return await hash(data, salt);
}

/** Validates hashed string using bcrypt-js */
export async function validateWithBcrypt(plainData: string, hashedData: string) {
	return compare(plainData, hashedData);
}

/** Clone object/array deep */
export function deepClone<TData = ObjectType>(data: TData) {
	// const objectIsValid = typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
	// const arrayIsValid = Array.isArray(data) && data?.length > 0;
	if (!data || typeof data !== 'object') return data
	return cloneDeep(data);
}
