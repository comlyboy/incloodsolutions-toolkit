import type { Express, Request, Response } from 'express';

import { CustomException } from '@incloodsolutions/toolkit';
import { isNestApplication } from '../../utility';
import { INestAppInstance } from '../../interface';

/**
 * Cached Express instance, reused across warm function invocations so the app is
 * only bootstrapped once.
 */
let expressApplication: Express = null;

/**
 * Runs an Express or NestJS application as a Google Cloud Functions HTTP handler.
 *
 * On the first invocation the underlying Express instance is resolved (calling
 * `app.init()` for a NestJS app) and cached; subsequent invocations reuse it.
 *
 * @param params - Handler parameters.
 * @param params.app - An Express application, or a NestJS app instance
 *   (detected via `getHttpAdapter`).
 * @param params.request - The Cloud Functions `Request`.
 * @param params.response - The Cloud Functions `Response`.
 * @returns The result of dispatching the request through Express.
 * @throws {CustomException} When `app` is not provided.
 *
 * @example
 * import { initGcpFunctionHandler } from '@incloodsolutions/node-toolkit';
 * import { app } from './app';
 *
 * export const api = (request, response) => initGcpFunctionHandler({ app, request, response });
 */
export async function initGcpFunctionHandler({
	app,
	request,
	response,
}: {
	app: Express | INestAppInstance;
	request: Request;
	response: Response;
}) {
	if (!app) {
		throw new CustomException('App instance must be defined!');
	}
	if (!expressApplication) {
		console.log('Initializing new API instance!');
		if (isNestApplication(app)) {
			expressApplication = app.getHttpAdapter().getInstance();
			await app.init();
		} else {
			expressApplication = app;
		}
	}
	return expressApplication(request, response);
}
