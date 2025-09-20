import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketApi, WebSocketApiProps, WebSocketRouteOptions, WebSocketStage, WebSocketStageProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { IBaseCdkConstructProps } from '../../../interface';


/**
 * Properties for configuring the WebSocket API Gateway construct
 * @interface IApiGatewayWebsocketConstructProps
 */
interface IApiGatewayWebsocketConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration options for the WebSocket API */
	readonly webSocketApiOptions: WebSocketApiProps;
	/** Configuration options for the WebSocket stage */
	readonly webSocketStageOptions: WebSocketStageProps;
}>, 'appName' | 'stage' | 'stackName'> {
	/** Handler functions and options for WebSocket lifecycle events */
	readonly handlers: {
		readonly connect: {
			option: WebSocketRouteOptions;
			function: Function;
		};
		readonly default: {
			option: WebSocketRouteOptions;
			function: Function;
		};
		readonly message: {
			option: WebSocketRouteOptions;
			function: Function;
		};
		readonly disconnect: {
			option: WebSocketRouteOptions;
			function: Function;
		};
	}
}

/**
 * CDK construct for creating a WebSocket API Gateway
 * Handles WebSocket connections, messages, and disconnections with Lambda integrations
 */
export class BaseApiGatewayWebSocketConstruct extends Construct {
	readonly socketApi: WebSocketApi;

	constructor(scope: Construct, id: string, props: IApiGatewayWebsocketConstructProps) {
		super(scope, id);
		this.socketApi = new WebSocketApi(this, id, {
			...props.options.webSocketApiOptions,
			connectRouteOptions: {
				...props.handlers.connect?.option,
				integration: new WebSocketLambdaIntegration('connectIntegration', props.handlers.connect.function),
			},
			disconnectRouteOptions: {
				...props.handlers.disconnect?.option,
				integration: new WebSocketLambdaIntegration('disconnectIntegration', props.handlers.disconnect.function)
			},
			defaultRouteOptions: {
				...props.handlers.default?.option,
				integration: new WebSocketLambdaIntegration('defaultIntegration', props.handlers.default.function)
			},
		});

		this.socketApi.addRoute("notifications", {
			...props.handlers.message?.option,
			integration: new WebSocketLambdaIntegration('routes', props.handlers.message.function),
		});

		// Deploy WebSocket API
		const webSocketStage = new WebSocketStage(this, `${id}_stage`, {
			...props.options?.webSocketStageOptions,
			webSocketApi: this.socketApi,
			autoDeploy: true
		});

		new CfnOutput(this, 'WebSocketURL', {
			value: webSocketStage.url,
		});
	}
}
