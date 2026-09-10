import { defineConfig, Options } from 'tsup';

import { tsupBaseConfig } from "../shared/tsup-base.config";

/**
 * One bundle per public module — and per sub-module — so a consumer imports only
 * the area they use. Subpaths mostly mirror the source folder; the AWS SDK
 * wrappers are flattened to `aws-sdk/*` (from `src/aws/sdk/*`) to keep the path
 * short. Importing `@incloodsolutions/node-toolkit/aws-sdk/s3` pulls only
 * `@aws-sdk/client-s3`, not the DynamoDB client, its Zod/class-validator chain,
 * or Mongoose.
 *
 * `.` stays the full barrel (`src/index.ts`) for backwards compatibility.
 */
export default defineConfig([
	{
		...tsupBaseConfig as unknown as Options,
		// Keep every dependency external (AWS SDK v3, mongoose, bcryptjs, …) —
		// bundling them bloats each entry and pulls the MongoDB driver's dynamic
		// `require()` calls into the ESM output. See `test/esm-bundle.spec.ts`.
		skipNodeModulesBundle: true,
		entry: {
			index: 'src/index.ts',

			// Top-level modules
			aws: 'src/aws/index.ts',
			gcp: 'src/gcp/index.ts',
			mongo: 'src/mongo/index.ts',
			utility: 'src/utility/index.ts',
			config: 'src/config/index.ts',
			interface: 'src/interface/index.ts',

			// AWS sub-modules (flattened to `aws-*` — no deep nesting)
			'aws-lambda': 'src/aws/lambda/index.ts',
			'aws-cli': 'src/aws/cli/index.ts',
			'aws-sdk': 'src/aws/sdk/index.ts',
			'aws-sdk/s3': 'src/aws/sdk/s3.ts',
			'aws-sdk/ses': 'src/aws/sdk/ses.ts',
			'aws-sdk/sns': 'src/aws/sdk/sns.ts',
			'aws-sdk/dynamo-db': 'src/aws/sdk/dynamo-db.ts',
			'aws-sdk/event-bridge': 'src/aws/sdk/event-bridge.ts',

			// GCP sub-modules
			'gcp/function': 'src/gcp/function/index.ts',

			// MongoDB sub-modules
			'mongo/db': 'src/mongo/db/index.ts',
			'mongo/helper': 'src/mongo/helper/index.ts',
		},
	}
]);
