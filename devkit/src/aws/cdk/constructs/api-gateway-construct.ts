import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { CfnOutput, RemovalPolicy, Size } from 'aws-cdk-lib';
import { Cors, IResource, LambdaIntegration, RestApi, RestApiProps } from 'aws-cdk-lib/aws-apigateway';

import { IBaseCdkConstructProps, IBaseConstruct } from '../../types';
import { logDebugger } from '../../../utility';


/**
 * Route definition for API Gateway resources
 *
 * Supports hierarchical route structures using `children`
 */
interface IRouteOption {
	/** Path segment (e.g. 'users', 'orders') */
	name: string;

	/** HTTP method for the route */
	method: `${HttpMethod}`;

	/** Nested routes under this path */
	children?: IRouteOption[];
}

/**
 * Props for BaseApiGatewayConstruct
 *
 * Provides configuration for:
 * - REST API (API Gateway v1)
 * - Route definitions
 * - Lambda handler
 */
interface IApiGatewayConstructProps extends Omit<IBaseCdkConstructProps<{
	/** REST API configuration options */
	readonly gatewayOptions: RestApiProps;

	/** Route definitions used to build API resources */
	readonly routeOptions: IRouteOption[];
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda function handling all API routes
	 *
	 * Note:
	 * A single Lambda integration is reused across all routes
	 */
	readonly handlerFunction: Function;
}

/**
 * CDK construct for REST API Gateway with Lambda integration
 *
 * Responsibilities:
 * - Creates a REST API with configurable options
 * - Applies default CORS and compression settings when not provided
 * - Recursively builds API resources from route definitions
 * - Exposes API base URL as a CloudFormation output
 */
export class BaseApiGatewayConstruct extends Construct implements IBaseConstruct {
	/** The created REST API instance */
	readonly api: RestApi;

	/** Enables debug logging for route creation */
	enableDebug = false;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for API, routes, and Lambda handler
	 */
	constructor(scope: Construct, id: string, props: IApiGatewayConstructProps) {
		super(scope, id);

		this.enableDebug = props.enableDebug;

		this.api = new RestApi(this, id, {
			...props?.options?.gatewayOptions,

			/** Default API description if not provided */
			description: props?.options?.gatewayOptions?.description || 'This is a REST API using CDK',

			/**
			 * CORS configuration
			 * Falls back to allowing all origins, methods, and standard headers
			 */
			defaultCorsPreflightOptions: {
				...props?.options?.gatewayOptions?.defaultCorsPreflightOptions,

				/** Allow all origins by default */
				allowOrigins: props?.options?.gatewayOptions?.defaultCorsPreflightOptions?.allowOrigins || Cors.ALL_ORIGINS,

				/** Allow all HTTP methods by default */
				allowMethods: props?.options?.gatewayOptions?.defaultCorsPreflightOptions?.allowMethods || Cors.ALL_METHODS,

				/** Merge default headers with user-defined headers */
				allowHeaders: [
					...props.options?.gatewayOptions?.defaultCorsPreflightOptions?.allowHeaders,
					'Content-Type',
					'Accept',
					'X-Amz-Date',
					'Authorization',
					'X-Api-Key',
					'X-Amz-Security-Token',
					'X-Amz-User-Agent'
				]
			},

			/** Minimum payload size (in bytes) before compression is applied */
			minCompressionSize: props?.options?.gatewayOptions?.minCompressionSize || Size.bytes(1),
		});

		/**
		 * Register routes if provided
		 */
		if (props?.options?.routeOptions?.length && props?.handlerFunction) {
			const integration = new LambdaIntegration(props.handlerFunction);

			/**
			 * Attach routes recursively starting from API root
			 */
			this.addRoutes(this.api.root, props.options.routeOptions, integration);
		}

		/**
		 * Apply removal policy (useful for non-production environments)
		 */
		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		/**
		 * CloudFormation output exposing API base URL
		 */
		new CfnOutput(this, 'ApiGateway', {
			value: this.api.url
		});
	}

	/**
	 * Recursively attaches routes to the API Gateway
	 *
	 * Behaviour:
	 * - Creates a resource for each route segment
	 * - Attaches method + Lambda integration
	 * - Traverses child routes for nested paths
	 *
	 * @param parent Parent API resource
	 * @param routes Route definitions
	 * @param integration Lambda integration applied to each route
	 * @param previousPath Accumulated path (used for debug logging)
	 * @private
	 */
	private addRoutes(
		parent: IResource,
		routes: IRouteOption[],
		integration: LambdaIntegration,
		previousPath?: string
	) {
		routes.forEach(route => {
			const currentPath = `${previousPath || ''}/${route.name}`;

			const resource = parent.addResource(route.name);

			/** Attach HTTP method with Lambda integration */
			resource.addMethod(route.method, integration);

			/** Recursively process child routes */
			if (route?.children.length) {
				this.addRoutes(resource, route.children, integration, currentPath);
			}

			/** Optional debug logging */
			if (this.enableDebug) {
				logDebugger(BaseApiGatewayConstruct.name, `Route created: ${route.method} ${currentPath}`);
			}
		});
	}
}