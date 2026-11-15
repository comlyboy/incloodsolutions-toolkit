import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { LayerVersionProps } from 'aws-cdk-lib/aws-lambda';

import { IBaseStackProps } from '../../types';
import { BaseLambdaLayerConstruct } from '../constructs';

/**
 * A stack that publishes one Lambda layer on its own, so other stacks can import it by ARN
 * (see `extraLayers` on {@link BaseLambdaApiStack}).
 *
 * Wraps {@link BaseLambdaLayerConstruct}. The region defaults to `us-east-1` and the account to
 * `CDK_DEFAULT_ACCOUNT`. Assets go to a dedicated `layers/` prefix unless a `synthesizer` is passed.
 */
export class BaseLambdaLayerStack extends Stack {
	/**
	 * @param scope The CDK app.
	 * @param id Unique stack identifier.
	 * @param props Stack configuration. `stackOptions.layerOptions` takes the layer's
	 *   `LayerVersionProps`; `layerVersionName` is required.
	 */
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
				...(props.tags || {}),
				stackName: props?.stackName,
			},
			synthesizer:
				props?.synthesizer ||
				new DefaultStackSynthesizer({
					bucketPrefix: 'layers/',
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
