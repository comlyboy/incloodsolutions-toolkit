import { APIGatewayProxyCallbackV2, APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, Context } from "aws-lambda";
import serverlessExpress from '@codegenie/serverless-express';
import Express from "express";

import { isLambdaEnvironment } from "../../utility";
import { CustomException } from "../../error";


let serverInstance: APIGatewayProxyHandlerV2;
const currentInvocation: { event: APIGatewayProxyEventV2, context: Context } = {
	event: null,
	context: null
};

type EventSources = 'AWS_SNS' | 'AWS_DYNAMODB' | 'AWS_EVENTBRIDGE' | 'AWS_SQS' | 'AWS_KINESIS_DATA_STREAM' | 'AWS_S3' | 'AWS_STEP_FUNCTIONS' | 'AWS_SELF_MANAGED_KAFKA';

export async function initLambdaApi({ app, event, context, callback, options }: {
	app: Express.Express;
	event: APIGatewayProxyEventV2;
	context: Context;
	callback: APIGatewayProxyCallbackV2;
	options?: {
		eventSource?: { getRequest?: any; getResponse?: any; };
		eventSourceRoutes?: { [key in EventSources]?: string };
	}
}) {
	context.callbackWaitsForEmptyEventLoop = false;
	if (!serverInstance) {
		serverInstance = serverlessExpress({ app, ...options });
	}
	currentInvocation.event = event;
	currentInvocation.context = context;
	return await serverInstance(event, context, callback);
}


export function logDebugger(context: string, message: string) {
	const ctx = context ? `[${context}]` : '';
	console.log(`${new Date().toISOString()} - LOG [${ctx}] ${message}`);
}

export function getCurrentLambdaInvocation() {
	if (!isLambdaEnvironment()) {
		throw new CustomException('Server not running in a Lambda environment!');
	}
	return currentInvocation;
}