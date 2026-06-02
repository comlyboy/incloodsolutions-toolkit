import { Construct } from 'constructs';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Architecture, Code, Function, FunctionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { detectDuplicateProperties, AppEnvironmentEnum } from '@incloodsolutions/toolkit';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseLambdaConstruct
 *
 * Provides configuration for creating a Lambda function
 * with optional overrides for runtime, memory, timeout, and environment.
 */
interface ILambdaConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Partial Lambda configuration options */
	readonly lambdaOptions: Partial<FunctionProps>;
}>, 'appName'> { }

/**
 * CDK construct for AWS Lambda function
 *
 * Responsibilities:
 * - Creates a Lambda function with sensible defaults
 * - Merges and validates environment variables
 * - Applies stage-based configuration (e.g. timeout)
 * - Exposes the function ARN as a CloudFormation output
 */
export class BaseLambdaConstruct extends Construct {
	/** The created Lambda function instance */
	readonly function: Function;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for Lambda function
	 */
	constructor(scope: Construct, id: string, props: ILambdaConstructProps) {
		super(scope, id);

		/**
		 * Environment variables for the Lambda function
		 *
		 * Includes:
		 * - User-defined variables
		 * - NODE_ENV derived from stage
		 * - Node.js runtime optimisations
		 */
		const environment = {
			...props.options?.lambdaOptions?.environment,
			NODE_ENV: props.stage,
			NODE_OPTIONS: '--enable-source-maps',
			AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
		};

		/**
		 * Validate environment variables for duplicate keys
		 */
		detectDuplicateProperties({ data: environment });

		this.function = new Function(this, id, {
			...props?.options?.lambdaOptions,

			/**
			 * Lambda function name
			 * Defaults to "<stackName>-handler" if not provided
			 */
			functionName:
				`${props?.options?.lambdaOptions?.functionName || props?.stackName}-handler`,

			/**
			 * Function description
			 */
			description:
				props?.options?.lambdaOptions?.description
				|| 'A lambda function',

			/**
			 * Entry handler for the Lambda function
			 */
			handler:
				props?.options?.lambdaOptions?.handler
				|| 'lambda.handler',

			/**
			 * Runtime environment
			 */
			runtime:
				props?.options?.lambdaOptions?.runtime
				|| Runtime.NODEJS_24_X,

			/**
			 * Execution timeout
			 * - 30 seconds in production
			 * - 15 seconds otherwise
			 */
			timeout:
				props?.options?.lambdaOptions?.timeout
				|| Duration.seconds(
					props.stage === AppEnvironmentEnum.PRODUCTION ? 30 : 15
				),

			/**
			 * Memory allocation (in MB)
			 */
			memorySize:
				props?.options?.lambdaOptions?.memorySize
				|| 1024,

			/**
			 * CPU architecture
			 */
			architecture:
				props?.options?.lambdaOptions?.architecture
				|| Architecture.ARM_64,

			/**
			 * Lambda deployment package source
			 */
			code:
				props?.options?.lambdaOptions?.code
				|| Code.fromAsset('dist'),

			/**
			 * Final merged environment variables
			 */
			environment
		});

		/**
		 * CloudFormation output exposing the Lambda function ARN
		 */
		new CfnOutput(this, 'LambdaFunctionArn', {
			value: this.function.functionArn
		});
	}
}