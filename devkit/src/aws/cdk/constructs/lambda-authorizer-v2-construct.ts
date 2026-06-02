import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaAuthorizer, HttpLambdaAuthorizerProps, HttpLambdaResponseType } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseLambdaAuthoriserV2Construct
 *
 * Provides configuration for:
 * - HTTP API Lambda authorizer (API Gateway v2)
 * - Authorizer behaviour and identity sources
 */
interface ILambdaAuthoriserV2ConstructProps extends Omit<IBaseCdkConstructProps<{
	/** HTTP Lambda authorizer configuration options */
	readonly authorizerOptions: HttpLambdaAuthorizerProps
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda function used as the authorizer handler
	 *
	 * This function is invoked to validate incoming HTTP requests
	 */
	readonly handlerFunction: Function;
}

/**
 * CDK construct for Lambda Authorizer (API Gateway v2 - HTTP API)
 *
 * Responsibilities:
 * - Creates an HTTP Lambda authorizer
 * - Applies default identity sources (Cookie and Authorization headers)
 * - Supports multiple response types (IAM and SIMPLE by default)
 * - Exposes the authorizer ID as a CloudFormation output
 */
export class BaseLambdaAuthoriserV2Construct extends Construct {
	/** The created HTTP Lambda Authorizer instance */
	readonly authoriser: HttpLambdaAuthorizer;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for authorizer and handler function
	 */
	constructor(scope: Construct, id: string, props: ILambdaAuthoriserV2ConstructProps) {
		super(scope, id);

		this.authoriser = new HttpLambdaAuthorizer(id, props.handlerFunction, {
			...props?.options?.authorizerOptions,

			/**
			 * Identity sources used to extract credentials from incoming requests
			 * Defaults to Cookie and Authorization headers
			 */
			identitySource: [
				'$request.header.Cookie',
				'$request.header.Authorization',
				...props?.options?.authorizerOptions?.identitySource
			],

			/**
			 * Supported response types for the authorizer
			 * Defaults to IAM and SIMPLE responses
			 */
			responseTypes:
				props?.options?.authorizerOptions?.responseTypes
				|| [HttpLambdaResponseType.IAM, HttpLambdaResponseType.SIMPLE]
		});

		/**
		 * CloudFormation output exposing the authorizer ID
		 */
		new CfnOutput(this, 'LambdaAuthorizerV2_ID', {
			value: this.authoriser.authorizerId
		});
	}
}