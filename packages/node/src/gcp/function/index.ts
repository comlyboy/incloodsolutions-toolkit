import { type Express, type Request, type Response } from 'express';

import { CustomException } from '@incloodsolutions/toolkit/error';

/**
 * Runs an Express application as a Google Cloud Functions HTTP handler by passing the
 * request and response straight to the app.
 *
 * @param params - Handler parameters.
 * @param params.app - The Express application.
 * @param params.request - The Cloud Functions `Request`.
 * @param params.response - The Cloud Functions `Response`.
 * @returns The result of dispatching the request through Express.
 * @throws {CustomException} When `app` is not provided.
 *
 * @example
 * import { initGcpFunctionHandler } from '@incloodsolutions/node-toolkit/gcp';
 * import { app } from './app';
 *
 * export const api = (request, response) => initGcpFunctionHandler({ app, request, response });
 */
export async function initGcpFunctionHandler({
	app,
	request,
	response,
}: {
	app: Express;
	request: Request;
	response: Response;
}) {
	if (!app) {
		throw new CustomException('App instance must be defined!');
	}

	return app(request, response);
}
