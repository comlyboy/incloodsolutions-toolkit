/**
 * @packageDocumentation
 *
 * `@incloodsolutions/node-toolkit` — server-side helpers built on
 * `@incloodsolutions/toolkit`.
 *
 * Modules (all re-exported from the package root):
 * - `aws`      — serverless Lambda adapter (`initLambdaFunctionHandler`) and AWS SDK v3
 *                wrappers for S3, SES, SNS, and DynamoDB (`init*ClientWrapper`, `validateSchema`).
 * - `config`   — {@link initEnvironmentVariables}, env-var loading/validation without `dotenv`.
 * - `gcp`      — {@link initGcpFunctionHandler}, the Google Cloud Functions adapter.
 * - `interface`— `IBaseEnvironmentVariable`, `IBaseApiResult`, `IBaseMongoDocument`,
 *                `INestAppInstance`, `MongoIdType`, `SortOrderType`.
 * - `mongo-db` — {@link initMongooseConnection} (serverless-safe) and {@link initMongooseSchema}.
 * - `utility`  — crypto/hashing, Lambda `/tmp` file IO, IDs, API-response and logging
 *                helpers, class-validator helpers, Mongoose normalisers, QR/barcode.
 *
 * Note: `initEventBridgeClientWrapper` and `uploadToS3ViaCli` are placeholders.
 * See `README.md` and `../docs/AI-INDEX.md` for the full catalogue.
 */

export * from './aws';
export * from './config';
export * from './gcp';
export * from './interface';
export * from './mongo-db';
export * from './utility';
