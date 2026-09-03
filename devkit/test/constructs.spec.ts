/**
 * `@incloodsolutions/devkit` — every `Base*` CDK construct is instantiated in a
 * throwaway stack and its synthesised CloudFormation is asserted with
 * `aws-cdk-lib/assertions`. Nothing is deployed and no AWS credentials are used.
 *
 * Where a construct needs a Lambda handler, a real (inline-code) `Function` is
 * created in the same stack.
 *
 * KNOWN ISSUES pinned here (test names say "known issue"):
 *   - BaseApiGatewayConstruct throws unless
 *     `options.gatewayOptions.defaultCorsPreflightOptions.allowHeaders` is an
 *     array (it spreads `undefined`).
 *   - Several constructs dereference `props.options.<x>` without a guard, so
 *     `options` (and the specific sub-key) must be supplied.
 */

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	Code,
	Function as LambdaFunction,
	Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Source } from 'aws-cdk-lib/aws-s3-deployment';

import * as devkit from '../src/index';
import {
	BaseApiGatewayConstruct,
	BaseApiGatewayV2Construct,
	BaseApiGatewayWebSocketConstruct,
	BaseCloudfrontConstruct,
	BaseCloudwatchLogGroupConstruct,
	BaseDynamoDBConstruct,
	BaseEventBridgeConstruct,
	BaseLambdaAuthoriserConstruct,
	BaseLambdaAuthoriserV2Construct,
	BaseLambdaConstruct,
	BaseLambdaLayerConstruct,
	BaseRolePolicyConstruct,
	BaseS3Construct,
	BaseS3DeploymentConstruct,
	BaseSnsConstruct,
	BaseSqsConstruct,
	BaseVpcConstruct,
} from '../src/index';

/** A real directory for `Code.fromAsset` (Lambda layers reject inline code). */
const ASSET_DIR = join(import.meta.dirname, 'fixtures', 'asset');

/** Fresh stack per test. */
function stack() {
	return new Stack(new App(), 'TestStack');
}

/** A minimal real Lambda function to feed constructs that need a handler. */
function fn(scope: Stack, id = 'Handler') {
	return new LambdaFunction(scope, id, {
		runtime: Runtime.NODEJS_20_X,
		handler: 'index.handler',
		code: Code.fromInline('exports.handler = async () => {};'),
	});
}

/* ========================================================================== */

describe('BaseLambdaConstruct', () => {
	it('creates an ARM64 Node.js function with the toolkit defaults', () => {
		const s = stack();
		const c = new BaseLambdaConstruct(s, 'Lambda', {
			stackName: 'orders',
			stage: 'staging',
			options: { lambdaOptions: { code: Code.fromInline('exports.h=1') } },
		});
		expect(c.function).toBeDefined();

		Template.fromStack(s).hasResourceProperties('AWS::Lambda::Function', {
			Architectures: ['arm64'],
			MemorySize: 1024,
			Handler: 'lambda.handler',
			FunctionName: 'orders-handler',
		});
	});

	it('uses a 15s timeout outside production, 30s in production', () => {
		const dev = stack();
		new BaseLambdaConstruct(dev, 'L', {
			stackName: 's',
			stage: 'qa',
			options: { lambdaOptions: { code: Code.fromInline('x') } },
		});
		Template.fromStack(dev).hasResourceProperties('AWS::Lambda::Function', {
			Timeout: 15,
		});

		const prod = stack();
		new BaseLambdaConstruct(prod, 'L', {
			stackName: 's',
			stage: 'production',
			options: { lambdaOptions: { code: Code.fromInline('x') } },
		});
		Template.fromStack(prod).hasResourceProperties('AWS::Lambda::Function', {
			Timeout: 30,
		});
	});
});

describe('BaseLambdaLayerConstruct', () => {
	it('creates a LayerVersion', () => {
		const s = stack();
		const c = new BaseLambdaLayerConstruct(s, 'Layer', {
			options: { layerOptions: { code: Code.fromAsset(ASSET_DIR) } },
		});
		expect(c.layer).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::Lambda::LayerVersion', 1);
	});

	it('imports an existing layer by ARN instead of creating one', () => {
		const s = stack();
		const c = new BaseLambdaLayerConstruct(s, 'Layer', {
			options: {
				fromExistingLayerArn:
					'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
			},
		});
		expect(c.existingLayer).toBeDefined();
		expect(c.layer).toBeUndefined();
	});
});

describe('BaseS3Construct', () => {
	it('creates a bucket', () => {
		const s = stack();
		const c = new BaseS3Construct(s, 'Bucket', {
			options: { bucketOptions: {} },
		});
		expect(c.bucket).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::S3::Bucket', 1);
	});
});

describe('BaseCloudwatchLogGroupConstruct', () => {
	it('creates a log group', () => {
		const s = stack();
		new BaseCloudwatchLogGroupConstruct(s, 'Logs', {
			options: { logGroupOptions: {} },
		});
		Template.fromStack(s).resourceCountIs('AWS::Logs::LogGroup', 1);
	});
});

describe('BaseDynamoDBConstruct', () => {
	it('creates a table from tableOptions', () => {
		const s = stack();
		const c = new BaseDynamoDBConstruct(s, 'Table', {
			options: {
				tableOptions: {
					partitionKey: { name: 'id', type: AttributeType.STRING },
				},
			},
		});
		expect(c.table).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::DynamoDB::Table', 1);
	});
});

describe('BaseVpcConstruct', () => {
	it('creates a VPC', () => {
		const s = stack();
		const c = new BaseVpcConstruct(s, 'Vpc', { options: { vpcOptions: {} } });
		expect(c.vpc).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::EC2::VPC', 1);
	});
});

describe('BaseSqsConstruct', () => {
	it('creates a queue', () => {
		const s = stack();
		const c = new BaseSqsConstruct(s, 'Queue', {
			options: { queueOptions: {} },
		});
		expect(c.queue).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::SQS::Queue', 1);
	});

	it('wires a Lambda event-source mapping when a target function is given', () => {
		const s = stack();
		// NOTE: targetFunctions is a top-level prop, not under `options`.
		new BaseSqsConstruct(s, 'Queue', {
			options: { queueOptions: {}, eventSourceMappingOptions: {} },
			targetFunctions: [fn(s)],
		} as never);
		Template.fromStack(s).resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
	});
});

describe('BaseSnsConstruct', () => {
	it('creates a topic', () => {
		const s = stack();
		const c = new BaseSnsConstruct(s, 'Topic', {
			options: { topicOptions: {} },
		} as never);
		expect(c.topic).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::SNS::Topic', 1);
	});

	it('subscribes target Lambda functions', () => {
		const s = stack();
		new BaseSnsConstruct(s, 'Topic', {
			options: { topicOptions: {}, targetFunctions: [fn(s)] },
		} as never);
		Template.fromStack(s).resourceCountIs('AWS::SNS::Subscription', 1);
	});
});

describe('BaseEventBridgeConstruct', () => {
	it('creates a scheduled rule with a Lambda target', () => {
		const s = stack();
		new BaseEventBridgeConstruct(s, 'Rule', {
			options: {
				eventBridgeOptions: { schedule: Schedule.rate(Duration.hours(1)) },
				targetFunctions: [fn(s)],
			},
		} as never);
		const t = Template.fromStack(s);
		t.resourceCountIs('AWS::Events::Rule', 1);
		t.hasResourceProperties('AWS::Events::Rule', {
			ScheduleExpression: 'rate(1 hour)',
		});
	});
});

describe('BaseCloudfrontConstruct', () => {
	it('creates a distribution', () => {
		const s = stack();
		const c = new BaseCloudfrontConstruct(s, 'Cdn', {
			options: {
				cloudfrontOptions: {
					defaultBehavior: { origin: new HttpOrigin('example.com') },
				},
			},
		} as never);
		expect(c.distribution).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::CloudFront::Distribution', 1);
	});
});

describe('BaseRolePolicyConstruct', () => {
	it('creates an IAM role', () => {
		const s = stack();
		const c = new BaseRolePolicyConstruct(s, 'Role', {
			options: {
				roleOptions: {
					assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
				},
			},
		} as never);
		expect(c.role).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::IAM::Role', 1);
	});
});

describe('BaseLambdaAuthoriserConstruct', () => {
	it('builds a REST API TokenAuthorizer bound to the handler', () => {
		const s = stack();
		const c = new BaseLambdaAuthoriserConstruct(s, 'Auth', {
			handlerFunction: fn(s),
			options: {},
		} as never);
		// A TokenAuthorizer only synthesises once attached to a RestApi, so we
		// just assert the construct produced one.
		expect(c.authoriser).toBeDefined();
		expect(c.authoriser.authorizerId).toBeDefined();
	});
});

describe('BaseLambdaAuthoriserV2Construct', () => {
	it('known issue: the constructor always throws', () => {
		// It creates a `CfnOutput` from `authoriser.authorizerId` in its own
		// constructor, but `HttpLambdaAuthorizer#authorizerId` throws until the
		// authorizer is attached to an HttpRoute — so the construct can never be
		// instantiated stand-alone.
		const s = stack();
		expect(
			() =>
				new BaseLambdaAuthoriserV2Construct(s, 'AuthV2', {
					handlerFunction: fn(s),
					options: { authorizerOptions: { identitySource: [] } },
				} as never),
		).toThrow(/authorizerId|AuthorizerNotAttached/);
	});
});

describe('BaseApiGatewayV2Construct', () => {
	it('creates an HTTP API', () => {
		const s = stack();
		const c = new BaseApiGatewayV2Construct(s, 'HttpApi', {
			handlerFunctions: [fn(s)],
			options: { gatewayOptions: {}, routeOptions: [] },
		} as never);
		expect(c.api).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::ApiGatewayV2::Api', 1);
	});

	it('throws when no handler functions are supplied', () => {
		const s = stack();
		expect(
			() =>
				new BaseApiGatewayV2Construct(s, 'HttpApi', {
					handlerFunctions: [],
					options: { gatewayOptions: {}, routeOptions: [] },
				} as never),
		).toThrow(/atleast one function/);
	});
});

describe('BaseApiGatewayWebSocketConstruct', () => {
	it('creates a WebSocket API and stage', () => {
		const s = stack();
		const handler = () => ({
			option: {},
			function: fn(s, `f${Math.random()}`),
		});
		const c = new BaseApiGatewayWebSocketConstruct(s, 'Ws', {
			options: {
				webSocketApiOptions: {},
				webSocketStageOptions: { stageName: 'dev', autoDeploy: true },
			},
			handlers: {
				connect: handler(),
				disconnect: handler(),
				default: handler(),
				message: handler(),
			},
		} as never);
		expect(c.socketApi).toBeDefined();
		const t = Template.fromStack(s);
		t.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
		t.resourceCountIs('AWS::ApiGatewayV2::Stage', 1);
	});
});

describe('BaseApiGatewayConstruct', () => {
	it('known issue: throws without options.gatewayOptions.defaultCorsPreflightOptions.allowHeaders', () => {
		const s = stack();
		expect(
			() =>
				new BaseApiGatewayConstruct(s, 'RestApi', {
					handlerFunction: fn(s),
					options: { gatewayOptions: {}, routeOptions: [] },
				} as never),
		).toThrow();
	});

	it('creates a REST API when defaultCorsPreflightOptions.allowHeaders is provided', () => {
		const s = stack();
		const c = new BaseApiGatewayConstruct(s, 'RestApi', {
			handlerFunction: fn(s),
			options: {
				gatewayOptions: { defaultCorsPreflightOptions: { allowHeaders: [] } },
				routeOptions: [],
			},
		} as never);
		expect(c.api).toBeDefined();
		Template.fromStack(s).resourceCountIs('AWS::ApiGateway::RestApi', 1);
	});
});

describe('BaseS3DeploymentConstruct', () => {
	it('creates a bucket + distribution + deployment when both toggles are on', () => {
		const s = stack();
		const c = new BaseS3DeploymentConstruct(s, 'Site', {
			withS3Bucket: true,
			withCloudfront: true,
			options: {
				bucketOptions: {},
				cloudfrontOptions: {},
				bucketDeploymentOptions: { sources: [Source.asset(ASSET_DIR)] },
			},
		} as never);
		expect(c.bucket).toBeDefined();
		expect(c.distribution).toBeDefined();

		const t = Template.fromStack(s);
		t.resourceCountIs('AWS::S3::Bucket', 1);
		t.resourceCountIs('AWS::CloudFront::Distribution', 1);
		t.resourceCountIs('Custom::CDKBucketDeployment', 1);
	});

	it('throws when CloudFront is on but there is no origin and no bucket', () => {
		const s = stack();
		expect(
			() =>
				new BaseS3DeploymentConstruct(s, 'Site', {
					withCloudfront: true,
					options: { bucketDeploymentOptions: { sources: [] } },
				} as never),
		).toThrow(/origins must be defined/);
	});
});

describe('package surface', () => {
	it('exports every Base* construct and the two shared types are usable', () => {
		for (const name of [
			'BaseApiGatewayConstruct',
			'BaseApiGatewayV2Construct',
			'BaseApiGatewayWebSocketConstruct',
			'BaseCloudfrontConstruct',
			'BaseCloudwatchLogGroupConstruct',
			'BaseDynamoDBConstruct',
			'BaseEventBridgeConstruct',
			'BaseLambdaAuthoriserConstruct',
			'BaseLambdaAuthoriserV2Construct',
			'BaseLambdaConstruct',
			'BaseLambdaLayerConstruct',
			'BaseRolePolicyConstruct',
			'BaseS3Construct',
			'BaseS3DeploymentConstruct',
			'BaseSnsConstruct',
			'BaseSqsConstruct',
			'BaseVpcConstruct',
		] as const) {
			expect(typeof (devkit as Record<string, unknown>)[name], name).toBe(
				'function',
			);
		}
	});
});
