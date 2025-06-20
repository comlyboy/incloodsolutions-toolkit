import { Construct } from 'constructs';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Architecture, Code, Function, FunctionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { AppEnvironmentEnum, IBaseCdkConstructProps } from '../../../interface';
import { detectDuplicateProperties } from '../../../utility';

interface ILambdaConstructProps extends Omit<IBaseCdkConstructProps<Partial<FunctionProps>>, 'appName'> { }

export class BaseLambdaConstruct extends Construct {
	readonly function: Function;

	constructor(scope: Construct, id: string, props: ILambdaConstructProps) {
		super(scope, id);

		const environment = {
			...props.options?.environment,
			NODE_ENV: props.stage,
			NODE_OPTIONS: '--enable-source-maps',
			AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
		};

		detectDuplicateProperties({ data: environment });

		this.function = new Function(this, id, {
			...props?.options,
			functionName: props?.options?.functionName || props?.stackName,
			description: props?.options?.description || 'A lambda function',
			handler: props?.options?.handler || 'lambda.handler',
			runtime: props?.options?.runtime || Runtime.NODEJS_22_X,
			timeout: props?.options?.timeout || Duration.seconds(props.stage === AppEnvironmentEnum.PRODUCTION ? 30 : 15),
			memorySize: props?.options?.memorySize | 1024,
			architecture: props?.options?.architecture || Architecture.ARM_64,
			code: props?.options?.code || Code.fromAsset('dist'),
			environment
		});

		new CfnOutput(this, 'LambdaFunctionArn', {
			value: this.function.functionArn
		});
	}
}