import { App, DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { AddRoutesOptions, HttpApiProps, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { RuleProps } from 'aws-cdk-lib/aws-events';
import { TopicProps } from 'aws-cdk-lib/aws-sns';
import { QueueProps } from 'aws-cdk-lib/aws-sqs';

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
	IBucketCdkConstructProps,
	IDynamoDbCdkConstructProps,
} from '../constructs';
import { CustomException } from '@incloodsolutions/toolkit/error';


/**
 * A Lambda function plus the triggers and permissions it needs, in one stack.
 *
 * Always creates a {@link BaseLambdaConstruct}. Each key present in
 * `stackOptions.triggersOptions` adds one more resource wired to that function:
 * - `apiGateway`: an HTTP API ({@link BaseApiGatewayV2Construct}) with the given routes plus a
 *   catch-all `/{proxy+}` route for any method. CORS allows all origins unless set.
 * - `eventBridge`, `sns`, `sqs`: a rule, topic or queue that invokes the function. Each is named
 *   after `stackName` unless a name is given.
 * - `s3`: a bucket the function can read and write, and that is allowed to invoke it.
 * - `dynamodb`: a table.
 *
 * Layers published by another stack are attached with `stackOptions.lambdaOptions.extraLayers`
 * (`name` and `version`, resolved to an ARN in this stack's account and region).
 * `stackOptions.policies` adds IAM statements to the function's role.
 *
 * The region defaults to `us-east-1` and the account to `CDK_DEFAULT_ACCOUNT`. Assets go to a
 * `functions/<stage>/` prefix unless a `synthesizer` is passed.
 */
export class BaseLambdaApiStack extends Stack {
	/**
	 * @param scope The CDK app.
	 * @param id Unique stack identifier.
	 * @param props Stack configuration: `stackName`, `env`, `tags`, `synthesizer` and
	 *   `stackOptions` (`stage`, `enableDebug`, `lambdaOptions`, `triggersOptions`, `policies`).
	 * @throws {CustomException} When an entry in `extraLayers` is missing its `name` or `version`.
	 */
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
				s3?: IBucketCdkConstructProps;
				dynamodb?: IDynamoDbCdkConstructProps;
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


		const extraLayers = (props?.stackOptions?.lambdaOptions?.extraLayers || []).map((layer, layerIndex) => {
			if (!layer?.name || !layer?.version) {
				throw new CustomException(
					"Invalid layer options provided! Both layer 'name' and 'version' are required.",
				);
			}
			const { existingLayer } = new BaseLambdaLayerConstruct(this, `layer${layerIndex}`, {
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
						layers: [...(props?.stackOptions?.lambdaOptions?.layers || []), ...extraLayers]
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
					}
				}
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
			const { bucket, existingBucket } = new BaseS3Construct(this, 's3', {
				enableDebug: props?.stackOptions?.enableDebug,
				options: {
					...(props?.stackOptions?.triggersOptions?.s3 || {}),
				},
			});

			if (bucket) {
				bucket.grantReadWrite(lambdaFunction);
			} else {
				existingBucket.grantReadWrite(lambdaFunction);
			}

			lambdaFunction.addPermission('allowS3Invoke', {
				principal: new ServicePrincipal('s3.amazonaws.com'),
				sourceArn: bucket.bucketArn,
				// sourceAccount: Stack.of(this).account,
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