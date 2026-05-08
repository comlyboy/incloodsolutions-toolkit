import { Express } from "express";
import serverlessExpress, { getCurrentInvoke } from '@codegenie/serverless-express';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, Context, EventBridgeEvent, SNSEvent, SQSEvent } from "aws-lambda";

import { ObjectType } from "@incloodsolutions/toolkit";
import { INestAppInstance } from "../../interface";
import { isNestApplication } from "../../utility";
import Framework from "@codegenie/serverless-express/src/frameworks";

let expressInstance: Express = null;
let lambdaInstance: APIGatewayProxyHandlerV2;

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
export async function initLambdaFunctionHandler<TEvent extends APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any> = any, TCallback = any>({ app, event, context, callback, options }: {
	app: Express | INestAppInstance;
	event: TEvent;
	context: Context;
	callback?: TCallback;
	/** ConfigureParams from serverless-express */
	options?: {
		loggerOptions?: {
			// powertools?: ConstructorOptions;
		};
		eventOptions?: {
			eventSource?: { getRequest?: any; getResponse?: any; };
			eventSourceRoutes?: { [key in EventSources]?: string };
			logSettings?: { level: string; };
			log?: Logger;
			framework?: Framework;
			binarySettings?: {
				isBinary?: boolean | Function;
				contentTypes: string[];
				contentEncodings: string[];
			};
			eventSourceName?: string;
			respondWithErrors?: boolean;
		} & ObjectType;
	} & ObjectType;
}): Promise<any> {
	context.callbackWaitsForEmptyEventLoop = false;
	if (!lambdaInstance) {
		if (!expressInstance) {
			if (isNestApplication(app)) {
				await app.init();
				expressInstance = app.getHttpAdapter().getInstance();
			} else {
				expressInstance = app;
			}
		}

		lambdaInstance = serverlessExpress({ app: expressInstance, ...options?.eventOptions as any });
	}
	return await lambdaInstance(event as any, context, callback as any);
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
	return getCurrentInvoke() as {
		context: Context;
		event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
	};
}