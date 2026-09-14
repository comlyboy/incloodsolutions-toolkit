import { App, CfnOutput, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { LayerVersionProps } from 'aws-cdk-lib/aws-lambda';

import { IBaseStackProps } from '../../types';
import { BaseLambdaLayerConstruct } from '../constructs';

export class BaseLambdaLayerStack extends Stack {
	constructor(
		scope: App,
		id: string,
		props: IBaseStackProps<{
			readonly layerOptions: Partial<
				Omit<LayerVersionProps, 'layerVersionName' | 'compatibleArchitectures'>
			> &
				Required<Pick<LayerVersionProps, 'layerVersionName'>>;
		}>,
	) {
		super(scope, id, {
			...props,
			synthesizer:
				props?.synthesizer ||
				new DefaultStackSynthesizer({
					bucketPrefix: 'layer/',
				}),
		});

		const { layer } = new BaseLambdaLayerConstruct(this, 'lambdaLayer', {
			options: {
				layerOptions: props?.stackOptions?.layerOptions,
			},
		});

		new CfnOutput(this, 'LambdaLayerOutput', {
			value: layer.layerVersionArn,
		});
	}
}
