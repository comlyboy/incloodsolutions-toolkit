import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
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

		new BaseLambdaLayerConstruct(this, 'layer', {
			enableDebug: props?.stackOptions?.enableDebug,
			options: {
				layerOptions: props?.stackOptions?.layerOptions,
			},
		});

	}
}
