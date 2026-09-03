// `handlebars` is CJS-only and does not expose named ESM exports, so it must be
// default-imported for the built ESM bundle to load in a real ESM runtime
// (Node ESM, NestJS 12, Vite, ...). `RuntimeOptions` / `CompileOptions` are
// ambient global types from `@types/handlebars`.
import Handlebars from 'handlebars';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Builder, BuilderOptions, Parser, ParserOptions } from 'xml2js';
import {
	CountryCode,
	PhoneNumber,
	parsePhoneNumberFromString,
	parsePhoneNumberWithError,
} from 'libphonenumber-js';

import { ObjectType } from '../interface';
import { CustomException } from '../error';
import { nanoid } from 'nanoid';

/**
 * Checks whether a string is a valid ISO 8601 date or date-time.
 *
 * Accepts a bare calendar date (`2024-04-12`) or a full date-time with an
 * optional milliseconds component and an optional timezone (`Z` or `±HH:MM`),
 * e.g. `2024-04-12T01:02:55.666Z`.
 *
 * @param date - The string to test.
 * @returns `true` when the string matches the ISO 8601 pattern, otherwise `false`.
 *
 * @example
 * isIsoDate('2024-04-12');                    // true
 * isIsoDate('2024-04-12T01:02:55.666Z');      // true
 * isIsoDate('12/04/2024');                    // false
 */
export function isIsoDate(date: string): boolean {
	return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[-+]\d{2}:\d{2})?)?$/.test(
		date,
	);
}

/**
 * Converts a date to an ISO 8601 string.
 *
 * @param date - A `Date`, epoch number, or parsable date string. When omitted,
 *   the current date and time is used.
 * @returns The ISO 8601 representation, e.g. `2024-04-12T01:02:55.666Z`.
 *
 * @example
 * generateISODate();                 // now, e.g. "2024-04-12T01:02:55.666Z"
 * generateISODate(1712883775666);    // "2024-04-12T01:02:55.666Z"
 * generateISODate('2024-04-12');     // "2024-04-12T00:00:00.000Z"
 */
export function generateISODate(date?: string | number | Date) {
	return date ? new Date(date).toISOString() : new Date().toISOString();
}

/**
 * Generates a pseudo-random identifier.
 *
 * Uses `Math.random()` and is **not** cryptographically secure. For tokens and
 * secrets prefer {@link generateNanoid} or a crypto-backed generator.
 *
 * @param options - Generation options.
 * @param options.length - Length of the generated ID. Defaults to `6`.
 * @param options.variant - Character set to draw from. Defaults to `'numeric'`.
 *   - `'numeric'`: digits `0-9` only.
 *   - `'alphabet'`: lowercase letters `a-z` only.
 *   - `'alphanumeric'`: alternates one letter then one digit for an even mix.
 * @returns A string of exactly `length` characters.
 *
 * @example
 * generateRandomId();                                  // e.g. "480913"
 * generateRandomId({ length: 8, variant: 'alphabet' }); // e.g. "qmzkbwra"
 * generateRandomId({ length: 6, variant: 'alphanumeric' }); // e.g. "a1b2c3"
 */
export function generateRandomId({
	length = 6,
	variant = 'numeric',
}: {
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
 * Reformats a string according to a casing/spacing style.
 *
 * Non-string or empty input is returned unchanged. When no `format` is given the
 * text is returned as-is (subject only to `trim`).
 *
 * @param options - Transformation options.
 * @param options.text - The input string to transform.
 * @param options.trim - Trim surrounding whitespace after formatting. Defaults to `false`.
 * @param options.format - The style to apply:
 *   - `'uppercase'`: `HELLO WORLD`
 *   - `'lowercase'`: `hello world`
 *   - `'capitalize'`: `Hello World` (first letter of every word)
 *   - `'titlecase'`: `Hello world` (first letter of the string only)
 *   - `'kebab'`: `hello-world` (whitespace runs replaced with a single `-`)
 * @returns The transformed string.
 *
 * @example
 * transformText({ text: 'hello world', format: 'capitalize' }); // "Hello World"
 * transformText({ text: '  Scalable Systems  ', format: 'kebab', trim: true }); // "Scalable-Systems"
 */
export function transformText({
	text,
	format,
	trim = false,
}: {
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
		text = text
			.toLowerCase()
			.replace(/\b\w/g, (match: string) => match.toUpperCase());
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

/**
 * Generates a URL-safe unique ID using the `nanoid` library.
 *
 * @param size - Number of characters to generate. Defaults to `10`.
 * @returns A random `nanoid` string.
 *
 * @example
 * generateNanoid();    // e.g. "V1StGXR8_Z"
 * generateNanoid(21);  // default nanoid length
 */
export function generateNanoid(size = 10) {
	return nanoid(size);
}

/**
 * Checks whether a string contains a UUID (version 1–5) anywhere within it.
 *
 * @param input - The string to search.
 * @returns `true` when at least one UUID is found, otherwise `false`.
 *
 * @example
 * containsUUID('user/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/profile'); // true
 * containsUUID('no id here'); // false
 */
export function containsUUID(input: string): boolean {
	const matches = input.match(
		/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
	);
	return matches && matches.length > 0;
}

/**
 * Sends an HTTP request with Axios and resolves directly to the response body.
 *
 * An empty `headers` object is applied by default and merged with anything you
 * pass in `options`. On failure the rejection is a normalised plain object that
 * always has a `message` string (taken from the response body, then the response
 * body itself, then the Axios error message, then a generic fallback).
 *
 * @typeParam TResponse - Expected shape of the response body.
 * @typeParam TBody - Shape of the request body.
 * @param options - Standard Axios request config (`url`, `method`, `data`, ...).
 * @returns A promise resolving to `response.data` typed as `TResponse`.
 * @throws A normalised `{ ...responseBody, message: string }` object on any request error.
 *
 * @example
 * const user = await sendHttpRequest<User>({ url: '/users/1' });
 */
export async function sendHttpRequest<
	TResponse = any,
	TBody extends ObjectType = any,
>(options: AxiosRequestConfig<TBody>) {
	try {
		const response = (await axios({
			headers: {},
			...options,
		})) as unknown as AxiosResponse<TResponse, TBody>;
		return (await response.data) as TResponse;
	} catch (error) {
		const errorObject = error?.response?.data;
		const message =
			errorObject?.message ||
			errorObject ||
			error?.message ||
			'Http call errored out!';
		throw { ...errorObject, message };
	}
}

/**
 * Parses a phone number with `libphonenumber-js`.
 *
 * A leading `+` is added automatically when missing. By default an invalid or
 * empty number resolves to `undefined`; set `throwUnfound` to make it throw
 * instead (a `CustomException` for empty input, or the underlying parser error).
 *
 * @param phoneNumber - The raw phone number string.
 * @param options - Parsing options.
 * @param options.throwUnfound - Throw on invalid/empty input instead of returning `undefined`. Defaults to `false`.
 * @param options.defaultCountry - ISO 3166-1 alpha-2 country used to resolve national-format numbers, e.g. `'NG'`.
 * @param options.defaultCallingCode - Default calling code used when no country is supplied.
 * @param options.extract - Passed through to the parser; extract a number embedded in surrounding text.
 * @returns A `PhoneNumber` instance, or `undefined` when parsing fails and `throwUnfound` is not set.
 * @throws {CustomException} When input is empty and `throwUnfound` is `true`.
 *
 * @example
 * parsePhonenumber('8031234567', { defaultCountry: 'NG' })?.number; // "+2348031234567"
 * parsePhonenumber('not a number'); // undefined
 */
export function parsePhonenumber(
	phoneNumber: string,
	options?: {
		throwUnfound?: boolean;
		defaultCountry?: CountryCode;
		defaultCallingCode?: string;
		extract?: boolean;
	},
): PhoneNumber | undefined {
	if (!phoneNumber.trim() || !phoneNumber) {
		if (options?.throwUnfound) {
			throw new CustomException('Invalid phoneNumber format!');
		}
		return undefined;
	}

	const phonenumber = phoneNumber?.startsWith('+')
		? phoneNumber
		: `+${phoneNumber}`;

	if (options?.throwUnfound) {
		return parsePhoneNumberWithError(phonenumber, { ...options });
	}
	return parsePhoneNumberFromString(phonenumber, { ...options });
}

/**
 * Recursively removes "empty" properties from an object.
 *
 * A property is dropped when its value is `undefined`, `null`, `''`, or the
 * literal string `'undefined'`. Arrays and non-objects are returned unchanged.
 *
 * @typeParam TData - Shape of the object being sanitised.
 * @param options - Sanitisation options.
 * @param options.data - The object to sanitise.
 * @param options.keysToRemove - Keys that should be preserved even if empty
 *   (the current filter keeps a key when it is **not** in this list). Defaults to `[]`.
 * @returns A new object with empty properties removed.
 *
 * @example
 * sanitizeObject({ data: { name: 'Ada', middleName: '', age: null } });
 * // => { name: 'Ada' }
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
 * Builds a compact numeric timestamp string.
 *
 * Format: `YYYYMMDDHH[-]MMSSmmm` — year, month, day, hour, an optional `-`
 * separator, then minute, seconds, and milliseconds.
 *
 * @param options - Options.
 * @param options.date - Source date (`Date`, epoch, or string). Defaults to now.
 * @param options.withSeparation - Insert a `-` between the hour and minute segments. Defaults to `false`.
 * @returns The numeric timestamp string.
 *
 * @example
 * generateDateInNumber();                        // "20240412010255666"
 * generateDateInNumber({ withSeparation: true }); // "2024041201-0255666"
 */
export function generateDateInNumber({
	date,
	withSeparation,
}: {
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

/**
 * Deep-clones an object or array using the structured-clone algorithm.
 *
 * Primitives (and `null`) are returned unchanged. Values that are not
 * structured-cloneable (functions, DOM nodes, class instances with private
 * state, ...) will throw, per `structuredClone` semantics.
 *
 * @typeParam TData - Type of the value being cloned.
 * @param data - The value to clone.
 * @returns A deep copy of `data`.
 *
 * @example
 * const copy = cloneDeep({ tags: ['a', 'b'], meta: { n: 1 } });
 */
export function cloneDeep<TData = ObjectType>(data: TData) {
	// const objectIsValid = typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
	// const arrayIsValid = Array.isArray(data) && data?.length > 0;
	if (!data || typeof data !== 'object') return data;
	return structuredClone(data);
}

/**
 * Removes duplicate entries from an array.
 *
 * For primitive elements, equality is by value. When `property` is provided and
 * an element is an object, the join of those property names is used as the
 * dedupe key.
 *
 * @typeParam TData - The array type.
 * @param dataList - The array to de-duplicate. Non-arrays are returned unchanged.
 * @param property - Property names used to build the comparison key for object elements.
 * @returns A new array with duplicates removed, preserving first-seen order.
 *
 * @example
 * removeDuplicates([1, 1, 2, 3, 3]); // [1, 2, 3]
 */
export function removeDuplicates<TData extends any[]>(
	dataList: TData,
	property?: string[],
) {
	if (!dataList || !dataList.length || !Array.isArray(dataList))
		return dataList;
	const dataSet = new Set();
	return dataList.filter((data) => {
		const condition =
			property.length && typeof data === 'object' ? property.toString() : data;
		if (dataSet.has(condition)) return false;
		dataSet.add(condition);
		return true;
	});
}

/**
 * Sends a Markdown-formatted message to a Telegram chat via the Bot API.
 *
 * @param options - Message options.
 * @param options.chatId - Target chat ID (`chat_id`).
 * @param options.secret - Telegram bot token.
 * @param options.message - Message text. Parsed with `parse_mode: 'Markdown'`.
 * @returns The Telegram API response body.
 * @throws {CustomException} Wrapping the Telegram error `description` and `error_code` on failure.
 *
 * @example
 * await sendMessageToTelegram({ chatId: '12345', secret: process.env.TELEGRAM_BOT_TOKEN, message: '*Deploy done*' });
 */
export async function sendMessageToTelegram({
	chatId,
	secret,
	message,
}: {
	chatId: string;
	secret: string;
	message: string;
}) {
	try {
		return await sendHttpRequest({
			url: `https://api.telegram.org/bot${secret}/sendMessage`,
			method: 'post',
			data: { chat_id: chatId, text: message, parse_mode: 'Markdown' },
		});
	} catch (error) {
		throw new CustomException(error.description, error.error_code);
	}
}

/**
 * URL-encodes a value for use in a query string or path segment.
 *
 * Strings are encoded directly; any other value is `JSON.stringify`-ed first.
 * Pair with {@link decodeUrlComponent} to round-trip structured data.
 *
 * @typeParam TData - Type of the value being encoded.
 * @param data - The value to encode.
 * @returns The percent-encoded string.
 *
 * @example
 * encodeUrlComponent({ q: 'a b', page: 2 }); // "%7B%22q%22%3A%22a%20b%22%2C%22page%22%3A2%7D"
 */
export function encodeUrlComponent<TData = any>(data: TData) {
	return encodeURIComponent(
		typeof data === 'string' ? data : JSON.stringify(data),
	);
}

/**
 * Decodes a string produced by {@link encodeUrlComponent} back into a value.
 *
 * The decoded string is always `JSON.parse`-d, so it must be valid JSON.
 *
 * @typeParam TType - Expected type of the decoded value.
 * @param data - The percent-encoded, JSON-stringified string.
 * @returns The parsed value typed as `TType`.
 *
 * @example
 * decodeUrlComponent<{ q: string }>(encoded).q;
 */
export function decodeUrlComponent<TType>(data: string) {
	return JSON.parse(decodeURIComponent(data)) as TType;
}

/**
 * Parses an XML string into a JavaScript object using `xml2js`.
 *
 * @typeParam TResponse - Expected shape of the parsed result.
 * @param xmlData - The XML document as a string.
 * @param options - `xml2js` {@link ParserOptions} (e.g. `explicitArray`, `trim`).
 * @returns A promise resolving to the parsed object.
 *
 * @example
 * const obj = await xmlToJson<{ note: unknown }>('<note><to>A</to></note>', { explicitArray: false });
 */
export async function xmlToJson<TResponse>(
	xmlData: string,
	options: ParserOptions,
) {
	return new Parser(options).parseStringPromise(xmlData) as TResponse;
}

/**
 * Serialises a JavaScript object into an XML string using `xml2js`.
 *
 * @typeParam TData - Type of the object being serialised.
 * @param dataObject - The object to convert.
 * @param options - `xml2js` {@link BuilderOptions} (e.g. `rootName`, `headless`).
 * @returns A promise resolving to the XML string.
 *
 * @example
 * const xml = await jsonToXml({ note: { to: 'A' } }, { headless: true });
 */
export async function jsonToXml<TData>(
	dataObject: TData,
	options: BuilderOptions,
) {
	return new Promise<string>((resolve, reject) => {
		try {
			const builder = new Builder(options);
			resolve(builder.buildObject(dataObject));
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Recursively walks an object and throws when the same dotted key path appears twice.
 *
 * Useful for guarding merged configuration or environment maps against
 * accidental overrides.
 *
 * @typeParam TObject - Shape of the object being checked.
 * @param options - Options.
 * @param options.data - The object to inspect.
 * @param options.parentKey - Prefix applied to every key path, for nested calls. Defaults to `''`.
 * @returns Nothing. Completes silently when no duplicates are found.
 * @throws {CustomException} `Duplicate properties detected: <paths>` when a repeated key path is found.
 *
 * @example
 * detectDuplicateProperties({ data: { a: { b: 1 }, 'a.b': 2 } }); // throws
 */
export function detectDuplicateProperties<TObject extends ObjectType = any>({
	data,
	parentKey = '',
}: {
	data: TObject;
	parentKey?: string;
}): void {
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

			if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				(value !== null || value !== undefined)
			) {
				traverse(value, fullKey);
			}
		});
	}

	traverse(data, parentKey);

	if (duplicateKeys.length > 0) {
		throw new CustomException(
			`Duplicate properties detected: ${duplicateKeys.join(', ')}`,
		);
	}
}

/**
 * Compiles and renders a Handlebars template in one call.
 *
 * @typeParam TData - Shape of the template context.
 * @param options - Options.
 * @param options.data - The context object passed to the compiled template.
 * @param options.htmlString - The raw Handlebars template source.
 * @param options.compileOptions - Handlebars `CompileOptions` (e.g. `noEscape`, `strict`).
 * @param options.runtimeOptions - Handlebars runtime options. `partials` may be supplied
 *   as a `{ [name]: string }` map of template sources.
 * @returns The rendered string.
 *
 * @example
 * compileHtmlWithHandlebar({ data: { name: 'Ada' }, htmlString: 'Hi {{name}}' }); // "Hi Ada"
 */
export function compileHtmlWithHandlebar<TData extends ObjectType>({
	data,
	htmlString,
	runtimeOptions,
	compileOptions,
}: {
	data: TData;
	htmlString: string;
	compileOptions?: CompileOptions;
	runtimeOptions?: Omit<RuntimeOptions, 'partials'> & {
		partials?: ObjectType<string>;
	};
}) {
	const templateDelegate = Handlebars.compile<TData>(
		htmlString,
		compileOptions,
	);
	return templateDelegate(data, runtimeOptions as unknown as RuntimeOptions);
}

/**
 * Writes a formatted line to `console.log` without a logging library.
 *
 * Output shape: `<UTC date> - LOG [context] message <data>`. Colours and the
 * leading date are opt-in.
 *
 * @param context - Short label shown in brackets, e.g. a module or function name.
 * @param message - The message text.
 * @param data - Optional payload appended to the line (object, array, etc.).
 * @param options - Formatting options.
 * @param options.prettify - Apply ANSI colours to the label, context, and message. Defaults to `false`.
 * @param options.ignoreDate - Omit the leading UTC timestamp. Defaults to `false`.
 *
 * @example
 * printLog('Auth', 'user signed in', { id: 1 });
 * printLog('Auth', 'user signed in', undefined, { prettify: true, ignoreDate: true });
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
 * Fetches a public Google Sheet as CSV, via the sheet's built-in `/export` endpoint.
 *
 * No authentication is performed, so the spreadsheet must be shared as
 * **"Anyone with the link can view"** (or published to the web). Internally
 * delegates to {@link sendHttpRequest}, so the same error-normalisation applies;
 * note that a private/inaccessible sheet does not fail loudly — Google responds
 * with `200` and an HTML sign-in page instead of CSV, so validate the response
 * shape before parsing it.
 *
 * @param options - Options.
 * @param options.sheetId - The spreadsheet ID — the segment between `/d/` and
 *   `/edit` in the sheet's URL, e.g.
 *   `https://docs.google.com/spreadsheets/d/`**`1AbCsheetId`**`/edit`.
 * @param options.gid - The `gid` of a specific tab (found in the URL as
 *   `#gid=...` after opening that tab). When omitted, the spreadsheet's default
 *   (first visible) sheet is exported.
 * @returns A promise resolving to the sheet's contents as raw CSV text. Axios only
 *   parses JSON responses, and this endpoint responds `text/csv`, so the body
 *   always arrives as an unparsed `string` — split/parse it yourself (e.g. with
 *   a CSV parser) to get rows and columns.
 *
 * @example
 * const csv = await fetchGoogleSheet({ sheetId: '1AbCsheetId', gid: '123456789' });
 */
export async function fetchGoogleSheet({
	sheetId,
	gid,
}: {
	sheetId: string;
	gid?: string;
}): Promise<string> {
	const url = new URL(
		`https://docs.google.com/spreadsheets/d/${sheetId}/export`,
	);
	url.searchParams.set('format', 'csv');
	if (gid) {
		url.searchParams.set('gid', gid);
	}
	return sendHttpRequest<string>({ url: url.toString() });
}
