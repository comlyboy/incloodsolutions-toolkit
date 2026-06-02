import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { TokenAuthorizer, TokenAuthorizerProps } from 'aws-cdk-lib/aws-apigateway';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseLambdaAuthoriserConstruct
 *
 * Provides configuration for:
 * - Lambda token authorizer
 * - Authorizer behaviour and settings
 */
interface ILambdaAuthoriserConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Token authorizer configuration options */
	readonly authorizerOptions: TokenAuthorizerProps
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda function used as the authorizer handler
	 *
	 * This function is invoked to validate incoming requests
	 */
	readonly handlerFunction: Function;
}

/**
 * CDK construct for Lambda Token Authorizer (API Gateway v1)
 *
 * Responsibilities:
 * - Creates a Token Authorizer backed by a Lambda function
 * - Applies optional configuration overrides
 * - Exposes the authorizer ARN as a CloudFormation output
 */
export class BaseLambdaAuthoriserConstruct extends Construct {
	/** The created Token Authorizer instance */
	readonly authoriser: TokenAuthorizer;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for authorizer and handler function
	 */
	constructor(scope: Construct, id: string, props: ILambdaAuthoriserConstructProps) {
		super(scope, id);

		this.authoriser = new TokenAuthorizer(this, id, {
			...props.options?.authorizerOptions,

			/**
			 * Lambda handler responsible for request authorization
			 */
			handler: props.handlerFunction,
		});

		/**
		 * CloudFormation output exposing the authorizer ARN
		 */
		new CfnOutput(this, 'LambdaAuthorizerArn', {
			value: this.authoriser.authorizerArn
		});
	}
}