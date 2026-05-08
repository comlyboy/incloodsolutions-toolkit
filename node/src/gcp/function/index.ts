import { Express, Request, Response } from "express";

import { CustomException } from "@incloodsolutions/toolkit";
import { isNestApplication } from "../../utility";
import { INestAppInstance } from "../../interface";

let expressApplication: Express = null;

export async function initGcpFunctionHandler({ app, request, response }: {
	app: Express | INestAppInstance;
	request: Request; response: Response;
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
