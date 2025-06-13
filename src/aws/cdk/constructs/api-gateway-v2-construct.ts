import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AddRoutesOptions, CorsHttpMethod, HttpApi, HttpApiProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';

interface IApiGatewayV2ConstructProps extends Omit<IBaseCdkConstructProps<{
	gatewayOptions: HttpApiProps;
	routeOptions: Partial<AddRoutesOptions>[];
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunction: Function;
}


export class BaseApiGatewayV2Construct extends Construct implements IBaseConstruct {
	readonly api: HttpApi;

	enableDebug = false;

	constructor(scope: Construct, id: string, props: IApiGatewayV2ConstructProps) {
		super(scope, id);

		this.enableDebug = props.enableDebug;

		this.api = new HttpApi(this, id, {
			...props?.options?.gatewayOptions,
			description: props?.options?.gatewayOptions?.description || 'This is an Http API using CDK',
			corsPreflight: {
				...props.options?.gatewayOptions?.corsPreflight,
				allowMethods: props.options?.gatewayOptions?.corsPreflight?.allowMethods || Object.values(CorsHttpMethod),
				allowHeaders: [
					...props.options?.gatewayOptions?.corsPreflight?.allowHeaders,
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

		if (props?.options?.routeOptions?.length) {
			props?.options?.routeOptions.forEach(route => {
				this.api.addRoutes({
					...route,
					integration: new HttpLambdaIntegration('routes', props.handlerFunction)
				} as AddRoutesOptions);
			});
		}

		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'Api-Gateway-V2', {
			value: this.api.url,
		});
	}
}
