import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';

import { IBaseStackProps } from '../../types';
import {
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
	BaseSnsConstruct,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit/error';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { TopicProps } from 'aws-cdk-lib/aws-sns';

/**
 * A Lambda function subscribed to an SNS topic, in one stack.
 *
 * Creates a {@link BaseLambdaConstruct} and a {@link BaseSnsConstruct} topic (named after
 * `stackName` unless `topicOptions.topicName` is given) that invokes it. An existing layer can
 * be attached with `layerOptions` (`name` and `version`). The region defaults to `us-east-1` and
 * the account to `CDK_DEFAULT_ACCOUNT`.
 */
export class BaseLambdaSnsStack extends Stack {
	/**
	 * @param scope The CDK app.
	 * @param id Unique stack identifier.
	 * @param props Stack configuration: `stackName`, `env`, `tags`, `synthesizer` and
	 *   `stackOptions` (`stage`, `enableDebug`, `layerOptions`, `lambdaOptions`, `topicOptions`).
	 * @throws {CustomException} When `layerOptions` is set without both `name` and `version`.
	 */
	constructor(
		scope: App,
		id: string,
		props: IBaseStackProps<{
			layerOptions?: {
				name: string;
				version: number;
			};
			lambdaOptions?: {};
			topicOptions?: TopicProps;
		}>,
	) {
		const layers: ILayerVersion[] = [];
		const region = props?.env?.region || 'us-east-1';
		const account = props?.env?.account || process.env?.CDK_DEFAULT_ACCOUNT;

		super(scope, id, {
			...props,
			env: { ...props?.env, region, account },
			tags: {
				...props.tags,
				stackName: props.tags?.stackName,
			},
			synthesizer:
				props?.synthesizer ||
				new DefaultStackSynthesizer({
					bucketPrefix: `functions/${props.stackOptions?.stage}/`,
				}),
		});

		if (props?.stackOptions?.layerOptions) {
			if (
				!props.stackOptions?.layerOptions?.name ||
				!props.stackOptions?.layerOptions?.version
			) {
				throw new CustomException('Invalid layer options provided');
			}
			const { existingLayer } = new BaseLambdaLayerConstruct(this, 'layer', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					fromExistingLayerArn: `arn:aws:lambda:${region}:${account}:layer:${props.stackOptions?.layerOptions?.name}:${props.stackOptions?.layerOptions?.version}`,
				},
			});
			layers.push(existingLayer);
		}

		const { function: lambdaFunction } = new BaseLambdaConstruct(
			this,
			'lambda',
			{
				stage: props.stackOptions?.stage,
				stackName: props.stackName,
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					lambdaOptions: { layers },
				},
			},
		);

		new BaseSnsConstruct(this, 'sns', {
			enableDebug: props?.stackOptions?.enableDebug,
			options: {
				targetFunctions: [lambdaFunction],
				topicOptions: {
					...props?.stackOptions?.topicOptions,
					topicName:
						props?.stackOptions?.topicOptions?.topicName || props.stackName,
				},
			},
		});
	}
}
