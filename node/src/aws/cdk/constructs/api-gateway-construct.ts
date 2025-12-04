import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { CfnOutput, RemovalPolicy, Size } from 'aws-cdk-lib';
import { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Cors, IResource, LambdaIntegration, RestApi, RestApiProps } from 'aws-cdk-lib/aws-apigateway';

import { logDebugger } from '../../../utility';
import { IBaseCdkConstructProps, IBaseConstruct, } from '../../../interface';

/**
 * Represents a route configuration for the API Gateway
 * @interface IRouteOption
 */
interface IRouteOption {
	/** The name/path segment of the route */
	name: string;
	/** The HTTP method for this route */
	method: `${HttpMethod}`;
	/** Optional nested routes */
	children?: IRouteOption[];
}

/**
 * Properties for configuring the API Gateway construct
 * @interface IApiGatewayConstructProps
 */
interface IApiGatewayConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration options for the REST API */
	readonly gatewayOptions: RestApiProps;
	/** Array of route configurations */
	readonly routeOptions: IRouteOption[];
}>, 'appName' | 'stage' | 'stackName'> {
	/** Lambda function to handle API requests */
	readonly handlerFunction: Function;
}

/**
 * CDK construct for creating an API Gateway with REST endpoints
 * Handles CORS configuration and route creation with Lambda integration
 */
export class BaseApiGatewayConstruct extends Construct implements IBaseConstruct {
	readonly api: RestApi;
	enableDebug = false;

	constructor(scope: Construct, id: string, props: IApiGatewayConstructProps) {
		super(scope, id);

		this.enableDebug = props.enableDebug;

		this.api = new RestApi(this, id, {
			...props?.options?.gatewayOptions,
			description: props?.options?.gatewayOptions?.description || 'This is a REST API using CDK',
			defaultCorsPreflightOptions: {
				...props?.options?.gatewayOptions?.defaultCorsPreflightOptions,
				allowOrigins: props?.options?.gatewayOptions?.defaultCorsPreflightOptions?.allowOrigins || Cors.ALL_ORIGINS,
				allowMethods: props?.options?.gatewayOptions?.defaultCorsPreflightOptions?.allowMethods || Cors.ALL_METHODS,
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
			minCompressionSize: props?.options?.gatewayOptions?.minCompressionSize || Size.bytes(1),
		});

		if (props?.options?.routeOptions?.length && props?.handlerFunction) {
			const integration = new LambdaIntegration(props.handlerFunction);
			this.addRoutes(this.api.root, props.options.routeOptions, integration);
		}

		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'ApiGateway', {
			value: this.api.url
		});
	}

	/**
	 * Recursively adds routes to the API Gateway
	 * @param parent Parent resource to add routes to
	 * @param routes Array of route configurations
	 * @param integration Lambda integration for the routes
	 * @param previousPath Optional path prefix for nested routes
	 * @private
	 */
	private addRoutes(parent: IResource, routes: IRouteOption[], integration: LambdaIntegration, previousPath?: string) {
		routes.forEach(route => {
			const currentPath = `${previousPath || ''}/${route.name}`;
			const resource = parent.addResource(route.name);
			resource.addMethod(route.method, integration);
			if (route?.children.length) {
				this.addRoutes(resource, route.children, integration, currentPath);
			}
			if (this.enableDebug) {
				logDebugger(BaseApiGatewayConstruct.name, `Route created: ${route.method} ${currentPath}`);
			}
		});
	}
}
