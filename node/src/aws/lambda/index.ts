import { Express } from "express";
import serverlessExpress from '@codegenie/serverless-express';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, Context, EventBridgeEvent, SNSEvent, SQSEvent } from "aws-lambda";
import { ConstructorOptions } from "@aws-lambda-powertools/logger/lib/cjs/types/Logger";

import { ObjectType } from "@incloodsolutions/toolkit";

let serverInstance: APIGatewayProxyHandlerV2;
const currentInvocation: {
	context: Context;
	event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
} = {
	event: null,
	context: null
};

type EventSources = 'AWS_SNS' | 'AWS_DYNAMODB' | 'AWS_EVENTBRIDGE' | 'AWS_SQS' | 'AWS_KINESIS_DATA_STREAM' | 'AWS_S3' | 'AWS_STEP_FUNCTIONS' | 'AWS_SELF_MANAGED_KAFKA';

/**
 * Initializes and returns a serverless Lambda handler for an Express application
 *
 * @template TEvent - Type of the event
 * @template TCallback - Type of the callback
 *
 * @param {Object} params - Initialization parameters
 * @param {Express} params.app - Express application instance
 * @param {TEvent} params.event - Lambda event object
 * @param {Context} params.context - Lambda execution context
 * @param {TCallback} params.callback - Lambda callback function
 * @param {Object} [params.options] - Optional configuration for serverlessExpress and logging
 * @param {Object} [params.options.loggerOptions] - Logger configuration
 * @param {ConstructorOptions} [params.options.loggerOptions.powertools] - Powertools logger options
 * @param {Object} [params.options.eventOptions] - Event source configuration
 * @param {Object} [params.options.eventOptions.eventSource] - Custom getRequest/getResponse handlers
 * @param {Record<EventSources, string>} [params.options.eventOptions.eventSourceRoutes] - Routes by event source
 *
 * @returns {Promise<any>} - The result of invoking the serverless Express handler
 */
export async function initLambdaHandler<TEvent extends APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any> = any, TCallback = any>({ app, event, context, callback, options }: {
	app: Express;
	event: TEvent;
	context: Context;
	callback: TCallback;
	/** ConfigureParams from serverless-express */
	options?: {
		loggerOptions?: {
			powertools?: ConstructorOptions;
		};
		eventOptions?: {
			eventSource?: { getRequest?: any; getResponse?: any; };
			eventSourceRoutes?: { [key in EventSources]?: string };
		};
	} & ObjectType;
}): Promise<any> {
	// new Logger().addContext(context);
	context.callbackWaitsForEmptyEventLoop = false;
	if (!serverInstance) {
		serverInstance = serverlessExpress({ ...options, app });
	}
	currentInvocation.event = event as any;
	currentInvocation.context = context;
	return await serverInstance(event as any, context, callback as any);
}

/**
 * Retrieves the current Lambda invocation context and event.
 * Returns `null` values if not running in a Lambda environment.
 *
 * @returns {{ context: Context; event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any> }} The current invocation object
 */
export function getCurrentLambdaInvocation(): {
	context: Context;
	event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
} {
	return currentInvocation;
}