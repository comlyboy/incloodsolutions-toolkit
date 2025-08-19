import { cloneDeep } from 'lodash';
import { compile, RuntimeOptions } from 'handlebars';
import { toBuffer as qrBarcodeFn, RenderOptions } from 'bwip-js';
// import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Builder, BuilderOptions, Parser, ParserOptions } from 'xml2js';
import { getAllCountries, getAllTimezones } from 'countries-and-timezones';
import { v7 as uuidv7, v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { CountryCode, PhoneNumber, parsePhoneNumberFromString, parsePhoneNumberWithError } from 'libphonenumber-js';

import { ObjectType } from '../interface';
import { CustomException } from '../error';

/** Generates ISO date */
export function generateISODate(date?: string | number | Date) {
	return date ? new Date(date).toISOString() : new Date().toISOString();
}

/** Generates random ID, number, alphabet, or mixed */
export function generateRandomId({ length = 6, variant = 'numeric' }: {
	length?: number;
	variant?: 'alphabet' | 'numeric' | 'alphanumeric';
} = {}) {
	let randomId = '';
	const numbers = '0123456789';
	const letters = 'abcdefghijklmnopqrstuvwxyz';
	let toggle = true; // Helps alternate letters and numbers in 'mixed'

	while (randomId.length < length) {
		if (variant === 'alphabet') {
			randomId += letters[Math.floor(Math.random() * letters.length)];
		} else if (variant === 'numeric') {
			randomId += numbers[Math.floor(Math.random() * numbers.length)];
		} else {
			// Ensures alternating between letters and numbers for a fair mix
			randomId += toggle
				? letters[Math.floor(Math.random() * letters.length)]
				: numbers[Math.floor(Math.random() * numbers.length)];
			toggle = !toggle; // Flip for next iteration
		}
	}
	// Slice the accumulated ID to maintain exact length
	return randomId.slice(0, length);
}

/**
 * Transforms a text string based on the specified format type.
 *
 * Supported formats:
 * - `"uppercase"`: Converts all text to uppercase.
 * - `"lowercase"`: Converts all text to lowercase.
 * - `"capitalize"`: Capitalises the first letter of each word.
 * - `"titlecase"`: Capitalises the first letter of the text.
 * - `"kebab"`: Converts all text to kebab (e.g., hello-world).
 *
 * @param {Object} options - Options object.
 * @param {string} options.text - The input text to transform.
 * @param {"uppercase" | "lowercase" | "titlecase" | "capitalize" | "kebab"} options.format - The transformation type.
 * @returns {string} - The transformed text.
 *
 * @example
 * transformText({ text: 'hello world', format: 'capitalize' });
 * // Returns: "Hello World"
 */
export function transformText({ text, format, trim = false }: {
	text: string;
	trim?: boolean;
	format?: 'uppercase' | 'lowercase' | 'titlecase' | 'capitalize' | 'kebab';
}): string {
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
		text = text.toLowerCase().replace(/^./, text[0].toUpperCase());
	}
	if (format === 'kebab') {
		text = text.replace(/\s+/g, '-');
	}
	if (trim) {
		text = text.trim();
	}
	return text;
}

export function isIsoDate(date: string): boolean {
	return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[-+]\d{2}:\d{2})?)?$/.test(date);
}

/** Generates customized uuid. v7 is default */
export function generateCustomUUID({ asUpperCase = false, symbol, version = 7 }: {
	asUpperCase?: boolean;
	symbol?: string;
	version?: 4 | 7;
} = {}): string {
	let uuid = version === 4 ? uuidv4() : uuidv7();
	uuid = symbol && symbol.trim() ? uuid.replace(/-/g, symbol) : uuid;
	return asUpperCase ? uuid.toUpperCase() : uuid;
}

/** Check if a string is uuid */
export function isValidUUID(uuid: string) {
	return uuidValidate(uuid);
}

/** Check if a string contains uuid */
export function containsUUID(input: string): boolean {
	const matches = input.match(
		/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
	);
	return matches && matches.length > 0;
}

/** Send Http request with Axios. */
export async function sendHttpRequest<TResponse = any, TBody extends ObjectType = any>(options: AxiosRequestConfig<TBody>) {
	try {
		const response = await axios({ headers: {}, ...options }) as unknown as AxiosResponse<TResponse, TBody>;
		return await response.data as TResponse;
	} catch (error) {
		const errorObject = error?.response?.data;
		const message = errorObject?.message || errorObject || error?.message || 'Http call errored out!';
		throw { ...errorObject, message };
	}
}

/** Throws error if the phonenumber format isn't correct */
export function parsePhonenumberOrError(phoneNumber: string, defaultCountry?: CountryCode): PhoneNumber {
	if (!phoneNumber || phoneNumber === ' ') {
		throw new CustomException('Invalid phoneNumber format!');
	}
	return parsePhoneNumberWithError(phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`, defaultCountry);
}

/** Returns undefined if the phonenumber format isn't correct */
export function parsePhonenumber(phoneNumber: string, defaultCountry?: CountryCode): PhoneNumber | undefined {
	if (!phoneNumber.trim() || phoneNumber === ' ') return undefined;
	return parsePhoneNumberFromString(phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`, defaultCountry);
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
export async function generateQrBarcode<TData extends ObjectType | string>(qrData: TData, options?: {
	type?: 'qrcode' | 'barcode';
}): Promise<string> {

	const renderOptions: RenderOptions = {
		...options || {},
		bcid: options?.type === 'barcode' ? 'code128' : "qrcode",
		text: typeof qrData === 'object' ? JSON.stringify(qrData) : qrData,
		paddingwidth: options?.type === 'barcode' ? 3 : 5,
		paddingheight: options?.type === 'barcode' ? 3 : 5,
		scale: options?.type === 'barcode' ? 16 : 10,
		includetext: true,
		textyoffset: 4,
		barcolor: '3B3D45',
		textxalign: 'center',
		backgroundcolor: 'ffffff',
	}

	if (options?.type === 'qrcode') {
		renderOptions.width = 120;
		renderOptions.height = 120;
	}

	const pngBuffer = await qrBarcodeFn({ ...renderOptions });
	return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

/** Gets current date as number... e.g 20240412-010255666 or 20240412010255666 */
export function generateDateInNumber({ date, withSeparation }: {
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
	return `${year}${month}${day}${hour}${withSeparation ? '-' : ''}${minute}${seconds}${milliseconds}`;
}

/** Clone object/array deep */
export function deepClone<TData = ObjectType>(data: TData) {
	// const objectIsValid = typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
	// const arrayIsValid = Array.isArray(data) && data?.length > 0;
	if (!data || typeof data !== 'object') return data;
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
	try {
		return await sendHttpRequest({
			url: `https://api.telegram.org/bot${secret}/sendMessage`,
			method: 'post',
			data: { chat_id: chatId, text: message, parse_mode: 'Markdown' }
		});
	} catch (error) {
		throw new CustomException(error.description, error.error_code);
	}
}

/** Get all country names and timezones */
export function getCountryTimezones(withDeprecated?: boolean) {
	return {
		countries: getAllCountries({ deprecated: withDeprecated }),
		timezones: getAllTimezones({ deprecated: withDeprecated })
	}
}

/** Encode URL */
export function encodeUrlComponent<TData = any>(data: TData) {
	return encodeURIComponent(typeof data === 'string' ? data : JSON.stringify(data));
}


/** Decode URL */
export function decodeUrlComponent<TType>(data: string) {
	return JSON.parse(decodeURIComponent(data)) as TType;
}

/** Converts XML data format into JSON format */
export async function xmlToJson<TResponse>(xmlData: string, options: ParserOptions) {
	return new Parser(options).parseStringPromise(xmlData) as TResponse;
}

/** Converts JSON data format into XML format */
export async function jsonToXml<TData>(dataObject: TData, options: BuilderOptions) {
	return new Promise<string>((resolve, reject) => {
		try {
			const builder = new Builder(options);
			resolve(builder.buildObject(dataObject));
		} catch (error) {
			reject(error);
		}
	});
}

/** Detects duplicated object property. Throws error when found */
export function detectDuplicateProperties<TObject extends ObjectType = any>({ data, parentKey = '' }: { data: TObject; parentKey?: string; }): void {
	const seen = new Set<string>();
	const duplicateKeys: string[] = [];

	function traverse(obj: ObjectType, parentKey: string) {
		Object.entries(obj).map(([key, value]) => {
			const fullKey = parentKey ? `${parentKey}.${key}` : key;

			if (seen.has(fullKey)) {
				duplicateKeys.push(fullKey);
			} else {
				seen.add(fullKey);
			}

			if (typeof value === 'object' && !Array.isArray(value) && (value !== null || value !== undefined)) {
				traverse(value, fullKey);
			}
		});
	}

	traverse(data, parentKey);

	if (duplicateKeys.length > 0) {
		throw new CustomException(`Duplicate properties detected: ${duplicateKeys.join(', ')}`);
	}
}

/** Compile HTML with handlebar library */
export function compileHtmlWithHandlebar<TData extends ObjectType>({ data, htmlString, runtimeOptions, compileOptions }: {
	data: TData;
	htmlString: string;
	compileOptions?: CompileOptions;
	runtimeOptions?: Omit<RuntimeOptions, 'partials'> & { partials?: ObjectType<string> };
}) {
	const templateDelegate = compile<TData>(htmlString, compileOptions);
	return templateDelegate(data, runtimeOptions as unknown as RuntimeOptions);
}