# @incloodsolutions/node-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![npm downloads](https://img.shields.io/npm/dm/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/node-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/node-toolkit)

Server-side helpers built on top of [`@incloodsolutions/toolkit`](../toolkit): serverless
adapters for Express/NestJS, AWS SDK v3 wrappers, Mongoose helpers tuned for serverless,
crypto and hashing, environment-variable loading, request logging, and API-response
utilities.

> For a one-line index of every export in this package (and the other toolkits), see
> [`../docs/AI-INDEX.md`](../docs/AI-INDEX.md). Every exported symbol also carries an inline
> TSDoc comment with parameter descriptions, default values, and examples.

---

## Installation

```bash
npm install @incloodsolutions/node-toolkit
```

Requires Node.js 18+. `express` and `mongoose` are expected to be present in the host
application (they are used by the serverless and MongoDB helpers). AWS SDK v3 clients,
`bcryptjs`, `crypto-js`, `class-validator`, `class-transformer`, `morgan`, `bwip-js`, and
`uuid` are installed as dependencies.

## What's inside

| Area | Exports |
| ---- | ------- |
| Serverless adapters | `initLambdaFunctionHandler`, `getCurrentLambdaInvocation`, `initGcpFunctionHandler` |
| AWS SDK wrappers | `initS3ClientWrapper`, `initSesClientWrapper`, `initSnsClientWrapper`, `initDynamoDbClientWrapper`, `validateSchema` |
| Config | `initEnvironmentVariables` |
| MongoDB / Mongoose | `initMongooseConnection`, `initMongooseSchema` |
| Crypto & hashing | `encryptData`, `decryptData`, `hashWithBcrypt`, `validateHashWithBcrypt` |
| Lambda filesystem | `writeFileToLambda`, `readFileFromLambda`, `isLambdaEnvironment` |
| IDs | `generateCustomUUID`, `isValidUUID`, `isValidMongoId` |
| HTTP / API | `apiResult`, `returnApiResponse`, `returnApiOverview`, `getIpAddress`, `reqResLogger`, `encodeUrlComponent`, `decodeUrlComponent` |
| Logging | `printLog`, `initCustomLogger` |
| Validation | `validateDataWithClassValidator`, `validateSchema` |
| Mongo data shaping | `normalizeMongooseData`, `normalizeMongooseData_v2`, `sanitizeObject` |
| Misc | `generateQrBarcode`, `isNestApplication` |
| Interfaces / types | `IBaseEnvironmentVariable`, `IBaseApiResult`, `IBaseMongoDocument`, `INestAppInstance`, `MongoIdType`, `SortOrderType` |

Not yet implemented: `initEventBridgeClientWrapper` (returns `{}`), `uploadToS3ViaCli`
(empty). `BaseSchemaEntity` exists in source but is not exported.

## Usage

### Run an Express or NestJS app on AWS Lambda

```typescript
import { initLambdaFunctionHandler } from '@incloodsolutions/node-toolkit';
import { app } from './app'; // an Express instance or a NestJS app instance

export const handler = (event: any, context: any, callback: any) =>
  initLambdaFunctionHandler({ app, event, context, callback });
```

`getCurrentLambdaInvocation()` returns the current `{ context, event }` anywhere downstream.
The equivalent for Google Cloud Functions is `initGcpFunctionHandler({ app, request, response })`.

### Load and validate environment variables (no `dotenv`)

```typescript
import { initEnvironmentVariables } from '@incloodsolutions/node-toolkit';

export const env = initEnvironmentVariables(
  {
    NODE_ENV: { required: true, defaultValue: 'development' },
    PORT: { defaultValue: 8080 },
    MONGO_DATABASE_URL: { required: true },
  },
  { enableDebug: true },
);
```

A required variable with no value and no `defaultValue` throws a `CustomException`.

### DynamoDB document-client wrapper

```typescript
import { initDynamoDbClientWrapper } from '@incloodsolutions/node-toolkit';

const users = initDynamoDbClientWrapper<UserRecord, 'emailIndex'>({
  tableName: 'users',
  schema: UserDto, // class-validator DTO or a ZodObject
  compositePrimaryKeyOptions: { primaryKeyName: 'id', primaryKeyIdType: 'uuid' },
  validationOptions: { platform: 'zod' },
  options: { timestamp: true, enableDebug: false },
});

await users.put({ data: { name: 'Ada', email: 'ada@x.io' } });
const { data, nextPageToken } = await users.query({
  conditions: { email: 'ada@x.io' },
  filter: {},
  indexName: 'emailIndex',
  returnAll: true,
});
await users.updateOne({ key: { id }, data: { name: 'Ada L.' } });
await users.delete({ key: { id } });
```

The wrapper handles DynamoDB reserved words, projection (`select`), `contains` search
(`searchTerms`), and automatic pagination when `returnAll` is set.

### S3, SES, SNS

```typescript
import {
  initS3ClientWrapper,
  initSesClientWrapper,
  initSnsClientWrapper,
} from '@incloodsolutions/node-toolkit';

const s3 = initS3ClientWrapper({ bucketName: 'assets' });
const url = await s3.generateSignedUrl({ fileName: 'a.png', commandType: 'read', expiresIn: 900 });

const ses = initSesClientWrapper({ sourceEmail: 'no-reply@inclood.io' });
await ses.sendEmail({ subject: 'Hi', message: { content: '<b>Hello</b>' }, receivers: ['a@x.io'] });

const sns = initSnsClientWrapper({ config: { region: 'us-east-1' } });
await sns.sendSms({ message: 'Code 1234', phoneNumber: '+15550000000' });
```

### Mongoose in serverless

```typescript
import { initMongooseConnection, initMongooseSchema } from '@incloodsolutions/node-toolkit';

const { connection, closeConnection } = await initMongooseConnection({
  options: { retries: 5, retryDelayMs: 5000, enableDebug: true },
});

const UserSchema = initMongooseSchema<UserModel>({ name: String, email: String });
```

The connection is cached on `global` and reused across warm Lambda invocations.

### Crypto, hashing, IDs

```typescript
import {
  encryptData, decryptData,
  hashWithBcrypt, validateHashWithBcrypt,
  generateCustomUUID,
} from '@incloodsolutions/node-toolkit';

const token = encryptData({ data: { userId: 1 }, secret: process.env.SECRET, type: 'aes256' });
const payload = decryptData<{ userId: number }>({ hashedData: token, secret: process.env.SECRET });

const hash = await hashWithBcrypt('password', 10);
const ok = await validateHashWithBcrypt('password', hash);

const id = generateCustomUUID({ version: 7, asUpperCase: true });
```

### API responses and logging

```typescript
import {
  returnApiResponse, apiResult, returnApiOverview,
  reqResLogger, printLog, initCustomLogger,
} from '@incloodsolutions/node-toolkit';

app.use(reqResLogger({ formats: ['user-agent'] }));
app.get('/', (_req, res) => res.send(returnApiOverview({ name: 'My API', docsUrl: '/docs' })));
app.get('/users', (_req, res) => returnApiResponse(res, apiResult({ data: users }), 200));
```

### Normalising Mongoose documents for API output

```typescript
import { normalizeMongooseData_v2 } from '@incloodsolutions/node-toolkit';

const user = normalizeMongooseData_v2(await UserModel.findById(id));
// ObjectIds become strings recursively; `id` is added from `_id`.
```

### QR codes and barcodes

```typescript
import { generateQrBarcode } from '@incloodsolutions/node-toolkit';

const qr = await generateQrBarcode('https://inclood.io');            // data:image/png;base64,...
const barcode = await generateQrBarcode({ id: 42 }, { type: 'barcode' });
```

## Development

```bash
npm install
npm run build    # tsup (ESM + CJS), then `tsc --emitDeclarationOnly` for .d.ts
npm run format   # prettier --write (tabs, single quotes, trailing commas)
npm run lint     # eslint --fix
npm test         # jest
npm run package  # build, then npm pack a tarball
```

> This package is on **TypeScript 7**. Declarations are emitted by `tsc`, not tsup
> (tsup's bundled `rollup-plugin-dts` does not support TS 7). `tsconfig.json` uses
> `module`/`moduleResolution: "NodeNext"` so packages that expose their types only through
> a `node` export condition (e.g. `bwip-js`) resolve.

## License

MIT © Inclood Solutions
