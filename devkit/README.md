# @incloodsolutions/devkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)
[![npm downloads](https://img.shields.io/npm/dm/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/devkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/devkit)

Opinionated **AWS CDK v2 constructs** with sensible defaults for building serverless
applications. Each construct wraps one or more `aws-cdk-lib` resources, applies defaults
(ARM64, current Node.js runtime, source maps, stage-based timeouts, CloudFormation
outputs), and exposes the underlying resource for further customisation.

> For a one-line index of every construct and type in this package (and the other
> toolkits), see [`../docs/AI-INDEX.md`](../docs/AI-INDEX.md). Every construct, its props
> interface, and the created resource fields carry inline TSDoc comments describing the
> applied defaults.

---

## Installation

```bash
npm install @incloodsolutions/devkit aws-cdk-lib constructs
```

Depends on `aws-cdk-lib`, `constructs`, `esbuild`, and
[`@incloodsolutions/toolkit`](../toolkit).

> **Scope note.** Only the AWS CDK constructs and their types are currently exported. The
> `src/utility`, `src/lint`, `src/prettier`, and `src/aws/cli` folders are placeholders and
> export nothing yet, despite what older documentation suggested.

## Common props

Every construct constructor is `new XxxConstruct(scope, id, props)`. `props` is based on
`IBaseCdkConstructProps`:

```typescript
interface IBaseCdkConstructProps<TOptions = any> {
  readonly stage?: AppEnvironmentType;   // 'production' | 'staging' | 'qa' | ...
  readonly options?: TOptions;           // the service-specific options (see each construct)
  readonly stackName?: string;
  readonly appName?: string;
  readonly enableDebug?: boolean;
}
```

The created resource is exposed as a public readonly field (`.function`, `.api`, `.table`,
`.topic`, `.queue`, `.layer`, `.distribution`, ...).

## Modular imports (tree-shaking)

**There is no package-root import.** `import ... from '@incloodsolutions/devkit'` does not
resolve — you must import a specific subpath. Every construct and every stack is published
as its own subpath, so using one does not bundle the other seventeen constructs or the
other two stacks. **There is also no "all constructs" or "all stacks" barrel** —
`.../aws-cdk`, `.../aws-cdk/constructs`, and `.../aws-cdk/stacks` do not resolve, on
purpose: each would silently re-bundle every construct or every stack the moment anyone
imported it. `.../aws` is the one deliberate exception — the "just give me everything"
escape hatch, documented as non-treeshaking.

```typescript
import { BaseLambdaConstruct } from '@incloodsolutions/devkit/aws-cdk/constructs/lambda';
import { BaseDynamoDBConstruct } from '@incloodsolutions/devkit/aws-cdk/constructs/dynamo-db';
import type { IBaseCdkConstructProps } from '@incloodsolutions/devkit/aws-types';
```

| Subpath | Contents |
| ------- | -------- |
| `.../aws` | everything: all `Base*` constructs and stacks + shared types (does not tree-shake) |
| `.../aws-cdk/constructs/<name>` | one construct — `api-gateway`, `api-gateway-v2`, `api-gateway-websocket`, `cloudfront`, `cloudwatch`, `dynamo-db`, `event-bridge`, `lambda`, `lambda-authorizer`, `lambda-authorizer-v2`, `lambda-layer`, `role-policy`, `route53`, `s3`, `s3-deployment`, `sns`, `sqs`, `vpc` |
| `.../aws-cdk/stacks/<name>` | one stack — `lambda-api`, `lambda-sns`, `lambda-sqs` |
| `.../aws-types` | `IBaseConstruct`, `IBaseCdkConstructProps`, `IBaseStackProps` |

Every subpath resolves ESM (`import`), CommonJS (`require`), and its own `.d.ts`.
`aws-cdk-lib` and `constructs` stay external in every bundle.

## Constructs

| Construct | Wraps | Notable defaults |
| --------- | ----- | ---------------- |
| `BaseLambdaConstruct` | `aws-lambda.Function` | Node.js 24, ARM64, 1024 MB, `Code.fromAsset('dist')`, handler `lambda.handler`, timeout 30 s (prod) / 15 s, `--enable-source-maps`, injects `NODE_ENV` from `stage`, validates env vars for duplicates. Exposes `.function`. |
| `BaseLambdaLayerConstruct` | `aws-lambda.LayerVersion` | Create new or import via `fromExistingLayerArn` / `fromExistingLayerAttribute`. Exposes `.layer` / `.existingLayer`. |
| `BaseApiGatewayConstruct` | `aws-apigateway.RestApi` | REST API with Lambda proxy integration and permissive CORS. |
| `BaseApiGatewayV2Construct` | `aws-apigatewayv2.HttpApi` | HTTP API; takes `handlerFunctions` and `routeOptions`. Exposes `.api`. |
| `BaseApiGatewayWebSocketConstruct` | `aws-apigatewayv2.WebSocketApi` + `WebSocketStage` | Lambda route integrations for `$connect` / `$disconnect` / custom routes. |
| `BaseLambdaAuthoriserConstruct` | `aws-apigateway.TokenAuthorizer` | REST API token authorizer backed by a Lambda. |
| `BaseLambdaAuthoriserV2Construct` | `aws-apigatewayv2-authorizers.HttpLambdaAuthorizer` | HTTP API Lambda authorizer. |
| `BaseDynamoDBConstruct` | `aws-dynamodb.Table` | Create new or import (`fromExistingTableArn` / `Name` / `Attributes`); `globalSecondaryIndexes` / `localSecondaryIndexes`. Exposes `.table` / `.existingTable`. |
| `BaseS3Construct` | `aws-s3.Bucket` | Bucket with defaults. |
| `BaseS3DeploymentConstruct` | S3 `Bucket` + CloudFront `Distribution` + `BucketDeployment` | Static-site deploy; toggles `withS3Bucket` / `withCloudfront`; `bucketDeploymentOptions.sources` required. |
| `BaseCloudfrontConstruct` | `aws-cloudfront.Distribution` | Distribution with `ViewerProtocolPolicy` default. |
| `BaseCloudwatchLogGroupConstruct` | `aws-logs.LogGroup` | Log group with retention. |
| `BaseSnsConstruct` | `aws-sns.Topic` | Optional `targetFunctions` as `LambdaSubscription`. Exposes `.topic`. |
| `BaseSqsConstruct` | `aws-sqs.Queue` | Optional Lambda `EventSourceMapping`. Exposes `.queue`. |
| `BaseEventBridgeConstruct` | `aws-events.Rule` | Rule with a Lambda target. |
| `BaseVpcConstruct` | `aws-ec2.Vpc` | VPC with defaults. |
| `BaseRolePolicyConstruct` | `aws-iam.Role` + `PolicyStatement` / `ManagedPolicy` | IAM role and policy helper. |
| `BaseRoute53Construct` | `aws-route53.HostedZone` + `ARecord` / `AaaaRecord` / `CnameRecord` / `TxtRecord` | Create, import (`fromExistingHostedZoneAttributes`), or look up (`fromLookupOptions`) a hosted zone — exactly one required. Optional `aRecords` / `aaaaRecords` / `cnameRecords` / `txtRecords` arrays attach records to it. Exposes `.hostedZone`. |

## Stacks

Ready-made `Stack` subclasses that wire a few constructs together. Props are based on
`IBaseStackProps<TStackOptions>` — a regular CDK `StackProps` plus a required
`stackOptions` bag (`stage`, `enableDebug`, and the stack's own options).

| Stack | Source file | Wires together |
| ----- | ----------- | --------------- |
| `BaseLambdaApiStack` | `lambda-api-stack.ts` | `BaseLambdaConstruct` (+ optional imported layer) behind `BaseApiGatewayV2Construct` (`/{proxy+}`, any method). |
| `BaseLambdaSnsStack` | `lambda-sns-stack.ts` | `BaseLambdaConstruct` subscribed to a `BaseSnsConstruct` topic. |
| `BaseLambdaSqsStack` | `lambda-sqs-stack.ts` | `BaseLambdaConstruct` as the target of a `BaseSqsConstruct` queue. |

```typescript
import { App } from 'aws-cdk-lib';
import { BaseLambdaApiStack } from '@incloodsolutions/devkit/aws-cdk/stacks/lambda-api';

const app = new App();
new BaseLambdaApiStack(app, 'OrdersApi', {
  stackOptions: { stage: 'production' },
});
```

## Types

| Symbol | Summary |
| ------ | ------- |
| `IBaseConstruct` | extends `IBaseEnableDebug`. |
| `IBaseCdkConstructProps<TOptions>` | shared construct props (see above). |
| `IBaseStackProps<TStackOptions>` | shared stack props: CDK `StackProps` + a required `stackOptions: { stage?; enableDebug? } & TStackOptions`. |

## Usage

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseLambdaConstruct } from '@incloodsolutions/devkit/aws-cdk/constructs/lambda';
import { BaseApiGatewayV2Construct } from '@incloodsolutions/devkit/aws-cdk/constructs/api-gateway-v2';
import { BaseDynamoDBConstruct } from '@incloodsolutions/devkit/aws-cdk/constructs/dynamo-db';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new BaseDynamoDBConstruct(this, 'Table', {
      stage: 'production',
      stackName: this.stackName,
      options: { tableOptions: { partitionKey: { name: 'id', type: AttributeType.STRING } } },
    });

    const handler = new BaseLambdaConstruct(this, 'Handler', {
      stage: 'production',
      stackName: this.stackName,
      options: { lambdaOptions: { environment: { TABLE_NAME: table.table.tableName } } },
    });

    table.table.grantReadWriteData(handler.function);

    new BaseApiGatewayV2Construct(this, 'Api', {
      stage: 'production',
      stackName: this.stackName,
      options: {
        handlerFunctions: [handler.function],
        routeOptions: [{ path: '/{proxy+}' }],
      },
    });
  }
}
```

## Development

```bash
npm install
npm run build      # tsup: bundles ESM + CJS and a single dist/index.d.ts
npm run format     # prettier --write (tabs, single quotes, trailing commas)
npm run lint       # eslint --fix
npm test           # vitest run — synthesises every construct and asserts its CloudFormation
npm run test:watch # vitest in watch mode
npm run package    # build, then npm pack a tarball
```

[`test/constructs.spec.ts`](./test/constructs.spec.ts) instantiates each `Base*` construct
in a throwaway `Stack` and checks the output with `aws-cdk-lib/assertions` (`Template`).
Nothing is deployed and no AWS credentials are used. Its header comment records the
constructs that need extra props or currently throw.
[`test/esm-bundle.spec.ts`](./test/esm-bundle.spec.ts) guards that every subpath entry is
built, loads as ESM, and keeps `aws-cdk-lib` / `constructs` external.

> The whole build is `tsup` (`dts: true`), pinned to `typescript@^6`. There is **no root
> export** and no `main`/`module`/`types` fields — every module and every construct is a
> `./*` subpath in `exports` (see [Modular imports](#modular-imports-tree-shaking)),
> configured by the `entry` map in `tsup.config.ts` and `exports` + `typesVersions` in
> `package.json`. The `index` bundle is still built as the test aggregation point but is
> not reachable by the package name.

## License

MIT © Inclood Solutions
