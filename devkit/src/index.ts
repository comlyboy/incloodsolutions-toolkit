/**
 * @packageDocumentation
 *
 * `@incloodsolutions/devkit` — opinionated AWS CDK v2 constructs.
 *
 * Re-exports everything from `./aws`: the `Base*` CDK constructs in
 * `aws/cdk/constructs/` (Lambda, Lambda layer, REST + HTTP + WebSocket API
 * Gateway, both Lambda authorizer variants, DynamoDB, S3, S3-to-CloudFront
 * static-site deployment, CloudFront, CloudWatch log group, SNS, SQS,
 * EventBridge, VPC, IAM role/policy) plus the shared types
 * {@link IBaseConstruct} and {@link IBaseCdkConstructProps}.
 *
 * The `cli`, `lint`, `prettier`, and `utility` folders are placeholders and
 * export nothing. See `README.md` and `../docs/AI-INDEX.md`.
 */

// export * from './cli';
export * from './aws';