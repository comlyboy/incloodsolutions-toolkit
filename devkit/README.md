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

## Types

| Symbol | Summary |
| ------ | ------- |
| `IBaseConstruct` | extends `IBaseEnableDebug`. |
| `IBaseCdkConstructProps<TOptions>` | shared construct props (see above). |

## Usage

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseLambdaConstruct,
  BaseApiGatewayV2Construct,
  BaseDynamoDBConstruct,
} from '@incloodsolutions/devkit';

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
npm run build    # tsup (ESM + CJS), then `tsc --emitDeclarationOnly` for .d.ts
npm run format   # prettier --write (tabs, single quotes, trailing commas)
npm run lint     # eslint --fix
npm run package  # build, then npm pack a tarball
```

> This package is on **TypeScript 7**. Declarations are emitted by `tsc`, not tsup
> (tsup's bundled `rollup-plugin-dts` does not support TS 7).

## License

MIT © Inclood Solutions
