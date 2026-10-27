import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { FunctionProps, ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { AddRoutesOptions, HttpApiProps, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { IBaseStackProps } from '../../types';
import {
	BaseApiGatewayV2Construct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit/error';

export class BaseLambdaApiStack extends Stack {
	constructor(
		scope: App,
		id: string,
		props: IBaseStackProps<{
			layerOptions?: {
				name: string;
				version: number;
			};
			lambdaOptions?: Partial<FunctionProps>;
			apiGatewayOptions?: {
				options?: HttpApiProps;
				routeOptions?: Partial<AddRoutesOptions>[]
			};
			domainOptions: {};
			policies?: { principal: 'lambda'; policy: PolicyStatement; }[]
		}>,
	) {
		const layers: ILayerVersion[] = [];
		const region = props?.env?.region || 'us-east-1';
		const account = props?.env?.account || process.env?.CDK_DEFAULT_ACCOUNT;

		super(scope, id, {
			...props,
			env: {
				...props?.env,
				region: props?.env?.region || 'us-east-1',
				account: props?.env?.account || process.env?.CDK_DEFAULT_ACCOUNT
			},
			tags: {
				...props.tags || {},
				stackName: props?.stackName
			},
			synthesizer:
				props?.synthesizer ||
				new DefaultStackSynthesizer({
					bucketPrefix: `functions/${props.stackOptions?.stage}/`,
				}),
		});

		if (Object.keys(props?.stackOptions?.layerOptions || {}).length) {
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
					lambdaOptions: { ...props.stackOptions.lambdaOptions, layers: [...props.stackOptions.lambdaOptions.layers || [], ...layers] },
				},
			},
		);

		new BaseApiGatewayV2Construct(this, 'apiGateway', {
			handlerFunctions: [lambdaFunction],
			enableDebug: props?.stackOptions?.enableDebug,
			options: {
				gatewayOptions: {
					...props?.stackOptions?.apiGatewayOptions?.options || {},
					apiName: props?.stackOptions?.apiGatewayOptions?.options?.apiName || props.stackName,
					corsPreflight: {
						...props?.stackOptions?.apiGatewayOptions?.options?.corsPreflight || {},
						allowOrigins: props?.stackOptions?.apiGatewayOptions?.options?.corsPreflight.allowOrigins || ['*'],
					},
				},
				routeOptions: [
					...props?.stackOptions?.apiGatewayOptions?.routeOptions || [],
					{
						path: '/{proxy+}',
						methods: [HttpMethod.ANY],
					},
				],
			},
		});

		props.stackOptions.policies.forEach(policy => {
			if (policy.principal === 'lambda') {
				lambdaFunction.addToRolePolicy(policy.policy);
			}

		});

	}
}
