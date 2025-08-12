import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { TokenAuthorizer, TokenAuthorizerProps } from 'aws-cdk-lib/aws-apigateway';

import { IBaseCdkConstructProps } from '../../../interface';
import { CfnOutput } from 'aws-cdk-lib';

interface ILambdaAuthoriserConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly authorizerOptions: TokenAuthorizerProps
}>, 'appName' | 'stage' | 'stackName'> {
	readonly handlerFunction: Function;
}

export class BaseLambdaAuthoriserConstruct extends Construct {
	readonly authoriser: TokenAuthorizer;

	constructor(scope: Construct, id: string, props: ILambdaAuthoriserConstructProps) {
		super(scope, id);

		this.authoriser = new TokenAuthorizer(this, id, {
			...props.options?.authorizerOptions,
			handler: props.handlerFunction,
		});

		new CfnOutput(this, 'LambdaAuthorizerArn', {
			value: this.authoriser.authorizerArn
		});

	}
}