/**
 * `@incloodsolutions/node-toolkit` — the serverless Lambda adapter
 * (`src/aws/lambda`). `@codegenie/serverless-express` is fully mocked.
 *
 * `initLambdaFunctionHandler` caches the built handler in module scope, so each
 * test re-imports the module fresh via `vi.resetModules()`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlerFn = vi.fn(async () => ({ statusCode: 200, body: 'ok' }));
const serverlessExpress = vi.fn(() => handlerFn);
const getCurrentInvoke = vi.fn(() => ({
	context: { awsRequestId: 'ctx-123' },
	event: { requestContext: { requestId: 'evt-456' } },
}));

vi.mock('@codegenie/serverless-express', () => ({
	default: serverlessExpress,
	getCurrentInvoke,
}));

async function freshModule() {
	vi.resetModules();
	return import('../src/index');
}

beforeEach(() => {
	handlerFn.mockClear();
	serverlessExpress.mockClear();
	getCurrentInvoke.mockClear();
});

/* ========================================================================== */

describe('getCurrentLambdaInvocation', () => {
	it('returns whatever serverless-express getCurrentInvoke() yields', async () => {
		const { getCurrentLambdaInvocation } = await freshModule();
		expect(getCurrentLambdaInvocation()).toEqual({
			context: { awsRequestId: 'ctx-123' },
			event: { requestContext: { requestId: 'evt-456' } },
		});
	});
});

describe('initLambdaFunctionHandler', () => {
	it('wraps an Express app and dispatches the event through it', async () => {
		const { initLambdaFunctionHandler } = await freshModule();

		const app = vi.fn() as never; // a bare "Express" app is just a function
		const event = { rawPath: '/health' } as never;
		const context: { callbackWaitsForEmptyEventLoop: boolean } = {
			callbackWaitsForEmptyEventLoop: true,
		};

		const result = await initLambdaFunctionHandler({
			app,
			event,
			context: context as never,
		});

		expect(result).toEqual({ statusCode: 200, body: 'ok' });
		expect(context.callbackWaitsForEmptyEventLoop).toBe(false);
		expect(serverlessExpress).toHaveBeenCalledWith(
			expect.objectContaining({ app }),
		);
		expect(handlerFn).toHaveBeenCalledWith(event, context, undefined);
	});

	it('bootstraps a NestJS app (init + getHttpAdapter) before wrapping it', async () => {
		const { initLambdaFunctionHandler } = await freshModule();

		const expressInstance = vi.fn();
		const app = {
			init: vi.fn(async () => undefined),
			getHttpAdapter: () => ({ getInstance: () => expressInstance }),
		} as never;

		await initLambdaFunctionHandler({
			app,
			event: {} as never,
			context: {} as never,
		});

		expect((app as { init: ReturnType<typeof vi.fn> }).init).toHaveBeenCalled();
		expect(serverlessExpress).toHaveBeenCalledWith(
			expect.objectContaining({ app: expressInstance }),
		);
	});

	it('reuses the cached handler on subsequent invocations', async () => {
		const { initLambdaFunctionHandler } = await freshModule();
		const app = vi.fn() as never;

		await initLambdaFunctionHandler({
			app,
			event: {} as never,
			context: {} as never,
		});
		await initLambdaFunctionHandler({
			app,
			event: {} as never,
			context: {} as never,
		});

		expect(serverlessExpress).toHaveBeenCalledTimes(1);
		expect(handlerFn).toHaveBeenCalledTimes(2);
	});
});
