import { App, Stack } from 'aws-cdk-lib';

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
		super(scope, id, props);
		let layers: ILayerVersion[] = [];

		if (props?.stackOptions?.layerOptions) {
			if (
				!props.stackOptions?.layerOptions?.name ||
				!props.stackOptions?.layerOptions?.version
			) {
				throw new CustomException('Invalid layer options provided');
			}
			const { existingLayer } = new BaseLambdaLayerConstruct(this, 'layer', {
				options: {
					fromExistingLayerArn: `arn:aws:lambda:${props.env?.region}:${props.env?.account}:layer:${props.stackOptions?.layerOptions?.name}:${props.stackOptions?.layerOptions?.version}`,
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
				options: {
					lambdaOptions: { layers },
				},
			},
		);

		new BaseSnsConstruct(this, 'sns', {
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
