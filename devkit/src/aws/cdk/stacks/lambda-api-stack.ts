import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { FunctionProps } from 'aws-cdk-lib/aws-lambda';
import {
	AddRoutesOptions,
	HttpApiProps,
	HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { IBaseStackProps } from '../../types';
import {
	BaseApiGatewayV2Construct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit/error';

export class BaseLambdaApiStack extends Stack {
	constructor(
		scope: App,
		id: string,
		props: IBaseStackProps<{
			lambdaOptions?: Partial<FunctionProps> & {
				readonly extraLayers?: {
					name: string;
					version: number;
				}[]
			};
			apiGatewayOptions?: {
				options?: HttpApiProps;
				routeOptions?: Partial<AddRoutesOptions>[];
			};
			domainOptions?: {};
			policies?: { principal: 'lambda'; policy: PolicyStatement }[];
		}>,
	) {
		const region = props?.env?.region || 'us-east-1';
		const account = props?.env?.account || process.env?.CDK_DEFAULT_ACCOUNT;

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
					bucketPrefix: `functions/${props.stackOptions?.stage}/`,
				}),
		});

		const extraLayers = props?.stackOptions?.lambdaOptions?.extraLayers.map(layer => {
			if (!layer?.name || !layer?.version) {
				throw new CustomException(
					"Invalid layer options provided! Both layer 'name' and 'version' are required.",
				);
			}
			const { existingLayer } = new BaseLambdaLayerConstruct(this, 'layer', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					fromExistingLayerArn: `arn:aws:lambda:${region}:${account}:layer:${layer?.name}:${layer?.version}`,
				},
			});
			return existingLayer;
		});

		const { function: lambdaFunction } = new BaseLambdaConstruct(
			this,
			'lambda',
			{
				stage: props.stackOptions?.stage,
				stackName: props?.stackName,
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					lambdaOptions: {
						...props?.stackOptions?.lambdaOptions,
						layers: [...props?.stackOptions?.lambdaOptions?.layers, ...extraLayers]
					},
				},
			},
		);

		new BaseApiGatewayV2Construct(this, 'apiGateway', {
			handlerFunctions: [lambdaFunction],
			enableDebug: props?.stackOptions?.enableDebug,
			options: {
				gatewayOptions: {
					...(props?.stackOptions?.apiGatewayOptions?.options || {}),
					apiName:
						props?.stackOptions?.apiGatewayOptions?.options?.apiName ||
						props.stackName,
					corsPreflight: {
						...(props?.stackOptions?.apiGatewayOptions?.options
							?.corsPreflight || {}),
						allowOrigins: props?.stackOptions?.apiGatewayOptions?.options
							?.corsPreflight?.allowOrigins || ['*'],
					},
				},
				routeOptions: [
					...(props?.stackOptions?.apiGatewayOptions?.routeOptions || []),
					{
						path: '/{proxy+}',
						methods: [HttpMethod.ANY],
					},
				],
			},
		});

		props.stackOptions.policies?.forEach((policy) => {
			if (policy.principal === 'lambda') {
				lambdaFunction.addToRolePolicy(policy.policy);
			}
		});
	}
}
