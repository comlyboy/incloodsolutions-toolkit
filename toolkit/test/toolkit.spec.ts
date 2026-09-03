/**
 * Behaviour tests for every exported member of `@incloodsolutions/toolkit`.
 *
 * Run: `npm test`  (watch: `npm run test:watch`)
 *
 * The only mocked dependency is `axios` — used by `sendHttpRequest`,
 * `sendMessageToTelegram`, and `fetchGoogleSheet`, so nothing here touches the
 * network. Everything else (nanoid, libphonenumber-js, handlebars, xml2js, zod,
 * validator) runs for real.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KNOWN BUGS this suite pins down (tests assert the *current* behaviour and are
 * named "known bug"; fix the source, then flip these tests):
 *
 *   1. sanitizeObject(...)          throws for any object that has a non-empty
 *                                   value — the recursive call passes the raw
 *                                   value instead of `{ data: value }`, and the
 *                                   keep/drop filter keeps every key when
 *                                   `keysToRemove` is the default `[]`.
 *   2. removeDuplicates(list)       throws when `property` is omitted
 *                                   (`property.length` on `undefined`), and when
 *                                   `property` IS given it collapses every
 *                                   object to one entry (uses the property
 *                                   *names* as the key, not their values).
 *   3. detectDuplicateProperties    throws on any object containing a `null`
 *                                   value (`value !== null || value !== undefined`
 *                                   is always true, so it recurses into `null`).
 *   4. generateISODate(0)           returns "now" instead of the epoch, because
 *                                   `0` is falsy.
 *   5. containsUUID(noMatch)        returns `null`, not `false`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import * as toolkit from '../src/index';
import {
	AppEnvironmentEnum,
	BooleanValidationSchema,
	CountryCodeValidationSchema,
	CurrencyCodeValidationSchema,
	CustomException,
	DateTimeValidationSchema,
	DescriptionValidationSchema,
	EmailValidationSchema,
	FileExtensionValidationSchema,
	FirstNameValidationSchema,
	HexColorValidationSchema,
	IpAddressValidationSchema,
	LanguageCodeValidationSchema,
	LastNameValidationSchema,
	LatitudeValidationSchema,
	LongitudeValidationSchema,
	MimeTypeValidationSchema,
	NameValidationSchema,
	NonNegativeNumberValidationSchema,
	OtpValidationSchema,
	PageSizeValidationSchema,
	PageValidationSchema,
	PasswordValidationSchema,
	PhoneNumberValidationSchema,
	PositiveNumberValidationSchema,
	RequiredStringValidationSchema,
	ResponseMessageEnum,
	SearchQueryValidationSchema,
	SlugValidationSchema,
	TokenValidationSchema,
	UrlValidationSchema,
	UsernameValidationSchema,
	UuidValidationSchema,
	cloneDeep,
	compileHtmlWithHandlebar,
	containsUUID,
	decodeUrlComponent,
	detectDuplicateProperties,
	encodeUrlComponent,
	fetchGoogleSheet,
	generateDateInNumber,
	generateISODate,
	generateNanoid,
	generateRandomId,
	isEmail,
	isIsoDate,
	isJSON,
	isMongoId,
	isSlug,
	isStrongPassword,
	isUUID,
	isURL,
	jsonToXml,
	normalizeEmail,
	parsePhonenumber,
	printLog,
	removeDuplicates,
	sanitizeObject,
	sendHttpRequest,
	sendMessageToTelegram,
	transformText,
	trim,
	xmlToJson,
} from '../src/index';

vi.mock('axios', () => ({ default: vi.fn() }));
const mockedAxios = vi.mocked(axios);

const A_UUID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

/* ========================================================================== */
/* error — CustomException                                                     */
/* ========================================================================== */

describe('CustomException', () => {
	it('builds from a message string with the default 400 status', () => {
		const err = new CustomException('boom');
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(CustomException);
		expect(err.message).toBe('boom');
		expect(err.name).toBe('CustomException');
		expect(err.status).toBe(400);
		expect(err.statusCode).toBe(400);
	});

	it('uses an explicit status code', () => {
		const err = new CustomException('not found', 404);
		expect(err.status).toBe(404);
		expect(err.statusCode).toBe(404);
	});

	it('keeps status and statusCode in sync', () => {
		const err = new CustomException('x', 418);
		expect(err.status).toBe(err.statusCode);
	});

	it('wraps a native Error: message, cause, and stack are carried over', () => {
		const original = new Error('original failure');
		const err = new CustomException(original);
		expect(err.message).toBe('original failure');
		expect(err.status).toBe(400);
		expect(err.cause).toBe(original);
		expect(err.stack).toBe(original.stack);
	});

	it('reads status / statusCode off a wrapped Error', () => {
		const withStatus = Object.assign(new Error('nope'), { status: 403 });
		expect(new CustomException(withStatus).status).toBe(403);

		const withStatusCode = Object.assign(new Error('nope'), {
			statusCode: 409,
		});
		expect(new CustomException(withStatusCode).status).toBe(409);
	});

	it('re-wraps another CustomException, preserving message and status', () => {
		const inner = new CustomException('inner', 422);
		const outer = new CustomException(inner);
		expect(outer.message).toBe('inner');
		expect(outer.status).toBe(422);
		expect(outer.cause).toBe(inner);
	});

	it('accepts an error-like plain object', () => {
		const err = new CustomException({ message: 'bad request', status: 400 });
		expect(err.message).toBe('bad request');
		expect(err.status).toBe(400);

		const err2 = new CustomException({ message: 'conflict', statusCode: 409 });
		expect(err2.status).toBe(409);
	});

	it('falls back to a generic message for non-error values', () => {
		for (const value of [undefined, null, 42, true]) {
			const err = new CustomException(value);
			expect(err.message).toBe('An unexpected error occurred.');
			expect(err.status).toBe(400);
		}
	});

	it('lets an explicit statusCode win over the fallback for plain strings', () => {
		expect(new CustomException('x', 503).status).toBe(503);
	});

	it('honours an explicit options.cause over the derived one', () => {
		const explicit = new Error('explicit cause');
		const err = new CustomException('msg', 500, { cause: explicit });
		expect(err.cause).toBe(explicit);
	});
});

/* ========================================================================== */
/* utility                                                                     */
/* ========================================================================== */

describe('isIsoDate', () => {
	it.each([
		['2024-04-12', true],
		['2024-04-12T01:02:55', true],
		['2024-04-12T01:02:55.666Z', true],
		['2024-04-12T01:02:55+01:00', true],
		['2024-04-12T01:02:55.6', true],
		['2024/04/12', false],
		['12-04-2024', false],
		['2024-04-12T01:02', false],
		['not a date', false],
		['', false],
	])('isIsoDate(%j) === %j', (input, expected) => {
		expect(isIsoDate(input)).toBe(expected);
	});

	it('only checks the *shape* — it does not validate calendar ranges', () => {
		expect(isIsoDate('2024-13-45')).toBe(true);
	});
});

describe('generateISODate', () => {
	it('returns an ISO string for the current time when called with no arg', () => {
		const value = generateISODate();
		expect(isIsoDate(value)).toBe(true);
		expect(Number.isNaN(Date.parse(value))).toBe(false);
	});

	it('converts a date string to a full ISO timestamp', () => {
		expect(generateISODate('2024-04-12')).toBe('2024-04-12T00:00:00.000Z');
	});

	it('converts an epoch number', () => {
		expect(generateISODate(1_712_880_000_000)).toBe(
			new Date(1_712_880_000_000).toISOString(),
		);
	});

	it('converts a Date instance', () => {
		const d = new Date('2024-04-12T09:30:00.000Z');
		expect(generateISODate(d)).toBe('2024-04-12T09:30:00.000Z');
	});

	it('known bug: epoch 0 is treated as "no date" and returns now', () => {
		const value = generateISODate(0);
		expect(value).not.toBe('1970-01-01T00:00:00.000Z');
		expect(isIsoDate(value)).toBe(true);
	});
});

describe('generateRandomId', () => {
	it('defaults to a 6-character numeric id', () => {
		const id = generateRandomId();
		expect(id).toHaveLength(6);
		expect(id).toMatch(/^[0-9]{6}$/);
	});

	it('respects an explicit length', () => {
		expect(generateRandomId({ length: 20 })).toHaveLength(20);
	});

	it('variant "alphabet" yields lowercase letters only', () => {
		expect(generateRandomId({ length: 40, variant: 'alphabet' })).toMatch(
			/^[a-z]{40}$/,
		);
	});

	it('variant "alphanumeric" yields letters and digits', () => {
		const id = generateRandomId({ length: 40, variant: 'alphanumeric' });
		expect(id).toMatch(/^[a-z0-9]{40}$/);
		expect(id).toMatch(/[a-z]/);
		expect(id).toMatch(/[0-9]/);
	});
});

describe('transformText', () => {
	it('uppercase / lowercase', () => {
		expect(transformText({ text: 'Hi There', format: 'uppercase' })).toBe(
			'HI THERE',
		);
		expect(transformText({ text: 'Hi There', format: 'lowercase' })).toBe(
			'hi there',
		);
	});

	it('capitalize upper-cases the first letter of every word', () => {
		expect(
			transformText({ text: 'hello brave world', format: 'capitalize' }),
		).toBe('Hello Brave World');
	});

	it('titlecase upper-cases only the first letter of the string', () => {
		expect(transformText({ text: 'HELLO WORLD', format: 'titlecase' })).toBe(
			'Hello world',
		);
	});

	it('kebab replaces whitespace runs with a single hyphen (no case change)', () => {
		expect(transformText({ text: 'Hello   World Foo', format: 'kebab' })).toBe(
			'Hello-World-Foo',
		);
	});

	it('trim only strips whitespace, and runs after formatting', () => {
		expect(transformText({ text: '  spaced  ', trim: true })).toBe('spaced');
		// kebab turns the surrounding spaces into hyphens first, which trim cannot remove
		expect(
			transformText({ text: '  a b  ', format: 'kebab', trim: true }),
		).toBe('-a-b-');
	});

	it('returns non-string / empty input untouched', () => {
		expect(transformText({ text: '' })).toBe('');
		expect(transformText({ text: 123 as unknown as string })).toBe(123);
	});
});

describe('generateNanoid', () => {
	it('defaults to 10 url-safe characters', () => {
		const id = generateNanoid();
		expect(id).toHaveLength(10);
		expect(id).toMatch(/^[A-Za-z0-9_-]{10}$/);
	});

	it('respects an explicit size', () => {
		expect(generateNanoid(21)).toHaveLength(21);
	});

	it('produces distinct values', () => {
		expect(generateNanoid()).not.toBe(generateNanoid());
	});
});

describe('containsUUID', () => {
	it('detects a UUID embedded in a longer string', () => {
		expect(containsUUID(`user/${A_UUID}/profile`)).toBe(true);
	});

	it('known bug: returns null (not false) when there is no UUID', () => {
		expect(containsUUID('no id here at all')).toBeNull();
	});
});

describe('sendHttpRequest', () => {
	it('resolves to response.data and merges an empty headers object', async () => {
		mockedAxios.mockResolvedValueOnce({ data: { id: 1, name: 'Ada' } });

		const result = await sendHttpRequest({ url: '/users/1' });

		expect(result).toEqual({ id: 1, name: 'Ada' });
		expect(mockedAxios).toHaveBeenCalledWith({ headers: {}, url: '/users/1' });
	});

	it('normalises a rejection that has a response body', async () => {
		mockedAxios.mockRejectedValueOnce({
			response: { data: { message: 'Bad input', code: 'E_BAD' } },
		});

		await expect(sendHttpRequest({ url: '/x' })).rejects.toEqual({
			message: 'Bad input',
			code: 'E_BAD',
		});
	});

	it('normalises a bare Error rejection to { message }', async () => {
		mockedAxios.mockRejectedValueOnce(new Error('socket hang up'));

		await expect(sendHttpRequest({ url: '/x' })).rejects.toEqual({
			message: 'socket hang up',
		});
	});

	it('uses a generic fallback message when nothing else is available', async () => {
		mockedAxios.mockRejectedValueOnce({});

		await expect(sendHttpRequest({ url: '/x' })).rejects.toEqual({
			message: 'Http call errored out!',
		});
	});
});

describe('parsePhonenumber', () => {
	it('parses an international number (adds the leading +)', () => {
		expect(parsePhonenumber('2348031234567')?.number).toBe('+2348031234567');
		expect(parsePhonenumber('+2348031234567')?.number).toBe('+2348031234567');
	});

	it('returns undefined for an unparseable number', () => {
		expect(parsePhonenumber('not a number')).toBeUndefined();
	});

	it('returns undefined for blank input', () => {
		expect(parsePhonenumber('   ')).toBeUndefined();
	});

	it('throws a CustomException for blank input when throwUnfound is set', () => {
		expect(() => parsePhonenumber('', { throwUnfound: true })).toThrow(
			CustomException,
		);
	});

	it('throws the parser error for a bad number when throwUnfound is set', () => {
		expect(() => parsePhonenumber('nope', { throwUnfound: true })).toThrow();
	});
});

describe('sanitizeObject', () => {
	it('returns an empty object unchanged', () => {
		expect(sanitizeObject({ data: {} })).toEqual({});
	});

	it('returns arrays and non-objects unchanged', () => {
		expect(sanitizeObject({ data: [1, 2] as unknown as object })).toEqual([
			1, 2,
		]);
	});

	it('known bug: throws for any object that has a non-empty value', () => {
		expect(() =>
			sanitizeObject({ data: { name: 'Ada', middleName: '', age: null } }),
		).toThrow(TypeError);
	});
});

describe('generateDateInNumber', () => {
	it('builds a compact YYYYMMDDHHMMSSmmm string', () => {
		expect(generateDateInNumber({ date: '2024-04-12T01:02:55.666Z' })).toBe(
			'20240412010255666',
		);
	});

	it('inserts a hyphen between the hour and minute when asked', () => {
		expect(
			generateDateInNumber({
				date: '2024-04-12T01:02:55.666Z',
				withSeparation: true,
			}),
		).toBe('2024041201-0255666');
	});

	it('works with no argument (uses now)', () => {
		expect(generateDateInNumber()).toMatch(/^\d{17}$/);
	});
});

describe('cloneDeep', () => {
	it('deep-clones nested objects', () => {
		const source = { a: { b: [1, 2] }, c: 3 };
		const copy = cloneDeep(source);
		expect(copy).toEqual(source);
		expect(copy).not.toBe(source);
		expect(copy.a).not.toBe(source.a);
		expect(copy.a.b).not.toBe(source.a.b);
	});

	it('returns primitives and null unchanged', () => {
		expect(cloneDeep('str')).toBe('str');
		expect(cloneDeep(42)).toBe(42);
		expect(cloneDeep(null)).toBeNull();
	});
});

describe('removeDuplicates', () => {
	it('de-duplicates primitives (pass [] as the property list)', () => {
		expect(removeDuplicates([1, 1, 2, 3, 3, 2], [])).toEqual([1, 2, 3]);
		expect(removeDuplicates(['a', 'a', 'b'], [])).toEqual(['a', 'b']);
	});

	it('returns an empty array unchanged', () => {
		expect(removeDuplicates([], [])).toEqual([]);
	});

	it('known bug: throws when the property list is omitted', () => {
		expect(() => removeDuplicates([1, 1, 2])).toThrow(TypeError);
	});

	it('known bug: with a property list it collapses ALL objects to one entry', () => {
		// dedupe key is the property *names* ("id"), identical for every element,
		// so only the first object survives regardless of its id.
		expect(removeDuplicates([{ id: 1 }, { id: 2 }, { id: 3 }], ['id'])).toEqual(
			[{ id: 1 }],
		);
	});
});

describe('sendMessageToTelegram', () => {
	it('posts a Markdown message to the Bot API', async () => {
		mockedAxios.mockResolvedValueOnce({ data: { ok: true } });

		const result = await sendMessageToTelegram({
			chatId: '12345',
			secret: 'BOT_TOKEN',
			message: '*Deploy done*',
		});

		expect(result).toEqual({ ok: true });
		expect(mockedAxios).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://api.telegram.org/botBOT_TOKEN/sendMessage',
				method: 'post',
				data: {
					chat_id: '12345',
					text: '*Deploy done*',
					parse_mode: 'Markdown',
				},
			}),
		);
	});

	it('throws a CustomException when the request fails', async () => {
		mockedAxios.mockRejectedValueOnce({
			response: { data: { description: 'chat not found', error_code: 400 } },
		});

		await expect(
			sendMessageToTelegram({ chatId: 'x', secret: 'y', message: 'z' }),
		).rejects.toBeInstanceOf(CustomException);
	});
});

describe('encodeUrlComponent / decodeUrlComponent', () => {
	it('encodes a plain string with percent-encoding', () => {
		expect(encodeUrlComponent('a b/c')).toBe('a%20b%2Fc');
	});

	it('JSON-stringifies non-string values before encoding', () => {
		expect(encodeUrlComponent({ q: 'a b', page: 2 })).toBe(
			encodeURIComponent('{"q":"a b","page":2}'),
		);
	});

	it('round-trips objects, arrays and numbers', () => {
		const value = { q: 'search me', tags: ['x', 'y'], page: 3 };
		expect(decodeUrlComponent(encodeUrlComponent(value))).toEqual(value);
		expect(decodeUrlComponent(encodeUrlComponent([1, 2, 3]))).toEqual([
			1, 2, 3,
		]);
	});

	it('does NOT round-trip a bare string (decode always JSON.parses)', () => {
		expect(() =>
			decodeUrlComponent(encodeUrlComponent('plain text')),
		).toThrow();
	});
});

describe('xmlToJson / jsonToXml', () => {
	it('parses XML into an object', async () => {
		const parsed = await xmlToJson<{ note: { to: string } }>(
			'<note><to>Ada</to></note>',
			{ explicitArray: false },
		);
		expect(parsed).toEqual({ note: { to: 'Ada' } });
	});

	it('serialises an object into an XML string', async () => {
		const xml = await jsonToXml(
			{ to: 'Ada', body: 'hi' },
			{ rootName: 'note', headless: true, renderOpts: { pretty: false } },
		);
		expect(xml).toBe('<note><to>Ada</to><body>hi</body></note>');
	});

	it('round-trips object -> xml -> object', async () => {
		const xml = await jsonToXml(
			{ a: '1', b: '2' },
			{ rootName: 'r', headless: true },
		);
		const back = await xmlToJson<{ r: { a: string; b: string } }>(xml, {
			explicitArray: false,
		});
		expect(back).toEqual({ r: { a: '1', b: '2' } });
	});
});

describe('detectDuplicateProperties', () => {
	it('does nothing when there are no duplicate key paths', () => {
		expect(() =>
			detectDuplicateProperties({ data: { a: 1, b: 2, nested: { c: 3 } } }),
		).not.toThrow();
	});

	it('throws when a flattened key path collides with a real nested path', () => {
		expect(() =>
			detectDuplicateProperties({ data: { a: { b: 1 }, 'a.b': 2 } }),
		).toThrow(/Duplicate properties detected: a\.b/);
	});

	it('ignores array values', () => {
		expect(() =>
			detectDuplicateProperties({ data: { list: [1, 2, 3] } }),
		).not.toThrow();
	});

	it('known bug: throws on any object containing a null value', () => {
		expect(() =>
			detectDuplicateProperties({ data: { deletedAt: null } }),
		).toThrow(TypeError);
	});
});

describe('compileHtmlWithHandlebar', () => {
	it('renders a simple template', () => {
		expect(
			compileHtmlWithHandlebar({
				data: { name: 'Ada' },
				htmlString: 'Hi {{name}}',
			}),
		).toBe('Hi Ada');
	});

	it('supports block helpers', () => {
		expect(
			compileHtmlWithHandlebar({
				data: { admin: true, name: 'Ada' },
				htmlString: '{{name}}{{#if admin}} (admin){{/if}}',
			}),
		).toBe('Ada (admin)');
	});

	it('HTML-escapes by default, and respects noEscape', () => {
		const data = { html: '<b>x</b>' };
		expect(compileHtmlWithHandlebar({ data, htmlString: '{{html}}' })).toBe(
			'&lt;b&gt;x&lt;/b&gt;',
		);
		expect(
			compileHtmlWithHandlebar({
				data,
				htmlString: '{{html}}',
				compileOptions: { noEscape: true },
			}),
		).toBe('<b>x</b>');
	});
});

describe('printLog', () => {
	it('writes "<date> - LOG [context] message" plus the payload', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			printLog('Auth', 'signed in', { id: 1 });
			expect(spy).toHaveBeenCalledTimes(1);
			const [line, payload] = spy.mock.calls[0];
			expect(line).toContain('LOG [Auth] signed in');
			expect(line).toMatch(/GMT/); // default UTC date prefix
			expect(payload).toEqual({ id: 1 });
		} finally {
			spy.mockRestore();
		}
	});

	it('omits the date and adds ANSI colour codes with options', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			printLog('Ctx', 'msg', undefined, { prettify: true, ignoreDate: true });
			const [line] = spy.mock.calls[0];
			expect(line).not.toMatch(/GMT/);
			expect(line).toContain('\x1b['); // colour escape sequence
		} finally {
			spy.mockRestore();
		}
	});
});

describe('fetchGoogleSheet', () => {
	/** Grab the `url` that `sendHttpRequest` (and therefore axios) was called with. */
	const calledUrl = () =>
		(mockedAxios.mock.calls.at(-1)?.[0] as unknown as { url: string }).url;

	it('hits the sheet /export endpoint and returns the raw CSV text', async () => {
		const csv = 'name,age\nAda,36';
		mockedAxios.mockResolvedValueOnce({ data: csv });

		const result = await fetchGoogleSheet({ sheetId: 'SHEET_ID', gid: '42' });

		expect(result).toBe(csv);
		expect(calledUrl()).toContain(
			'https://docs.google.com/spreadsheets/d/SHEET_ID/export',
		);
		expect(calledUrl()).toContain('format=csv');
		expect(calledUrl()).toContain('gid=42');
	});

	it('omits the gid parameter when not supplied', async () => {
		mockedAxios.mockResolvedValueOnce({ data: '' });
		await fetchGoogleSheet({ sheetId: 'X' });
		expect(calledUrl()).not.toContain('gid=');
	});
});

/* ========================================================================== */
/* validator — Zod schemas                                                     */
/* ========================================================================== */

describe('validator: schema instances', () => {
	it.each([
		[UuidValidationSchema, A_UUID, 'not-a-uuid'],
		[EmailValidationSchema, 'dev@inclood.io', 'dev@@inclood'],
		[UrlValidationSchema, 'https://inclood.io/x', 'not a url'],
		[DateTimeValidationSchema, '2024-04-12T01:02:55.666Z', '2024-04-12'],
	])('accepts a valid value and rejects an invalid one', (schema, ok, bad) => {
		expect(
			(schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(
				ok,
			).success,
		).toBe(true);
		expect(
			(schema as { safeParse: (v: unknown) => { success: boolean } }).safeParse(
				bad,
			).success,
		).toBe(false);
	});

	it('BooleanValidationSchema only accepts real booleans', () => {
		expect(BooleanValidationSchema.safeParse(true).success).toBe(true);
		expect(BooleanValidationSchema.safeParse('true').success).toBe(false);
	});
});

describe('validator: schema factories', () => {
	it('PasswordValidationSchema enforces min / max length (defaults 6 / 100)', () => {
		expect(PasswordValidationSchema().safeParse('12345').success).toBe(false);
		expect(PasswordValidationSchema().safeParse('123456').success).toBe(true);
		expect(PasswordValidationSchema(8).safeParse('1234567').success).toBe(
			false,
		);
		expect(PasswordValidationSchema(1, 4).safeParse('12345').success).toBe(
			false,
		);
	});

	it('RequiredStringValidationSchema rejects empty / whitespace-only', () => {
		const s = RequiredStringValidationSchema();
		expect(s.safeParse('  ').success).toBe(false);
		expect(s.safeParse(' hi ').success).toBe(true);
	});

	it('NameValidationSchema (and First/Last aliases) enforce 2..100 chars', () => {
		expect(NameValidationSchema().safeParse('A').success).toBe(false);
		expect(NameValidationSchema().safeParse('Ada').success).toBe(true);
		expect(FirstNameValidationSchema).toBe(NameValidationSchema);
		expect(LastNameValidationSchema).toBe(NameValidationSchema);
	});

	it('UsernameValidationSchema: 3..30 chars, [A-Za-z0-9_]', () => {
		const s = UsernameValidationSchema();
		expect(s.safeParse('ab').success).toBe(false);
		expect(s.safeParse('ada_dev').success).toBe(true);
		expect(s.safeParse('ada dev').success).toBe(false);
	});

	it('PhoneNumberValidationSchema: 7..20 chars', () => {
		const s = PhoneNumberValidationSchema();
		expect(s.safeParse('12345').success).toBe(false);
		expect(s.safeParse('+2348031234567').success).toBe(true);
	});

	it('SlugValidationSchema accepts a lowercase-hyphen slug only', () => {
		const s = SlugValidationSchema();
		expect(s.safeParse('my-cool-post').success).toBe(true);
		expect(s.safeParse('My Cool Post').success).toBe(false);
	});

	it('HexColorValidationSchema accepts #rgb and #rrggbb', () => {
		const s = HexColorValidationSchema();
		expect(s.safeParse('#fff').success).toBe(true);
		expect(s.safeParse('#ffffff').success).toBe(true);
		expect(s.safeParse('fff').success).toBe(false);
	});

	it('OtpValidationSchema: fixed length, digits only (default 6)', () => {
		const s = OtpValidationSchema();
		expect(s.safeParse('123456').success).toBe(true);
		expect(s.safeParse('12345').success).toBe(false);
		expect(s.safeParse('12345a').success).toBe(false);
		expect(OtpValidationSchema(4).safeParse('1234').success).toBe(true);
	});

	it('TokenValidationSchema rejects only the empty string', () => {
		expect(TokenValidationSchema().safeParse('').success).toBe(false);
		expect(TokenValidationSchema().safeParse('t').success).toBe(true);
	});

	it('DescriptionValidationSchema enforces a max length (default 1000)', () => {
		expect(DescriptionValidationSchema(5).safeParse('123456').success).toBe(
			false,
		);
		expect(DescriptionValidationSchema(5).safeParse('12345').success).toBe(
			true,
		);
	});

	it('number schemas: positive / non-negative / page / page size', () => {
		expect(PositiveNumberValidationSchema().safeParse(0).success).toBe(false);
		expect(PositiveNumberValidationSchema().safeParse(1).success).toBe(true);
		expect(NonNegativeNumberValidationSchema().safeParse(0).success).toBe(true);
		expect(NonNegativeNumberValidationSchema().safeParse(-1).success).toBe(
			false,
		);
		expect(PageValidationSchema().safeParse(0).success).toBe(false);
		expect(PageValidationSchema().safeParse(1).success).toBe(true);
		expect(PageSizeValidationSchema(50).safeParse(51).success).toBe(false);
		expect(PageSizeValidationSchema(50).safeParse(50).success).toBe(true);
	});

	it('SearchQueryValidationSchema trims and caps length (default 200)', () => {
		expect(SearchQueryValidationSchema(3).safeParse('abcd').success).toBe(
			false,
		);
		expect(SearchQueryValidationSchema(3).safeParse(' ab ').success).toBe(true);
	});

	it('CountryCodeValidationSchema: 2 chars, upper-cased on output', () => {
		const s = CountryCodeValidationSchema();
		expect(s.parse('ng')).toBe('NG');
		expect(s.safeParse('nga').success).toBe(false);
	});

	it('CurrencyCodeValidationSchema: 3 chars, upper-cased on output', () => {
		expect(CurrencyCodeValidationSchema().parse('ngn')).toBe('NGN');
		expect(CurrencyCodeValidationSchema().safeParse('NG').success).toBe(false);
	});

	it('LanguageCodeValidationSchema: 2..10 chars', () => {
		const s = LanguageCodeValidationSchema();
		expect(s.safeParse('e').success).toBe(false);
		expect(s.safeParse('en').success).toBe(true);
	});

	it('MimeTypeValidationSchema: type/subtype', () => {
		const s = MimeTypeValidationSchema();
		expect(s.safeParse('image/png').success).toBe(true);
		expect(s.safeParse('image').success).toBe(false);
	});

	it('FileExtensionValidationSchema: alphanumeric', () => {
		const s = FileExtensionValidationSchema();
		expect(s.safeParse('png').success).toBe(true);
		expect(s.safeParse('.png').success).toBe(false);
	});

	it('IpAddressValidationSchema accepts IPv4 and IPv6', () => {
		const s = IpAddressValidationSchema();
		expect(s.safeParse('192.168.0.1').success).toBe(true);
		expect(s.safeParse('::1').success).toBe(true);
		expect(s.safeParse('999.1.1.1').success).toBe(false);
	});

	it('Latitude / Longitude schemas enforce their ranges', () => {
		expect(LatitudeValidationSchema().safeParse(90).success).toBe(true);
		expect(LatitudeValidationSchema().safeParse(90.1).success).toBe(false);
		expect(LongitudeValidationSchema().safeParse(-180).success).toBe(true);
		expect(LongitudeValidationSchema().safeParse(-180.1).success).toBe(false);
	});
});

/* ========================================================================== */
/* validator — re-exported `validator` predicates / sanitisers                 */
/* ========================================================================== */

describe('validator: re-exported predicates', () => {
	it('predicates behave like the real `validator` package', () => {
		expect(isEmail('a@b.com')).toBe(true);
		expect(isEmail('a@@b')).toBe(false);
		expect(isUUID(A_UUID)).toBe(true);
		expect(isURL('https://inclood.io')).toBe(true);
		expect(isJSON('{"a":1}')).toBe(true);
		expect(isJSON('{a:1}')).toBe(false);
		expect(isMongoId('507f1f77bcf86cd799439011')).toBe(true);
		expect(isSlug('my-slug')).toBe(true);
		expect(isStrongPassword('Sup3r$ecret!')).toBe(true);
	});

	it('sanitisers are the real thing', () => {
		expect(normalizeEmail('A@B.Com')).toBe('a@b.com');
		expect(trim('  padded  ')).toBe('padded');
	});
});

/* ========================================================================== */
/* constant — ResponseMessageEnum                                              */
/* ========================================================================== */

describe('ResponseMessageEnum', () => {
	it('every member is a non-empty human-readable string', () => {
		const values = Object.values(ResponseMessageEnum);
		expect(values.length).toBeGreaterThan(40);
		for (const value of values) {
			expect(typeof value).toBe('string');
			expect(value.length).toBeGreaterThan(0);
		}
	});

	it('exposes a few well-known messages', () => {
		expect(ResponseMessageEnum.USER_NOT_FOUND).toBe('User not found.');
		expect(ResponseMessageEnum.SUCCESS).toBe(
			'Operation completed successfully.',
		);
	});

	it('some members intentionally share the same message', () => {
		expect(ResponseMessageEnum.WRONG_PASSWORD).toBe(
			ResponseMessageEnum.INVALID_CREDENTIALS,
		);
	});

	it('composes cleanly with CustomException', () => {
		const err = new CustomException(ResponseMessageEnum.USER_NOT_FOUND, 404);
		expect(err.message).toBe('User not found.');
		expect(err.status).toBe(404);
	});
});

/* ========================================================================== */
/* interface — AppEnvironmentEnum (the one runtime value in the module)        */
/* ========================================================================== */

describe('AppEnvironmentEnum', () => {
	it('maps names to their lowercase values', () => {
		expect(AppEnvironmentEnum.PRODUCTION).toBe('production');
		expect(AppEnvironmentEnum.LOCAL).toBe('local');
		expect(Object.values(AppEnvironmentEnum)).toEqual([
			'qa',
			'test',
			'local',
			'staging',
			'production',
			'development',
		]);
	});
});

/* ========================================================================== */
/* package surface — everything documented is actually exported                */
/* ========================================================================== */

describe('public API surface', () => {
	it('exports every function / class / schema / enum by name', () => {
		const expectedFunctions = [
			'isIsoDate',
			'generateISODate',
			'generateRandomId',
			'transformText',
			'generateNanoid',
			'containsUUID',
			'sendHttpRequest',
			'parsePhonenumber',
			'sanitizeObject',
			'generateDateInNumber',
			'cloneDeep',
			'removeDuplicates',
			'sendMessageToTelegram',
			'encodeUrlComponent',
			'decodeUrlComponent',
			'xmlToJson',
			'jsonToXml',
			'detectDuplicateProperties',
			'compileHtmlWithHandlebar',
			'printLog',
			'fetchGoogleSheet',
		] as const;
		for (const name of expectedFunctions) {
			expect(typeof toolkit[name], name).toBe('function');
		}

		expect(typeof toolkit.CustomException).toBe('function');
		expect(typeof toolkit.ResponseMessageEnum).toBe('object');
		expect(typeof toolkit.AppEnvironmentEnum).toBe('object');
	});

	it('re-exports the `validator` predicate set', () => {
		for (const name of [
			'isEmail',
			'isURL',
			'isUUID',
			'normalizeEmail',
			'trim',
		]) {
			expect(typeof (toolkit as Record<string, unknown>)[name], name).toBe(
				'function',
			);
		}
	});
});
