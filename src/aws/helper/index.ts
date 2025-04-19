import { APIGatewayProxyCallbackV2, APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, Context } from "aws-lambda";
import Express from "express";
import serverlessExpress from '@codegenie/serverless-express';


let serverInstance: APIGatewayProxyHandlerV2;

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
	return await serverInstance(event, context, callback);
}


export function logDebugger(context: string, message: string) {
	const ctx = context ? `[${context}]` : '';
	console.log(`${new Date().toISOString()} - LOG [${ctx}] ${message}`);
}