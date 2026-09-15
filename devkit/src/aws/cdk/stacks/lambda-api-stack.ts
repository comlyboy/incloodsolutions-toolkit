import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';

import { IBaseStackProps } from '../../types';
import {
	BaseApiGatewayV2Construct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit';

export class BaseLambdaApiStack extends Stack {
	constructor(
		scope: App,
		id: string,
		props: IBaseStackProps<{
			layerOptions?: {
				name: string;
				version: number;
			};
			lambdaOptions?: {};
			apiGatewayOptions?: {};
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
				throw new CustomException(
					"Invalid layer options provided! Both layer 'name' and 'version' are required.",
				);
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

		new BaseApiGatewayV2Construct(this, 'apiGateway', {
			handlerFunctions: [lambdaFunction],
			enableDebug: props?.stackOptions?.enableDebug,
			options: {
				gatewayOptions: {
					apiName: props.stackName,
					corsPreflight: {
						allowOrigins: ['*'],
					},
				},
				routeOptions: [
					{
						path: '/{proxy+}',
						methods: [HttpMethod.ANY],
					},
				],
			},
		});
	}
}
