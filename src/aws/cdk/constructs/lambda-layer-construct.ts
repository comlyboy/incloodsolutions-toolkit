import { Construct } from 'constructs';
import { Architecture, LayerVersion, LayerVersionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { IBaseCdkConstructProps } from 'src/interface';

interface ILambdaLayerConstructProps extends IBaseCdkConstructProps<Partial<LayerVersionProps>> { }

export class LambdaLayerConstruct extends Construct {
	readonly layer: LayerVersion;
	constructor(scope: Construct, id: string, props?: ILambdaLayerConstructProps) {
		super(scope, id);

		this.layer = new LayerVersion(this, id, {
			...props.options,
			compatibleArchitectures: [Architecture.ARM_64, Architecture.X86_64],
			compatibleRuntimes: [Runtime.NODEJS_20_X, Runtime.NODEJS_22_X],
			description: props.options?.description || 'Lambda Layer written in NodeJS, nestJS, NodeJS-express, serverless-express',
		} as LayerVersionProps);
	}
}
