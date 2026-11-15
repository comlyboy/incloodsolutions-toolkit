import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { AddRoutesOptions, HttpApiProps, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RuleProps } from 'aws-cdk-lib/aws-events';
import { TopicProps } from 'aws-cdk-lib/aws-sns';
import { QueueProps } from 'aws-cdk-lib/aws-sqs';
import { BucketAttributes, BucketProps } from 'aws-cdk-lib/aws-s3';
import { GlobalSecondaryIndexProps, LocalSecondaryIndexProps, TableAttributes, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseStackProps } from '../../types';
import {
	BaseApiGatewayV2Construct,
	BaseDynamoDBConstruct,
	BaseEventBridgeConstruct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
	BaseS3Construct,
	BaseSnsConstruct,
	BaseSqsConstruct,
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
			triggersOptions?: {
				apiGateway?: {
					options?: HttpApiProps;
					routeOptions?: Partial<AddRoutesOptions>[];
				},
				sns?: TopicProps,
				sqs?: QueueProps,
				s3?: {
					/** Configuration options for the S3 bucket */
					readonly bucketOptions?: BucketProps;

					/** Import an existing bucket by ARN */
					readonly fromExistingBucketArn?: string;

					/**Import an existing bucket by name */
					readonly fromExistingBucketName?: string;

					/** Import an existing layer using attributes */
					readonly fromExistingBucketAttribute?: BucketAttributes;
				},
				dynamodb?: {
					/** Configuration for creating a new table */
					readonly tableOptions?: TableProps;

					/** Import an existing table by ARN */
					readonly fromExistingTableArn?: string;

					/** Import an existing table by name */
					readonly fromExistingTableName?: string;

					/** Import an existing table using attributes */
					readonly fromExistingTableAttributes?: TableAttributes;

					/** Global Secondary Index definitions */
					readonly globalSecondaryIndexes?: GlobalSecondaryIndexProps[];

					/** Local Secondary Index definitions */
					readonly localSecondaryIndexes?: LocalSecondaryIndexProps[];
				},
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
			new BaseEventBridgeConstruct(this, 'eventBridge', {
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
			new BaseSnsConstruct(this, 'sns', {
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
			new BaseSqsConstruct(this, 'sqs', {
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
			const { } = new BaseS3Construct(this, 's3', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					...(props?.stackOptions?.triggersOptions?.s3 || {}),
				},
			});
		}

		if (props?.stackOptions?.triggersOptions?.dynamodb && Object.keys(props?.stackOptions?.triggersOptions?.dynamodb).length) {
			const { } = new BaseDynamoDBConstruct(this, 'dynamodb', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					...(props?.stackOptions?.triggersOptions?.dynamodb || {}),
				}
			});
		}

		props.stackOptions.policies?.forEach((policy) => {
			if (policy.principal === 'lambda') {
				lambdaFunction.addToRolePolicy(policy.policy);
			}
		});

	}
}