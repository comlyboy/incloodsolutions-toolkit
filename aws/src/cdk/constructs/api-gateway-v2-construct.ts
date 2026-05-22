import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AddRoutesOptions, CorsHttpMethod, HttpApi, HttpApiProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { CustomException } from '@incloodsolutions/toolkit';

import { IBaseConstruct, IBaseCdkConstructProps } from '../../../interface';

/**
 * Properties for configuring the API Gateway v2 construct
 *
 * Extends base CDK construct props and provides configuration for:
 * - HTTP API (Api Gateway v2)
 * - Route definitions
 * - Lambda handlers
 */
interface IApiGatewayV2ConstructProps extends Omit<IBaseCdkConstructProps<{
	/** HTTP API configuration options */
	readonly gatewayOptions: HttpApiProps;

	/** Route definitions passed directly to `addRoutes` */
	readonly routeOptions: Partial<AddRoutesOptions>[];
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda functions used as route handlers
	 *
	 * Note:
	 * Each handler is paired with each route during route creation
	 */
	readonly handlerFunctions: Function[];
}


/**
 * CDK construct for creating an API Gateway v2 (HTTP API)
 *
 * Responsibilities:
 * - Creates an HTTP API with optional custom configuration
 * - Applies default CORS configuration when not provided
 * - Attaches routes with Lambda integrations
 * - Exposes API URL as a CloudFormation output
 *
 * Behaviour:
 * - Each route is registered for every provided handler function
 * - Throws if no handler functions are supplied
 */
export class BaseApiGatewayV2Construct extends Construct implements IBaseConstruct {
	/** The created HTTP API instance */
	readonly api: HttpApi;

	/** Enables debug logging (if used externally) */
	enableDebug = false;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for API, routes, and handlers
	 */
	constructor(scope: Construct, id: string, props: IApiGatewayV2ConstructProps) {
		super(scope, id);

		this.enableDebug = props.enableDebug;

		this.api = new HttpApi(this, id, {
			...props?.options?.gatewayOptions,

			/** Default API description if not provided */
			description: props?.options?.gatewayOptions?.description || 'This is an Http API using CDK',

			/**
			 * CORS configuration
			 * Falls back to allowing all methods and standard headers if not explicitly defined
			 */
			corsPreflight: {
				...props.options?.gatewayOptions?.corsPreflight,

				/** Allow all HTTP methods by default */
				allowMethods: props.options?.gatewayOptions?.corsPreflight?.allowMethods || Object.values(CorsHttpMethod),

				/** Merge default headers with user-defined headers */
				allowHeaders: [
					'Content-Type',
					'Accept',
					'X-Amz-Date',
					'Authorization',
					'X-Api-Key',
					'X-Amz-Security-Token',
					'X-Amz-User-Agent',
					...props.options?.gatewayOptions?.corsPreflight?.allowHeaders || []
				]
			}
		});

		/**
		 * Ensure at least one handler function is provided
		 */
		if (!props?.handlerFunctions?.length) {
			throw new CustomException('Construct requires atleast one function');
		}

		/**
		 * Register routes with Lambda integrations
		 */
		if (props?.options?.routeOptions?.length) {
			props.handlerFunctions.forEach(handlerFunc => {
				props?.options?.routeOptions.forEach(route => {
					this.api.addRoutes({
						...route,

						/**
						 * Lambda integration for each route
						 */
						integration: new HttpLambdaIntegration('routes', handlerFunc)
					} as AddRoutesOptions);
				});
			});
		}

		/**
		 * Apply removal policy (useful for non-production environments)
		 */
		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		/**
		 * CloudFormation output exposing the API base URL
		 */
		new CfnOutput(this, 'ApiGatewayV2', {
			value: this.api.url,
		});
	}
}