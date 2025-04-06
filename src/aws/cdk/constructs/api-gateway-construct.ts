import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Cors, IResource, LambdaIntegration, RestApi, RestApiProps } from 'aws-cdk-lib/aws-apigateway';

import { IBaseCdkConstructProps, IBaseConstruct, } from 'src/interface';
import { logDebugger } from 'src/aws';

interface IRouteOption {
	name: string
	method: `${HttpMethod}`,
	children?: IRouteOption[];
}

interface IApiGatewayConstructProps extends Omit<IBaseCdkConstructProps<{
	gatewayOptions: RestApiProps;
	routeOptions: IRouteOption[];
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunction: Function;
}

export class ApiGatewayConstruct extends Construct implements IBaseConstruct {
	readonly api: RestApi;
	isDebugMode = false;

	constructor(scope: Construct, id: string, props: IApiGatewayConstructProps) {
		super(scope, id);

		this.isDebugMode = props.enableDebugMode;

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
			}
		});

		if (props?.options?.routeOptions?.length && props?.handlerFunction) {
			const integration = new LambdaIntegration(props.handlerFunction);
			this.addRoutes(this.api.root, props.options.routeOptions, integration);
		}

		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'Api-Gateway', {
			value: this.api.url,
		});
	}

	private addRoutes(parent: IResource, routes: IRouteOption[], integration: LambdaIntegration, previousPath?: string) {
		routes.forEach(route => {
			const currentPath = `${previousPath || ''}/${route.name}`;
			const resource = parent.addResource(route.name);
			resource.addMethod(route.method, integration);
			if (route?.children.length) {
				this.addRoutes(resource, route.children, integration, currentPath);
			}
			if (this.isDebugMode) {
				logDebugger(ApiGatewayConstruct.name, `Route created: ${route.method} ${currentPath}`);
			}
		});
	}
}
