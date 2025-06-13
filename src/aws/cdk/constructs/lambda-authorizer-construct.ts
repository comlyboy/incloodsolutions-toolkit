import { Construct } from 'constructs';
import { TokenAuthorizer, TokenAuthorizerProps } from 'aws-cdk-lib/aws-apigateway';

import { IBaseCdkConstructProps } from '../../../interface';

interface ILambdaAuthoriserConstructProps extends Omit<IBaseCdkConstructProps<TokenAuthorizerProps>, 'appName' | 'stage' | 'stackName'> { }

export class BaseLambdaAuthoriserConstruct extends Construct {
	readonly authoriser: TokenAuthorizer;

	constructor(scope: Construct, id: string, props: ILambdaAuthoriserConstructProps) {
		super(scope, id);

		this.authoriser = new TokenAuthorizer(this, id, {
			...props.options
		});

	}
}