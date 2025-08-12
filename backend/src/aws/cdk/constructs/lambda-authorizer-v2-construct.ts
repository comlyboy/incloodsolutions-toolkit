import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaAuthorizer, HttpLambdaAuthorizerProps, HttpLambdaResponseType } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

import { IBaseCdkConstructProps } from '../../../interface';
import { CfnOutput } from 'aws-cdk-lib';

interface ILambdaAuthoriserV2ConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly authorizerOptions: HttpLambdaAuthorizerProps
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunction: Function;
}


export class BaseLambdaAuthoriserV2Construct extends Construct {
	readonly authoriser: HttpLambdaAuthorizer;

	constructor(scope: Construct, id: string, props: ILambdaAuthoriserV2ConstructProps) {
		super(scope, id);

		this.authoriser = new HttpLambdaAuthorizer(id, props.handlerFunction, {
			...props?.options?.authorizerOptions,
			identitySource: [
				'$request.header.Cookie',
				'$request.header.Authorization',
				...props?.options?.authorizerOptions?.identitySource
			],
			responseTypes: props?.options?.authorizerOptions?.responseTypes || [HttpLambdaResponseType.IAM, HttpLambdaResponseType.SIMPLE]
		});

		new CfnOutput(this, 'LambdaAuthorizerV2_ID', {
			value: this.authoriser.authorizerId
		});

	}
}