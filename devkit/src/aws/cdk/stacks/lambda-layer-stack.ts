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
			env: {
				...props?.env,
				region: props?.env?.region || 'us-east-1',
				account: props?.env?.account || process.env?.CDK_DEFAULT_ACCOUNT,
			},
			tags: {
				...props.tags,
				stackName: props.tags?.stackName,
			},
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
