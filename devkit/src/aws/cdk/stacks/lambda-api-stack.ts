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
	BaseEventBridgeConstruct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
	BaseSnsConstruct,
	BaseSqsConstruct,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit/error';
import { RuleProps } from 'aws-cdk-lib/aws-events';
import { TopicProps } from 'aws-cdk-lib/aws-sns';
import { QueueProps } from 'aws-cdk-lib/aws-sqs';

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
			triggersOptions?: {
				apiGateway?: {
					options?: HttpApiProps;
					routeOptions?: Partial<AddRoutesOptions>[];
				},
				sns?: TopicProps,
				sqs?: QueueProps,
				s3?: {},
				dynamodb?: {},
				eventBridge?: RuleProps,
			}
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

		if (props?.stackOptions?.triggersOptions?.apiGateway && Object.keys(props?.stackOptions?.triggersOptions?.apiGateway).length) {
			new BaseApiGatewayV2Construct(this, 'apiGateway', {
				handlerFunctions: [lambdaFunction],
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					gatewayOptions: {
						...(props?.stackOptions?.triggersOptions?.apiGateway?.options || {}),
						apiName:
							props?.stackOptions?.triggersOptions?.apiGateway?.options?.apiName ||
							props.stackName,
						corsPreflight: {
							...(props?.stackOptions?.triggersOptions?.apiGateway?.options
								?.corsPreflight || {}),
							allowOrigins: props?.stackOptions?.triggersOptions?.apiGateway?.options
								?.corsPreflight?.allowOrigins || ['*'],
						},
					},
					routeOptions: [
						...(props?.stackOptions?.triggersOptions?.apiGateway?.routeOptions || []),
						{
							path: '/{proxy+}',
							methods: [HttpMethod.ANY],
						},
					],
				},
			});

		}

		if (props?.stackOptions?.triggersOptions?.eventBridge && Object.keys(props?.stackOptions?.triggersOptions?.eventBridge).length) {

			const { } = new BaseEventBridgeConstruct(this, 'eventBridge', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					targetFunctions: [lambdaFunction],
					eventBridgeOptions: {
						...(props?.stackOptions?.triggersOptions?.eventBridge || {}),
						ruleName:
							props?.stackOptions?.triggersOptions?.eventBridge?.ruleName ||
							props.stackName,
					},
				},
			});

		}

		if (props?.stackOptions?.triggersOptions?.sns && Object.keys(props?.stackOptions?.triggersOptions?.sns).length) {
			const { } = new BaseSnsConstruct(this, 'sns', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					targetFunctions: [lambdaFunction],
					topicOptions: {
						...(props?.stackOptions?.triggersOptions?.sns || {}),
						topicName:
							props?.stackOptions?.triggersOptions?.sns?.topicName ||
							props.stackName,
					},
				},
			});

		}

		if (props?.stackOptions?.triggersOptions?.sqs && Object.keys(props?.stackOptions?.triggersOptions?.sqs).length) {
			const { } = new BaseSqsConstruct(this, 'sqs', {
				enableDebug: props?.stackOptions?.enableDebug,
				targetFunctions: [lambdaFunction],
				options: {
					eventSourceMappingOptions: {},
					queueOptions: {
						...(props?.stackOptions?.triggersOptions?.sqs || {}),
						queueName: props?.stackOptions?.triggersOptions?.sqs?.queueName || props.stackName,
					},

				},
			});

		}

		if (props?.stackOptions?.triggersOptions?.s3 && Object.keys(props?.stackOptions?.triggersOptions?.s3).length) {


		}

		props.stackOptions.policies?.forEach((policy) => {
			if (policy.principal === 'lambda') {
				lambdaFunction.addToRolePolicy(policy.policy);
			}
		});

	}
}