import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AddRoutesOptions, HttpApi, HttpApiProps } from 'aws-cdk-lib/aws-apigatewayv2';

import { IBaseCdkConstructProps } from 'src/interface';

interface IApiGatewayConstructProps extends Omit<IBaseCdkConstructProps<{
	gatewayOptions: HttpApiProps;
	routeOptions: Partial<AddRoutesOptions>;
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunction: Function;
}


export class ApiGatewayV2Construct extends Construct {
	readonly api: HttpApi;
	constructor(scope: Construct, id: string, props: IApiGatewayConstructProps) {
		super(scope, id);

		this.api = new HttpApi(this, id, {
			...props?.options?.gatewayOptions,
			corsPreflight: {
				...props.options?.gatewayOptions?.corsPreflight,
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

		if (props?.options?.routeOptions) {
			this.api.addRoutes({
				...props.options.routeOptions,
				integration: new HttpLambdaIntegration('routes', props.handlerFunction)
			} as AddRoutesOptions);
		}
		this.api.applyRemovalPolicy(RemovalPolicy.DESTROY);
	}
}
