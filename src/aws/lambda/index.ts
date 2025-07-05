import { Express } from "express";
import serverlessExpress from '@codegenie/serverless-express';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, Context, EventBridgeEvent, SNSEvent, SQSEvent } from "aws-lambda";

import { ObjectType } from "../../interface";

let serverInstance: APIGatewayProxyHandlerV2;
const currentInvocation: {
	context: Context;
	event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
} = {
	event: null,
	context: null
};

type EventSources = 'AWS_SNS' | 'AWS_DYNAMODB' | 'AWS_EVENTBRIDGE' | 'AWS_SQS' | 'AWS_KINESIS_DATA_STREAM' | 'AWS_S3' | 'AWS_STEP_FUNCTIONS' | 'AWS_SELF_MANAGED_KAFKA';

export async function initLambdaApi<TEvent = any, TCallback = any>({ app, event, context, callback, options }: {
	app: Express;
	event: TEvent;
	context: Context;
	callback: TCallback;
	/** ConfigureParams from serverless-express */
	options?: {
		eventSource?: { getRequest?: any; getResponse?: any; };
		eventSourceRoutes?: { [key in EventSources]?: string };
	} & ObjectType;
}) {
	context.callbackWaitsForEmptyEventLoop = false;
	if (!serverInstance) {
		serverInstance = serverlessExpress({ ...options, app });
	}
	currentInvocation.event = event as any;
	currentInvocation.context = context;
	return await serverInstance(event as any, context, callback as any);
}

/** Get current lambda invocation, return null if not in lambda environment */
export function getCurrentLambdaInvocation() {
	return currentInvocation;
}