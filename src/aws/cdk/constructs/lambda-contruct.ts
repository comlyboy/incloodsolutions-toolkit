import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

import { Architecture, Code, Function, FunctionProps, Runtime } from 'aws-cdk-lib/aws-lambda';
import { IBaseCdkConstructProps } from 'src/interface';



interface ILambdaConstructProps extends IBaseCdkConstructProps<Partial<FunctionProps>> { }

export class LambdaConstruct extends Construct {
	readonly handler: Function;
	constructor(scope: Construct, id: string, props: ILambdaConstructProps) {
		super(scope, id);

		this.handler = new Function(this, id, {
			...props.options,
			functionName: props.stackName,
			description: props.options?.description || 'A lambda function',
			handler: props.options?.handler || 'lambda.handler',
			runtime: Runtime.NODEJS_22_X,
			timeout: Duration.seconds(props.stage === 'production' ? 30 : 15),
			memorySize: 1024,
			architecture: Architecture.ARM_64,
			code: Code.fromAsset('dist'),
			environment: {
				...props.options?.environment,
				NODE_ENV: props.stage,
				NODE_OPTIONS: '--enable-source-maps',
				AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
			},
		});
	}
}