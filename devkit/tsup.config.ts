import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

/**
 * One bundle per public module — and per CDK construct and stack — so a
 * consumer imports only what they use. Subpaths mirror the source folder under
 * `aws-cdk/`, e.g. `@incloodsolutions/devkit/aws-cdk/constructs/lambda` →
 * `src/aws/cdk/constructs/lambda-construct.ts` and
 * `@incloodsolutions/devkit/aws-cdk/stacks/lambda-sns` →
 * `src/aws/cdk/stacks/lambda-sns-stack.ts`.
 *
 * Deliberately NO `aws-cdk`, `aws-cdk/constructs`, or `aws-cdk/stacks` barrel
 * entry — each of those would point at an `index.ts` that re-exports every
 * construct/stack, bundling all of them into one artifact a consumer can't
 * tree-shake out of. Only leaf (single-item) subpaths exist below `aws`, plus
 * `aws` itself as the one documented "just give me everything" escape hatch.
 *
 * There is no package-root export in `package.json` — consumers must import a
 * specific subpath so nothing pulls the whole package by accident. The `index`
 * bundle is still built (test aggregation point) but is unreachable by name.
 */
const constructs = [
	"api-gateway",
	"api-gateway-v2",
	"api-gateway-websocket",
	"cloudfront",
	"cloudwatch",
	"dynamo-db",
	"event-bridge",
	"lambda",
	"lambda-authorizer",
	"lambda-authorizer-v2",
	"lambda-layer",
	"role-policy",
	"route53",
	"s3",
	"s3-deployment",
	"sns",
	"sqs",
	"vpc",
] as const;

const stacks = ["lambda-api", "lambda-sns", "lambda-sqs"] as const;

export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		// Keep every dependency external (`aws-cdk-lib`, `constructs`, …) — never
		// bundle them. See `test/esm-bundle.spec.ts`.
		skipNodeModulesBundle: true,
		entry: {
			// Built but NOT exported from package.json — see the note above.
			index: "src/index.ts",

			// Top-level modules
			aws: "src/aws/index.ts",
			"aws-types": "src/aws/types/index.ts",

			// One entry per CDK construct
			...Object.fromEntries(
				constructs.map((name) => [
					`aws-cdk/constructs/${name}`,
					`src/aws/cdk/constructs/${name}-construct.ts`,
				]),
			),

			// One entry per CDK stack
			...Object.fromEntries(
				stacks.map((name) => [
					`aws-cdk/stacks/${name}`,
					`src/aws/cdk/stacks/${name}-stack.ts`,
				]),
			),
		},
	},
]);
