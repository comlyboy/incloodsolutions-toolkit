import { CloudEventFunction, CloudEventFunctionWithCallback } from "@google-cloud/functions-framework";
import { CustomException } from "@incloodsolutions/toolkit";
import { Express } from "express";

export async function initGcpFunctionHandler<TData = any>({ app, cloudEventFn }: {
	app?: Express;
	cloudEventFn?: CloudEventFunction<TData> | CloudEventFunctionWithCallback<TData>;
}) {

	if (!app && (!cloudEventFn || typeof cloudEventFn !== 'function')) {
		throw new CustomException('CloudEvent, cloudEventPath must be defined!');
	}

	if (app && cloudEventFn) {
		throw new CustomException('Two event type cannot be defined at same time!');
	}

	if (cloudEventFn) {
		return cloudEventFn;
	}

	return app;
}
