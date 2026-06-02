import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketApi, WebSocketApiProps, WebSocketRouteOptions, WebSocketStage, WebSocketStageProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseApiGatewayWebSocketConstruct
 *
 * Provides configuration for:
 * - WebSocket API (API Gateway v2)
 * - WebSocket stage
 * - Route handlers for lifecycle events
 */
interface IApiGatewayWebsocketConstructProps extends Omit<IBaseCdkConstructProps<{
	/** WebSocket API configuration options */
	readonly webSocketApiOptions: WebSocketApiProps;

	/** WebSocket stage configuration options */
	readonly webSocketStageOptions: WebSocketStageProps;
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda handlers mapped to WebSocket lifecycle routes
	 *
	 * Includes:
	 * - $connect
	 * - $disconnect
	 * - $default
	 * - custom message route
	 */
	readonly handlers: {
		/** Handler for connection establishment ($connect) */
		readonly connect: {
			option: WebSocketRouteOptions;
			function: Function;
		};

		/** Handler for unmatched routes ($default) */
		readonly default: {
			option: WebSocketRouteOptions;
			function: Function;
		};

		/** Handler for custom message route (e.g. 'notifications') */
		readonly message: {
			option: WebSocketRouteOptions;
			function: Function;
		};

		/** Handler for disconnection events ($disconnect) */
		readonly disconnect: {
			option: WebSocketRouteOptions;
			function: Function;
		};
	}
}

/**
 * CDK construct for WebSocket API Gateway
 *
 * Responsibilities:
 * - Creates a WebSocket API with lifecycle route integrations
 * - Registers a custom message route
 * - Deploys a stage with auto-deploy enabled
 * - Exposes WebSocket endpoint URL as a CloudFormation output
 */
export class BaseApiGatewayWebSocketConstruct extends Construct {
	/** The created WebSocket API instance */
	readonly socketApi: WebSocketApi;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for API, stage, and route handlers
	 */
	constructor(scope: Construct, id: string, props: IApiGatewayWebsocketConstructProps) {
		super(scope, id);

		this.socketApi = new WebSocketApi(this, id, {
			...props.options.webSocketApiOptions,

			/**
			 * Route for connection establishment ($connect)
			 */
			connectRouteOptions: {
				...props.handlers.connect?.option,
				integration: new WebSocketLambdaIntegration('connectIntegration', props.handlers.connect.function),
			},

			/**
			 * Route for disconnection events ($disconnect)
			 */
			disconnectRouteOptions: {
				...props.handlers.disconnect?.option,
				integration: new WebSocketLambdaIntegration('disconnectIntegration', props.handlers.disconnect.function)
			},

			/**
			 * Default route for unmatched messages ($default)
			 */
			defaultRouteOptions: {
				...props.handlers.default?.option,
				integration: new WebSocketLambdaIntegration('defaultIntegration', props.handlers.default.function)
			},
		});

		/**
		 * Custom message route (e.g. "notifications")
		 */
		this.socketApi.addRoute("notifications", {
			...props.handlers.message?.option,

			/** Lambda integration for message handling */
			integration: new WebSocketLambdaIntegration('routes', props.handlers.message.function),
		});

		/**
		 * WebSocket stage deployment
		 * Auto-deploy ensures changes are immediately available
		 */
		const webSocketStage = new WebSocketStage(this, `${id}_stage`, {
			...props.options?.webSocketStageOptions,
			webSocketApi: this.socketApi,
			autoDeploy: true
		});

		/**
		 * CloudFormation output exposing WebSocket endpoint URL
		 */
		new CfnOutput(this, 'WebSocketURL', {
			value: webSocketStage.url,
		});
	}
}