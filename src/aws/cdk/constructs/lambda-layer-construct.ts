import { Construct } from 'constructs';
import { Architecture, Code, LayerVersion, LayerVersionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { IBaseCdkConstructProps } from 'src/interface';

interface ILambdaLayerConstructProps extends IBaseCdkConstructProps<Partial<Omit<LayerVersionProps, 'layerVersionName'>> & Pick<LayerVersionProps, 'layerVersionName'>> { }

export class LambdaLayerConstruct extends Construct {
	readonly layer: LayerVersion;

	constructor(scope: Construct, id: string, props?: ILambdaLayerConstructProps) {
		super(scope, id);

		this.layer = new LayerVersion(this, id, {
			...props.options,
			code: props?.options?.code || Code.fromAsset('./dist-layer'),
			description: props?.options?.description || 'Lambda Layer written in NodeJS, nestJS, NodeJS-express, serverless-express',
			compatibleArchitectures: [Architecture.ARM_64, Architecture.X86_64],
			compatibleRuntimes: [Runtime.NODEJS_20_X, Runtime.NODEJS_22_X],
		} as LayerVersionProps);
	}
}
