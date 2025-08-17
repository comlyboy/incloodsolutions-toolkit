import { Construct } from 'constructs';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Architecture, Code, Function, FunctionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { IBaseCdkConstructProps, detectDuplicateProperties, AppEnvironmentEnum } from '@incloodsolutions/toolkit';

interface ILambdaConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly lambdaOptions: Partial<FunctionProps>;
}>, 'appName'> { }

export class BaseLambdaConstruct extends Construct {
	readonly function: Function;

	constructor(scope: Construct, id: string, props: ILambdaConstructProps) {
		super(scope, id);

		const environment = {
			...props.options?.lambdaOptions?.environment,
			NODE_ENV: props.stage,
			NODE_OPTIONS: '--enable-source-maps',
			AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
		};

		detectDuplicateProperties({ data: environment });

		this.function = new Function(this, id, {
			...props?.options?.lambdaOptions,
			functionName: `${props?.options?.lambdaOptions?.functionName || props?.stackName}-handler`,
			description: props?.options?.lambdaOptions?.description || 'A lambda function',
			handler: props?.options?.lambdaOptions?.handler || 'lambda.handler',
			runtime: props?.options?.lambdaOptions?.runtime || Runtime.NODEJS_22_X,
			timeout: props?.options?.lambdaOptions?.timeout || Duration.seconds(props.stage === AppEnvironmentEnum.PRODUCTION ? 30 : 15),
			memorySize: props?.options?.lambdaOptions?.memorySize || 1024,
			architecture: props?.options?.lambdaOptions?.architecture || Architecture.ARM_64,
			code: props?.options?.lambdaOptions?.code || Code.fromAsset('dist'),
			environment
		});

		new CfnOutput(this, 'LambdaFunctionArn', {
			value: this.function.functionArn
		});

	}
}