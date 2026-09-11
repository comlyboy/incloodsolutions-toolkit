/**
 * Regression guard for the published bundles.
 *
 * `@incloodsolutions/devkit` has NO package-root export, and — below the single
 * `aws` catch-all — NO "give me every construct" or "give me every stack" barrel
 * either (`aws-cdk`, `aws-cdk/constructs`, `aws-cdk/stacks` do not exist): only
 * leaf, single-item subpaths, so nothing pulls more than one construct or stack
 * into a consumer's build by accident. Every dependency (`aws-cdk-lib`,
 * `constructs`, `@incloodsolutions/toolkit`) is kept EXTERNAL, so the output
 * keeps the source's `import` statements verbatim and must: carry no
 * `__require(...)` shim, load as ESM without throwing (a stack module must have
 * NO module-scope side effects — instantiating a stack belongs in a consumer's
 * CDK app, not in the published module), and stay isolated from its siblings.
 *
 * These tests only run when `dist/` has been built (`npm run build`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CONSTRUCTS: Record<string, string> = {
	'api-gateway': 'BaseApiGatewayConstruct',
	'api-gateway-v2': 'BaseApiGatewayV2Construct',
	'api-gateway-websocket': 'BaseApiGatewayWebSocketConstruct',
	cloudfront: 'BaseCloudfrontConstruct',
	cloudwatch: 'BaseCloudwatchLogGroupConstruct',
	'dynamo-db': 'BaseDynamoDBConstruct',
	'event-bridge': 'BaseEventBridgeConstruct',
	lambda: 'BaseLambdaConstruct',
	'lambda-authorizer': 'BaseLambdaAuthoriserConstruct',
	'lambda-authorizer-v2': 'BaseLambdaAuthoriserV2Construct',
	'lambda-layer': 'BaseLambdaLayerConstruct',
	'role-policy': 'BaseRolePolicyConstruct',
	route53: 'BaseRoute53Construct',
	s3: 'BaseS3Construct',
	's3-deployment': 'BaseS3DeploymentConstruct',
	sns: 'BaseSnsConstruct',
	sqs: 'BaseSqsConstruct',
	vpc: 'BaseVpcConstruct',
};

const STACKS: Record<string, string> = {
	'lambda-api': 'BaseLambdaApiStack',
	'lambda-sns': 'BaseLambdaSnsStack',
	'lambda-sqs': 'BaseLambdaSqsStack',
};

const SUBPATH_ENTRIES: Record<string, string> = {
	aws: 'BaseLambdaConstruct',
	'aws-types': '',
	...Object.fromEntries(
		Object.entries(CONSTRUCTS).map(([name, cls]) => [
			`aws-cdk/constructs/${name}`,
			cls,
		]),
	),
	...Object.fromEntries(
		Object.entries(STACKS).map(([name, cls]) => [`aws-cdk/stacks/${name}`, cls]),
	),
};

const dist = (name: string) =>
	fileURLToPath(new URL(`../dist/${name}.js`, import.meta.url));

const built = existsSync(dist('aws'));
const suite = built ? describe : describe.skip;

suite('published subpath entries', () => {
	it('package.json exports no package root and no "all constructs/stacks" barrel', () => {
		const pkg = JSON.parse(
			readFileSync(
				fileURLToPath(new URL('../package.json', import.meta.url)),
				'utf8',
			),
		);
		expect(pkg.exports['.']).toBeUndefined();
		expect(pkg.main).toBeUndefined();
		expect(pkg.module).toBeUndefined();
		expect(pkg.types).toBeUndefined();
		for (const barrel of ['./aws-cdk', './aws-cdk/constructs', './aws-cdk/stacks']) {
			expect(
				pkg.exports[barrel],
				`${barrel} would bundle every construct/stack into one artifact — only leaf subpaths should exist`,
			).toBeUndefined();
		}
	});

	for (const [name, expectedExport] of Object.entries(SUBPATH_ENTRIES)) {
		const file = dist(name);

		it(`${name}: built`, () => {
			expect(
				existsSync(file),
				`dist/${name}.js is missing — run npm run build`,
			).toBe(true);
		});

		it(`${name}: no unresolved dynamic requires, keeps aws-cdk-lib external`, () => {
			const src = readFileSync(file, 'utf8');
			expect(src).not.toMatch(/__require\(["']/);
			expect(src).not.toMatch(/\/\/ node_modules\/aws-cdk-lib\//);
		});

		it(`${name}: loads as ESM`, async () => {
			const mod = await import(file);
			if (expectedExport) {
				expect(typeof mod[expectedExport]).toBe('function');
			} else {
				expect(mod).toBeTypeOf('object');
			}
		});
	}

	it('a single construct entry does not pull in the others', () => {
		const src = readFileSync(dist('aws-cdk/constructs/s3'), 'utf8');
		expect(src).toContain('BaseS3Construct');
		expect(src).not.toContain('BaseDynamoDBConstruct');
		expect(src).not.toContain('BaseVpcConstruct');
	});

	it('a single stack entry does not pull in the others', () => {
		const src = readFileSync(dist('aws-cdk/stacks/lambda-sns'), 'utf8');
		expect(src).toContain('BaseLambdaSnsStack');
		expect(src).not.toContain('BaseLambdaApiStack');
		expect(src).not.toContain('BaseLambdaSqsStack');
	});
});
