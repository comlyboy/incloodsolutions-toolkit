/**
 * @packageDocumentation
 *
 * `@incloodsolutions/node-toolkit` — server-side helpers built on
 * `@incloodsolutions/toolkit`.
 *
 * This barrel is **not** published: there is no package-root export. Import each module from its
 * own subpath instead (`@incloodsolutions/node-toolkit/aws-sdk/s3`, `.../mongo`, `.../utility`, ...).
 *
 * Modules:
 * - `aws`      — serverless Lambda adapter (`initLambdaFunctionHandler`) and AWS SDK v3
 *                wrappers for S3, SES, SNS, SSM Parameter Store, and DynamoDB (`init*ClientWrapper`).
 * - `config`   — {@link initEnvironmentVariables}, env-var loading/validation without `dotenv`.
 * - `gcp`      — {@link initGcpFunctionHandler}, the Google Cloud Functions adapter.
 * - `interface`— `IBaseEnvironmentVariable`, `IBaseApiResult`, `IBaseMongoDocument`,
 *                `MongoIdType`, `SortOrderType`.
 * - `mongo`    — {@link initMongooseConnection} (serverless-safe) and {@link initMongooseSchema}.
 * - `utility`  — crypto/hashing, Lambda `/tmp` file IO, Mongo id check, API-response and logging
 *                helpers, class-validator helpers, Mongoose normalisers, QR/barcode. UUID, nanoid
 *                and URL-encoding helpers live in `@incloodsolutions/toolkit/utility`.
 *
 * Note: `initEventBridgeClientWrapper` and `uploadToS3ViaCli` are placeholders.
 * See `README.md` and `../docs/AI-INDEX.md` for the full catalogue.
 */

export * from './aws';
export * from './config';
export * from './gcp';
export * from './interface';
export * from './mongo';
export * from './utility';
