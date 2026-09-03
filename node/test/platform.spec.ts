/**
 * `@incloodsolutions/node-toolkit` — config, GCP adapter, Mongoose helpers,
 * and a package-surface smoke test.
 *
 * `mongoose.connect` / `disconnect` / `set` are stubbed (partial mock — the real
 * `Schema` is kept so `initMongooseSchema` is exercised for real).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomException } from '@incloodsolutions/toolkit';

const { connect, disconnect } = vi.hoisted(() => ({
	connect: vi.fn(async () => ({ readyState: 1 })),
	disconnect: vi.fn(async () => undefined),
}));

vi.mock('mongoose', async (importOriginal) => {
	const actual = await importOriginal<typeof import('mongoose')>();
	return { ...actual, connect, disconnect, set: vi.fn() };
});

import * as node from '../src/index';
import {
	initEnvironmentVariables,
	initGcpFunctionHandler,
	initMongooseConnection,
	initMongooseSchema,
} from '../src/index';

beforeEach(() => {
	connect.mockClear();
	disconnect.mockClear();
	delete (globalThis as { mongoose?: unknown }).mongoose;
	vi.resetModules();
});

/* ========================================================================== */

describe('initEnvironmentVariables', () => {
	it('reads a value from process.env', () => {
		process.env.TK_TEST_LIVE = 'from-env';
		const env = initEnvironmentVariables({ TK_TEST_LIVE: { required: true } });
		expect(env.TK_TEST_LIVE).toBe('from-env');
		delete process.env.TK_TEST_LIVE;
	});

	it('falls back to defaultValue when the var is unset', () => {
		const env = initEnvironmentVariables({
			TK_TEST_DEFAULT: { required: true, defaultValue: 'fallback' },
		});
		expect(env.TK_TEST_DEFAULT).toBe('fallback');
	});

	it('throws a CustomException for a required var with no value and no default', () => {
		expect(() =>
			initEnvironmentVariables({ TK_TEST_MISSING: { required: true } }),
		).toThrow(CustomException);
	});

	it('includes the whole process.env when includeAllVariables is set', () => {
		process.env.TK_TEST_EXTRA = 'x';
		const env = initEnvironmentVariables(
			{ TK_TEST_KNOWN: { defaultValue: 'k' } },
			{ includeAllVariables: true },
		);
		expect(env.TK_TEST_EXTRA).toBe('x');
		expect(env.TK_TEST_KNOWN).toBe('k');
		delete process.env.TK_TEST_EXTRA;
	});
});

describe('initGcpFunctionHandler', () => {
	it('throws when no app is supplied', async () => {
		const { initGcpFunctionHandler: fresh } = await import('../src/index');
		// (matched by message: the freshly re-imported module has its own
		// CustomException class, so `toBeInstanceOf` would compare across realms)
		await expect(
			fresh({
				app: undefined as never,
				request: {} as never,
				response: {} as never,
			}),
		).rejects.toThrow(/App instance must be defined/);
	});

	it('dispatches the request/response pair through an Express app', async () => {
		const { initGcpFunctionHandler: fresh } = await import('../src/index');
		const app = vi.fn(() => 'dispatched') as never;
		const request = { method: 'GET' } as never;
		const response = { end: vi.fn() } as never;

		const result = await fresh({ app, request, response });

		expect(result).toBe('dispatched');
		expect(app).toHaveBeenCalledWith(request, response);
	});

	it('bootstraps a NestJS app before dispatching', async () => {
		const { initGcpFunctionHandler: fresh } = await import('../src/index');
		const expressInstance = vi.fn();
		const app = {
			init: vi.fn(async () => undefined),
			getHttpAdapter: () => ({ getInstance: () => expressInstance }),
		} as never;

		await fresh({ app, request: {} as never, response: {} as never });

		expect((app as { init: ReturnType<typeof vi.fn> }).init).toHaveBeenCalled();
		expect(expressInstance).toHaveBeenCalled();
	});
});

describe('initMongooseSchema', () => {
	it('applies the project defaults (strict "throw", virtuals on)', () => {
		const schema = initMongooseSchema({ name: String, age: Number });
		expect(schema.get('strict')).toBe('throw');
		expect(schema.get('toJSON')).toMatchObject({ virtuals: true });
		expect(schema.get('toObject')).toMatchObject({ virtuals: true });
	});

	it('lets options override the defaults and pass extras through', () => {
		const schema = initMongooseSchema(
			{ name: String },
			{ strict: true, timestamps: true },
		);
		expect(schema.get('strict')).toBe(true);
		expect(schema.get('timestamps')).toBe(true);
	});
});

describe('initMongooseConnection', () => {
	it('connects with the serverless pool settings and returns a closer', async () => {
		const { connection, closeConnection } = await initMongooseConnection({
			url: 'mongodb://localhost/test',
		});

		expect(connect).toHaveBeenCalledWith(
			'mongodb://localhost/test',
			expect.objectContaining({ maxPoolSize: 1, bufferCommands: false }),
		);
		expect(connection).toEqual({ readyState: 1 });

		await closeConnection();
		expect(disconnect).toHaveBeenCalled();
	});

	it('throws a CustomException after exhausting retries', async () => {
		connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
		await expect(
			initMongooseConnection({ options: { retries: 1 } }),
		).rejects.toBeInstanceOf(CustomException);
	});
});

describe('package surface', () => {
	it('exports the documented functions', () => {
		for (const name of [
			'initLambdaFunctionHandler',
			'getCurrentLambdaInvocation',
			'initGcpFunctionHandler',
			'initEnvironmentVariables',
			'initMongooseConnection',
			'initMongooseSchema',
			'initS3ClientWrapper',
			'initSesClientWrapper',
			'initSnsClientWrapper',
			'initDynamoDbClientWrapper',
			'validateSchema',
			'encryptData',
			'decryptData',
			'hashWithBcrypt',
			'generateCustomUUID',
			'generateQrBarcode',
			'normalizeMongooseData',
			'reqResLogger',
		] as const) {
			expect(typeof node[name], name).toBe('function');
		}
	});

	it('does NOT re-export `@incloodsolutions/toolkit` symbols or the (commented-out) BaseSchemaEntity', () => {
		expect((node as Record<string, unknown>).CustomException).toBeUndefined();
		expect((node as Record<string, unknown>).BaseSchemaEntity).toBeUndefined();
	});
});
