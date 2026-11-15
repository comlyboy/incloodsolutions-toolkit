/**
 * @packageDocumentation
 *
 * `@incloodsolutions/devkit` — opinionated AWS CDK v2 constructs and stacks.
 *
 * This barrel is **not** published: there is no package-root export. Import each item from its
 * own subpath instead, for example `@incloodsolutions/devkit/aws-cdk/constructs/lambda` or
 * `@incloodsolutions/devkit/aws-cdk/stacks/lambda-api`. `@incloodsolutions/devkit/aws` re-exports
 * everything and does not tree-shake.
 *
 * Re-exports everything from `./aws`:
 * - the `Base*` CDK constructs in `aws/cdk/constructs/` (Lambda, Lambda layer, REST + HTTP +
 *   WebSocket API Gateway, both Lambda authorizer variants, DynamoDB, S3, S3-to-CloudFront
 *   static-site deployment, CloudFront, CloudWatch log group, SNS, SQS, EventBridge, VPC, IAM
 *   role/policy, Route53);
 * - the `Base*Stack` stacks in `aws/cdk/stacks/` (Lambda + API, Lambda layer, Lambda + SNS,
 *   Lambda + SQS);
 * - the shared types {@link IBaseConstruct}, {@link IBaseCdkConstructProps} and
 *   {@link IBaseStackProps}.
 *
 * The `cli`, `lint`, `prettier`, and `utility` folders are placeholders and export nothing.
 * See `README.md` and `../docs/AI-INDEX.md`.
 */

// export * from './cli';
export * from './aws';
