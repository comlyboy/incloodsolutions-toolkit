import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';

import { IBaseStackProps } from '../../types';
import {
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
	BaseSnsConstruct,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { TopicProps } from 'aws-cdk-lib/aws-sns';

export class BaseLambdaSnsStack extends Stack {
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
