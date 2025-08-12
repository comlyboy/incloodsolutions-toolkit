import { Construct } from 'constructs';
import { Architecture, Code, ILayerVersion, LayerVersion, LayerVersionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { IBaseCdkConstructProps } from '../../../interface';
import { CfnOutput } from 'aws-cdk-lib';

interface ILambdaLayerConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly layerOptions?: Partial<Omit<LayerVersionProps, 'layerVersionName' | 'compatibleArchitectures'>> & Required<Pick<LayerVersionProps, 'layerVersionName'>>;
	readonly fromExistingLayerArn?: string;
	readonly fromExistingLayerAttribute?: {
		readonly layerVersionArn: string;
		readonly compatibleRuntimes?: Runtime[];
	};
}>, 'appName' | 'stage' | 'stackName'> { }

export class BaseLambdaLayerConstruct extends Construct {
	readonly layer: LayerVersion;
	readonly existingLayer: ILayerVersion;

	constructor(scope: Construct, id: string, props?: ILambdaLayerConstructProps) {
		super(scope, id);

		if (props?.options?.fromExistingLayerArn) {
			this.existingLayer = LayerVersion.fromLayerVersionArn(this, `${id}-Arn`, props?.options?.fromExistingLayerArn);
		} else if (props?.options?.fromExistingLayerAttribute) {
			this.existingLayer = LayerVersion.fromLayerVersionAttributes(this, `${id}-Attribute`, props?.options?.fromExistingLayerAttribute);
		} else {
			this.layer = new LayerVersion(this, id, {
				...props.options?.layerOptions,
				code: props?.options?.layerOptions?.code || Code.fromAsset('./dist-layer'),
				description: props?.options?.layerOptions?.description || 'Lambda Layer written in NodeJS, NestJS, NodeJS-express, serverless-express',
				compatibleArchitectures: [Architecture.ARM_64, Architecture.X86_64],
				compatibleRuntimes: [Runtime.NODEJS_20_X, Runtime.NODEJS_22_X]
			} as LayerVersionProps);
		}

		new CfnOutput(this, 'LambdaLayerArn', {
			value: (props.options?.fromExistingLayerArn || props.options?.fromExistingLayerAttribute) ? this.existingLayer.layerVersionArn : this.layer.layerVersionArn
		});

	}
}
