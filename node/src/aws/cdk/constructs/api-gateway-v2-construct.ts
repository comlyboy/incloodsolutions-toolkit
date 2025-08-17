import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AddRoutesOptions, CorsHttpMethod, HttpApi, HttpApiProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { CustomException } from '../../../error';
import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';

interface IApiGatewayV2ConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly gatewayOptions: HttpApiProps;
	readonly routeOptions: Partial<AddRoutesOptions>[];
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunctions: Function[];
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

		if (!props?.handlerFunctions?.length) {
			throw new CustomException('Construct requires atleast one function');
		}

		if (props?.options?.routeOptions?.length) {
			props.handlerFunctions.forEach(handlerFunc => {
				props?.options?.routeOptions.forEach(route => {
					this.api.addRoutes({
						...route,
						integration: new HttpLambdaIntegration('routes', handlerFunc)
					} as AddRoutesOptions);
				});
			});
		}

		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'ApiGatewayV2', {
			value: this.api.url,
		});
	}
}
