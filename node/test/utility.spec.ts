/**
 * `@incloodsolutions/node-toolkit` — `src/utility` behaviour tests.
 *
 * Mocked: `bwip-js` (QR/barcode rendering), `fs` / `fs/promises` (Lambda tmp IO).
 * Real: crypto-js, bcryptjs, uuid, class-validator, class-transformer, mongoose
 * (`Types.ObjectId` only — no connection).
 *
 * KNOWN BUG pinned here:
 *   sanitizeObject(...) throws for any object with a non-empty value (same
 *   recursion/filter bug as the core toolkit version).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomException } from '@incloodsolutions/toolkit';
import { Types } from 'mongoose';
import { IsString } from 'class-validator';

vi.mock('bwip-js', () => ({
	toBuffer: vi.fn(async () => Buffer.from('FAKE_PNG_BYTES')),
}));
vi.mock('fs/promises', () => ({ writeFile: vi.fn(async () => undefined) }));
vi.mock('fs', () => ({
	existsSync: vi.fn(() => true),
	readFileSync: vi.fn(() => Buffer.from('file-contents')),
}));

import { toBuffer } from 'bwip-js';
import { writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';

import {
	apiResult,
	decodeUrlComponent,
	decryptData,
	encodeUrlComponent,
	encryptData,
	generateCustomUUID,
	generateQrBarcode,
	getIpAddress,
	hashWithBcrypt,
	initCustomLogger,
	isLambdaEnvironment,
	isNestApplication,
	isValidMongoId,
	isValidUUID,
	normalizeMongooseData,
	normalizeMongooseData_v2,
	printLog,
	reqResLogger,
	returnApiOverview,
	returnApiResponse,
	sanitizeObject,
	validateDataWithClassValidator,
	validateHashWithBcrypt,
	writeFileToLambda,
	readFileFromLambda,
} from '../src/index';

const mockedToBuffer = vi.mocked(toBuffer);
const mockedWriteFile = vi.mocked(writeFile);
const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

/** Toggle the two env vars that make `isLambdaEnvironment()` return true. */
function withLambdaEnv(fn: () => unknown | Promise<unknown>) {
	const saved = {
		root: process.env.LAMBDA_TASK_ROOT,
		name: process.env.AWS_LAMBDA_FUNCTION_NAME,
	};
	process.env.LAMBDA_TASK_ROOT = '/var/task';
	process.env.AWS_LAMBDA_FUNCTION_NAME = 'my-fn';
	return Promise.resolve(fn()).finally(() => {
		if (saved.root === undefined) delete process.env.LAMBDA_TASK_ROOT;
		else process.env.LAMBDA_TASK_ROOT = saved.root;
		if (saved.name === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
		else process.env.AWS_LAMBDA_FUNCTION_NAME = saved.name;
	});
}

/* ========================================================================== */

describe('sanitizeObject', () => {
	it('returns an empty object / non-object unchanged', () => {
		expect(sanitizeObject({ data: {} })).toEqual({});
		expect(sanitizeObject({ data: [1, 2] as unknown as object })).toEqual([
			1, 2,
		]);
	});

	it('known bug: throws for any object with a non-empty value', () => {
		expect(() => sanitizeObject({ data: { name: 'Ada', x: '' } })).toThrow(
			TypeError,
		);
	});
});

describe('encryptData / decryptData', () => {
	it('round-trips a value through AES-256', () => {
		const secret = 'super-secret';
		const value = { userId: 7, roles: ['admin'] };
		const cipher = encryptData({ data: value, secret });
		expect(typeof cipher).toBe('string');
		expect(cipher).not.toContain('userId');
		expect(decryptData({ hashedData: cipher, secret })).toEqual(value);
	});

	it('AES-256 requires a secret', () => {
		expect(() => encryptData({ data: 'x', secret: '' })).toThrow(
			CustomException,
		);
	});

	it('sha512 is an unkeyed 128-char hex digest (no secret needed)', () => {
		const digest = encryptData({
			data: { a: 1 },
			secret: '',
			type: 'sha512',
		});
		expect(digest).toMatch(/^[0-9a-f]{128}$/);
	});

	it('hmacSha512 is a keyed hex digest', () => {
		const digest = encryptData({
			data: { a: 1 },
			secret: 'k',
			type: 'hmacSha512',
		});
		expect(digest).toMatch(/^[0-9a-f]{128}$/);
	});

	it('encrypt passes a falsy value straight through', () => {
		expect(encryptData({ data: null, secret: 's' })).toBeNull();
	});

	it('decrypt returns null for empty input, throws for garbage / wrong secret', () => {
		expect(decryptData({ hashedData: '', secret: 's' })).toBeNull();
		expect(() =>
			decryptData({ hashedData: 'not-real', secret: 's' }),
		).toThrow();
		const cipher = encryptData({ data: { a: 1 }, secret: 'right' });
		expect(() =>
			decryptData({ hashedData: cipher, secret: 'wrong' }),
		).toThrow();
	});
});

describe('getIpAddress', () => {
	// NOTE: getIpAddress reads `req.headers['x-forwarded-for']` — it assumes
	// `req.headers` exists (always true for a real Express request).
	const req = (over: Record<string, unknown>) =>
		({ headers: {}, ...over }) as never;

	it('prefers the first x-forwarded-for entry', () => {
		expect(
			getIpAddress(req({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })),
		).toBe('1.2.3.4');
	});

	it('falls back to socket.remoteAddress, then req.ip', () => {
		expect(getIpAddress(req({ socket: { remoteAddress: '9.9.9.9' } }))).toBe(
			'9.9.9.9',
		);
		expect(getIpAddress(req({ ip: '8.8.8.8' }))).toBe('8.8.8.8');
	});

	it('returns "" when nothing usable is present', () => {
		expect(getIpAddress(req({}))).toBe('');
		expect(
			getIpAddress(req({ headers: { 'x-forwarded-for': 'garbage' } })),
		).toBe('');
	});
});

describe('hashWithBcrypt / validateHashWithBcrypt', () => {
	it('hashes and verifies a password', async () => {
		const hash = await hashWithBcrypt('correct horse', 4);
		expect(hash).toMatch(/^\$2[aby]\$/);
		expect(await validateHashWithBcrypt('correct horse', hash)).toBe(true);
		expect(await validateHashWithBcrypt('wrong', hash)).toBe(false);
	});

	it('refuses to hash empty input', async () => {
		await expect(hashWithBcrypt('')).rejects.toBeInstanceOf(CustomException);
	});

	it('validate returns false when an argument is missing', async () => {
		expect(await validateHashWithBcrypt('', 'x')).toBe(false);
	});
});

describe('Lambda /tmp filesystem helpers', () => {
	it('isLambdaEnvironment reflects the two env vars', async () => {
		expect(isLambdaEnvironment()).toBe(false);
		await withLambdaEnv(() => expect(isLambdaEnvironment()).toBe(true));
	});

	it('writeFileToLambda writes under /tmp and returns the path', async () => {
		await withLambdaEnv(async () => {
			const p = await writeFileToLambda({
				filePath: 'report.csv',
				file: 'a,b,c',
			});
			expect(p).toBe('/tmp/report.csv');
			expect(mockedWriteFile).toHaveBeenCalledWith('/tmp/report.csv', 'a,b,c');
		});
	});

	it('writeFileToLambda validates its inputs', async () => {
		await expect(
			writeFileToLambda({ file: undefined as never }),
		).rejects.toBeInstanceOf(CustomException); // "File is required"
		await expect(writeFileToLambda({ file: 'x' })).rejects.toBeInstanceOf(
			CustomException,
		); // "Not in lambda environment"
	});

	it('readFileFromLambda resolves a Buffer, or null when the file is absent', async () => {
		await withLambdaEnv(async () => {
			mockedExistsSync.mockReturnValueOnce(true);
			await expect(readFileFromLambda('x.txt')).resolves.toEqual(
				Buffer.from('file-contents'),
			);
			expect(mockedReadFileSync).toHaveBeenCalled();

			mockedExistsSync.mockReturnValueOnce(false);
			await expect(readFileFromLambda('missing.txt')).resolves.toBeNull();
		});
	});
});

describe('UUID helpers', () => {
	it('isValidUUID', () => {
		expect(isValidUUID(generateCustomUUID())).toBe(true);
		expect(isValidUUID('not-a-uuid')).toBe(false);
	});

	it('generateCustomUUID: v7 by default, lowercase, dash-separated', () => {
		const id = generateCustomUUID();
		expect(isValidUUID(id)).toBe(true);
		expect(id).toBe(id.toLowerCase());
		expect(id).toContain('-');
	});

	it('generateCustomUUID options: version, casing, symbol', () => {
		expect(isValidUUID(generateCustomUUID({ version: 4 }))).toBe(true);
		const upper = generateCustomUUID({ asUpperCase: true });
		expect(upper).toBe(upper.toUpperCase());
		expect(generateCustomUUID({ symbol: '_' }).replace(/_/g, '-')).toMatch(
			/^[0-9a-f-]{36}$/,
		);
		// NOTE: `symbol: ''` is a no-op — the guard is `symbol && symbol.trim()`,
		// which is falsy for the empty string, so the dashes are kept. (The
		// "dashes stripped" JSDoc example is misleading.)
		expect(generateCustomUUID({ symbol: '' })).toContain('-');
	});
});

describe('API response helpers', () => {
	it('apiResult returns a shallow copy', () => {
		const input = { data: { x: 1 }, message: 'ok' };
		const out = apiResult(input);
		expect(out).toEqual(input);
		expect(out).not.toBe(input);
	});

	it('returnApiResponse writes { success, statusCode, ...data.data }', () => {
		const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
		returnApiResponse(res as never, { data: { user: 'ada' } }, 201);
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({
			success: true,
			statusCode: 201,
			user: 'ada',
		});

		returnApiResponse(res as never, { data: {} }, 500);
		expect(res.json).toHaveBeenLastCalledWith({
			success: false,
			statusCode: 500,
		});
	});

	it('returnApiOverview renders an HTML page containing the given fields', () => {
		const html = returnApiOverview({
			name: 'Orders API',
			description: 'handles orders',
			docsUrl: 'https://docs.example/orders',
		});
		expect(html).toContain('<title>Orders API summary</title>');
		expect(html).toContain('Orders API');
		expect(html).toContain('handles orders');
		expect(html).toContain('https://docs.example/orders');
	});
});

describe('encodeUrlComponent / decodeUrlComponent', () => {
	it('round-trips structured data', () => {
		const value = { q: 'a b', tags: ['x', 'y'] };
		expect(decodeUrlComponent(encodeUrlComponent(value))).toEqual(value);
	});

	it('encodes a plain string directly', () => {
		expect(encodeUrlComponent('a b/c')).toBe('a%20b%2Fc');
	});

	it('cannot round-trip a bare string (decode always JSON.parses)', () => {
		expect(() => decodeUrlComponent(encodeUrlComponent('hello'))).toThrow();
	});
});

describe('isValidMongoId', () => {
	it('accepts a 24-hex string and an ObjectId instance', () => {
		expect(isValidMongoId('507f1f77bcf86cd799439011')).toBe(true);
		expect(isValidMongoId(new Types.ObjectId())).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isValidMongoId('xyz')).toBe(false);
		expect(isValidMongoId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
		expect(isValidMongoId({} as never)).toBe(false);
	});
});

describe('initCustomLogger', () => {
	it('prints "<iso> - <LEVEL> [ctx] <message>"', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			initCustomLogger('Payments').info('charge ok');
			expect(spy.mock.calls[0][0]).toMatch(/- INFO \[Payments\] charge ok$/);
		} finally {
			spy.mockRestore();
		}
	});
});

describe('printLog', () => {
	it('formats "<date> - LOG [ctx] message" and appends the payload', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			printLog('Db', 'connected', { host: 'x' });
			const [line, payload] = spy.mock.calls[0];
			expect(line).toContain('LOG [Db] connected');
			expect(payload).toEqual({ host: 'x' });
		} finally {
			spy.mockRestore();
		}
	});
});

describe('reqResLogger', () => {
	it('returns a morgan middleware function', () => {
		const middleware = reqResLogger({ formats: ['user-agent'] });
		expect(typeof middleware).toBe('function');
		expect(middleware.length).toBe(3); // (req, res, next)
	});
});

describe('validateDataWithClassValidator', () => {
	class UserDto {
		@IsString()
		name!: string;
	}

	it('returns the transformed instance when data is valid', async () => {
		const result = await validateDataWithClassValidator(
			UserDto,
			{ name: 'Ada' },
			{ validatorOptions: {}, transformOptions: {} },
		);
		expect(result).toBeInstanceOf(UserDto);
		expect(result.name).toBe('Ada');
	});

	it('throws a CustomException listing the failures when data is invalid', async () => {
		await expect(
			validateDataWithClassValidator(
				UserDto,
				{ name: 123 },
				{ validatorOptions: {}, transformOptions: {} },
			),
		).rejects.toBeInstanceOf(CustomException);
	});
});

describe('normalizeMongooseData', () => {
	it('stringifies ObjectIds and adds `id` from `_id`', () => {
		const _id = new Types.ObjectId();
		const out = normalizeMongooseData({ _id, name: 'Ada' });
		expect(out).toEqual({
			_id: _id.toString(),
			name: 'Ada',
			id: _id.toString(),
		});
	});

	it('calls toObject() on a mongoose-document-like value', () => {
		const toObject = vi.fn(() => ({ name: 'from-toObject' }));
		expect(normalizeMongooseData({ toObject } as never)).toEqual({
			name: 'from-toObject',
		});
		expect(toObject).toHaveBeenCalled();
	});

	it('returns primitives / arrays untouched', () => {
		expect(normalizeMongooseData('str' as never)).toBe('str');
		expect(normalizeMongooseData([1, 2] as never)).toEqual([1, 2]);
	});
});

describe('normalizeMongooseData_v2', () => {
	it('maps an array of documents', () => {
		const a = new Types.ObjectId();
		const b = new Types.ObjectId();
		expect(normalizeMongooseData_v2([{ _id: a }, { _id: b }])).toEqual([
			{ _id: a.toString(), id: a.toString() },
			{ _id: b.toString(), id: b.toString() },
		]);
	});

	it('returns null / undefined / primitives unchanged', () => {
		expect(normalizeMongooseData_v2(null)).toBeNull();
		expect(normalizeMongooseData_v2(undefined)).toBeUndefined();
		expect(normalizeMongooseData_v2(5)).toBe(5);
	});
});

describe('isNestApplication', () => {
	it('true only for an object exposing getHttpAdapter()', () => {
		expect(isNestApplication({ getHttpAdapter: () => ({}) } as never)).toBe(
			true,
		);
		expect(isNestApplication({} as never)).toBe(false);
		expect(isNestApplication((() => undefined) as never)).toBe(false);
	});
});

describe('generateQrBarcode', () => {
	beforeEach(() => mockedToBuffer.mockClear());

	/** The options object `bwip-js.toBuffer` was last called with. */
	const lastOpts = () =>
		mockedToBuffer.mock.calls.at(-1)?.[0] as unknown as Record<string, unknown>;

	it('renders a QR code as a base64 PNG data URI', async () => {
		const uri = await generateQrBarcode('https://inclood.io', {
			type: 'qrcode',
			renderOptions: {} as never,
		});
		expect(uri).toBe(
			`data:image/png;base64,${Buffer.from('FAKE_PNG_BYTES').toString('base64')}`,
		);
		expect(lastOpts()).toMatchObject({
			bcid: 'qrcode',
			text: 'https://inclood.io',
			width: 120,
			height: 120,
		});
	});

	it('with no options: still a qrcode bcid, but no width/height are set', async () => {
		await generateQrBarcode('x');
		expect(lastOpts().bcid).toBe('qrcode');
		expect(lastOpts().width).toBeUndefined();
	});

	it('renders a Code128 barcode, JSON-stringifying object input', async () => {
		await generateQrBarcode(
			{ id: 1 },
			{ type: 'barcode', renderOptions: {} as never },
		);
		expect(lastOpts()).toMatchObject({ bcid: 'code128', text: '{"id":1}' });
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});
