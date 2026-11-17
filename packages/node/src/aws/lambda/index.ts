import type { Express } from 'express';
import serverlessExpress, {
	getCurrentInvoke,
} from '@codegenie/serverless-express';
import {
	APIGatewayProxyEventV2,
	APIGatewayProxyHandlerV2,
	Context,
	EventBridgeEvent,
	SNSEvent,
	SQSEvent,
} from 'aws-lambda';
// type-only: importing this as a value pulls the framework adapters (express,
// fastify, koa, hapi) — and their `require('fs')` calls — into the ESM bundle.
import type Framework from '@codegenie/serverless-express/src/frameworks';
import { ObjectType } from '@incloodsolutions/toolkit/interface';

let lambdaInstance: APIGatewayProxyHandlerV2;

type EventSources =
	| 'AWS_SNS'
	| 'AWS_DYNAMODB'
	| 'AWS_EVENTBRIDGE'
	| 'AWS_SQS'
	| 'AWS_KINESIS_DATA_STREAM'
	| 'AWS_S3'
	| 'AWS_STEP_FUNCTIONS'
	| 'AWS_SELF_MANAGED_KAFKA';

/**
 * Runs an Express application as an AWS Lambda handler, using `@codegenie/serverless-express`.
 *
 * The first call builds the serverless-express handler and caches it, so warm invocations reuse
 * it. `context.callbackWaitsForEmptyEventLoop` is set to `false` so the function returns as soon
 * as the response is ready.
 *
 * @typeParam TEvent - The Lambda event: API Gateway v2, SNS, SQS or EventBridge.
 *
 * @param params - Handler parameters.
 * @param params.app - The Express application.
 * @param params.event - The Lambda event.
 * @param params.context - The Lambda execution context.
 * @param params.options - Optional serverless-express configuration.
 * @param params.options.eventOptions - Passed to serverless-express: custom `eventSource`
 *   `getRequest`/`getResponse`, `eventSourceRoutes` (a route per event source), binary settings,
 *   `respondWithErrors` and so on.
 *
 * @returns The result of invoking the serverless-express handler.
 *
 * @example
 * export const handler = (event, context) => initLambdaFunctionHandler({ app, event, context });
 */
export async function initLambdaFunctionHandler<
	TEvent extends
		APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any> =
		any,
>({
	app,
	event,
	context,
	options,
}: {
	app: Express;
	event: TEvent;
	context: Context;
	/** ConfigureParams from serverless-express */
	options?: {
		loggerOptions?: {
			// powertools?: ConstructorOptions;
		};
		eventOptions?: {
			eventSource?: { getRequest?: any; getResponse?: any };
			eventSourceRoutes?: { [key in EventSources]?: string };
			logSettings?: { level: string };
			log?: any;
			framework?: Framework;
			binarySettings?: {
				isBinary?: boolean | ((...args: any[]) => boolean);
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
		lambdaInstance = serverlessExpress({
			app,
			...(options?.eventOptions as any),
		});
	}
	return lambdaInstance(event as any, context, undefined);
}

/**
 * Retrieves the current Lambda invocation context and event.
 * Returns `null` values if not running in a Lambda environment.
 *
 * @returns {{ context: Context; event: APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any> }} The current invocation object
 */
export function getCurrentLambdaInvocation(): {
	context: Context;
	event:
		APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
} {
	return getCurrentInvoke() as {
		context: Context;
		event:
			APIGatewayProxyEventV2 | SNSEvent | SQSEvent | EventBridgeEvent<any, any>;
	};
}
