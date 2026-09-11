import { defineConfig, Options } from "tsup";

import { tsupBaseConfig } from "../shared/tsup-base.config";

/**
 * One bundle per public module — and per CDK construct — so a consumer imports
 * only what they use. Subpaths mostly mirror the source folder; the AWS areas
 * are flattened to `aws-*` to keep the path short, e.g.
 * `@incloodsolutions/devkit/aws-cdk/lambda` → `src/aws/cdk/constructs/lambda-construct.ts`.
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
	"s3",
	"s3-deployment",
	"sns",
	"sqs",
	"vpc",
] as const;

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
			"aws-cdk": "src/aws/cdk/constructs/index.ts",
			"aws-types": "src/aws/types/index.ts",

			// One entry per CDK construct
			...Object.fromEntries(
				constructs.map((name) => [
					`aws-cdk/${name}`,
					`src/aws/cdk/constructs/${name}-construct.ts`,
				]),
			),
		},
	},
]);
