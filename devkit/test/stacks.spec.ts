/**
 * `@incloodsolutions/devkit` stacks: each `Base*Stack` is instantiated in a throwaway CDK app and
 * its synthesised CloudFormation is asserted. Nothing is deployed and no AWS credentials are used.
 */

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { BaseLambdaApiStack, BaseLambdaLayerStack } from '../src/index';

const ASSET_DIR = join(import.meta.dirname, 'fixtures', 'asset');
const ACCOUNT_ENV = { account: '123456789012', region: 'us-east-1' };

/** Lambda code is inline so no `dist/` folder is needed. */
const inlineCode = () => Code.fromInline('exports.handler = async () => {};');

function apiStack(
	stackOptions: Record<string, unknown> = {},
	props: Record<string, unknown> = {},
) {
	const app = new App();
	const stack = new BaseLambdaApiStack(app, 'ApiStack', {
		stackName: 'orders-api',
		env: ACCOUNT_ENV,
		stackOptions: {
			stage: 'staging',
			lambdaOptions: { code: inlineCode() },
			...stackOptions,
		},
		...props,
	} as never);
	return Template.fromStack(stack);
}

describe('BaseLambdaApiStack', () => {
	it('creates just the Lambda function when no triggers, layers or policies are given', () => {
		const template = apiStack();
		template.resourceCountIs('AWS::Lambda::Function', 1);
		template.resourceCountIs('AWS::ApiGatewayV2::Api', 0);
		template.resourceCountIs('AWS::SNS::Topic', 0);
		template.resourceCountIs('AWS::SQS::Queue', 0);
		template.resourceCountIs('AWS::Events::Rule', 0);
		template.resourceCountIs('AWS::S3::Bucket', 0);
		template.resourceCountIs('AWS::DynamoDB::Table', 0);
	});

	it('names the function after stackName and sets NODE_ENV from stage', () => {
		apiStack({ stage: 'production' }).hasResourceProperties(
			'AWS::Lambda::Function',
			{
				FunctionName: 'orders-api',
				Timeout: 30,
				Environment: { Variables: { NODE_ENV: 'production' } },
			},
		);
	});

	it('adds an HTTP API with a catch-all route when triggersOptions.apiGateway is set', () => {
		const template = apiStack({
			triggersOptions: { apiGateway: { options: { apiName: 'orders' } } },
		});
		template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
		template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
			RouteKey: 'ANY /{proxy+}',
		});
	});

	it('adds an SNS topic and an SQS queue named after the stack when those triggers are set', () => {
		const template = apiStack({
			triggersOptions: { sns: { displayName: 'orders' }, sqs: { visibilityTimeout: undefined, fifo: false } },
		});
		template.hasResourceProperties('AWS::SNS::Topic', {
			TopicName: 'orders-api',
		});
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'orders-api',
		});
	});

	it('attaches an existing layer by name and version through extraLayers', () => {
		const template = apiStack({
			lambdaOptions: {
				code: inlineCode(),
				extraLayers: [{ name: 'shared-deps', version: 3 }],
			},
		});
		template.hasResourceProperties('AWS::Lambda::Function', {
			Layers: ['arn:aws:lambda:us-east-1:123456789012:layer:shared-deps:3'],
		});
	});

	it('supports several extraLayers without construct id collisions', () => {
		const template = apiStack({
			lambdaOptions: {
				code: inlineCode(),
				extraLayers: [
					{ name: 'a', version: 1 },
					{ name: 'b', version: 2 },
				],
			},
		});
		template.hasResourceProperties('AWS::Lambda::Function', {
			Layers: [
				'arn:aws:lambda:us-east-1:123456789012:layer:a:1',
				'arn:aws:lambda:us-east-1:123456789012:layer:b:2',
			],
		});
	});

	it('rejects an extra layer that has no version', () => {
		expect(() =>
			apiStack({
				lambdaOptions: {
					code: inlineCode(),
					extraLayers: [{ name: 'shared-deps' }],
				},
			}),
		).toThrow(/layer 'name' and 'version' are required/i);
	});

	it('adds lambda-principal policies to the function role, and works without any', () => {
		const template = apiStack({
			policies: [
				{
					principal: 'lambda',
					policy: new PolicyStatement({
						actions: ['dynamodb:GetItem'],
						resources: ['*'],
					}),
				},
			],
		});
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyDocument: {
				Statement: [
					{ Action: 'dynamodb:GetItem', Effect: 'Allow', Resource: '*' },
				],
			},
		});
	});

	it('defaults the region to us-east-1', () => {
		const app = new App();
		const stack = new BaseLambdaApiStack(app, 'NoRegion', {
			stackName: 'no-region',
			stackOptions: { stage: 'qa', lambdaOptions: { code: inlineCode() } },
		} as never);
		expect(stack.region).toBe('us-east-1');
	});
});

describe('BaseLambdaLayerStack', () => {
	it('publishes a named Lambda layer', () => {
		const app = new App();
		const stack = new BaseLambdaLayerStack(app, 'LayerStack', {
			stackName: 'shared-layer',
			env: ACCOUNT_ENV,
			stackOptions: {
				stage: 'production',
				layerOptions: {
					layerVersionName: 'shared-deps',
					code: Code.fromAsset(ASSET_DIR),
				},
			},
		} as never);
		const template = Template.fromStack(stack);
		template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
		template.hasResourceProperties('AWS::Lambda::LayerVersion', {
			LayerName: 'shared-deps',
		});
	});
});
