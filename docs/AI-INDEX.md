# AI index — every public export in the IncloodSolutions toolkits

This file is a flat, greppable catalogue of everything the packages in this repository
export. Use it to check whether a helper already exists before writing a new one, and to
find the file it lives in.

- **Scope**: only symbols that are re-exported from a package's entry point are listed.
- **Source paths** are relative to the package directory.
- **Status tags**: `stub` = defined but empty / returns nothing useful; `broken` = will
  throw or fail as written; `not-exported` = defined in source but not reachable from the
  package entry point (documented here so you do not rely on it).
- Regenerate expectations: when you change an export, edit this file in the same commit.

Packages:

| Import path | Directory | Section |
| ----------- | --------- | ------- |
| `@incloodsolutions/toolkit` | `toolkit/` | [Core](#incloodsolutionstoolkit) |
| `@incloodsolutions/node-toolkit` | `node/` | [Node](#incloodsolutionsnode-toolkit) |
| `@incloodsolutions/react-toolkit` | `react/` | [React](#incloodsolutionsreact-toolkit) |
| `@incloodsolutions/devkit` | `devkit/` | [Devkit / AWS CDK](#incloodsolutionsdevkit) |
| `@incloodsolutions/angular-toolkit` | `angular/` | [Angular](#incloodsolutionsangular-toolkit) |

---

## @incloodsolutions/toolkit

Framework-agnostic. Entry point: `src/index.ts` → `error`, `utility`, `validator`,
`interface`. Runtime deps: `axios`, `handlebars`, `libphonenumber-js`, `nanoid`,
`validator`, `xml2js`, `zod`.

### Errors — `src/error/index.ts`

| Symbol | Kind | Summary |
| ------ | ---- | ------- |
| `CustomException` | class extends `Error` | `new CustomException(error: string \| Error \| unknown, statusCode = 400, options?: ErrorOptions)`. Normalises any input to `{ message, status, statusCode, cause? }`. `name` is always `"CustomException"`. Preserves a wrapped error's stack. |

### Utilities — `src/utility/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `isIsoDate` | `(date: string) => boolean` | True if the string is an ISO 8601 date or date-time. |
| `generateISODate` | `(date?: string \| number \| Date) => string` | ISO string for the given date, or now. |
| `generateRandomId` | `({ length?: number; variant?: 'alphabet' \| 'numeric' \| 'alphanumeric' }) => string` | Random ID; defaults length 6, `numeric`. `alphanumeric` alternates letters/digits. |
| `generateNanoid` | `(size?: number) => string` | `nanoid` wrapper, default length 10. |
| `transformText` | `({ text: string; trim?: boolean; format?: 'uppercase' \| 'lowercase' \| 'titlecase' \| 'capitalize' \| 'kebab' }) => string` | Reformats a string. |
| `containsUUID` | `(input: string) => boolean` | True if the string contains a v1–v5 UUID. |
| `sendHttpRequest` | `<TResponse, TBody>(options: AxiosRequestConfig<TBody>) => Promise<TResponse>` | Axios call resolving to `response.data`; rethrows a normalised error object. |
| `parsePhonenumber` | `(phoneNumber: string, options?: { throwUnfound?: boolean; defaultCountry?: CountryCode; defaultCallingCode?: string; extract?: boolean }) => PhoneNumber \| undefined` | Parse with `libphonenumber-js`; prefixes `+`. `undefined` on failure unless `throwUnfound`. |
| `sanitizeObject` | `<TData>({ data: TData; keysToRemove?: (keyof TData)[] }) => TData` | Recursively drops `undefined`, `null`, `''`, `'undefined'` values. |
| `generateDateInNumber` | `({ date?: string \| number \| Date; withSeparation?: boolean }) => string` | Compact numeric timestamp, e.g. `20240412010255666`. |
| `cloneDeep` | `<TData>(data: TData) => TData` | Deep clone via `structuredClone`; primitives returned as-is. |
| `removeDuplicates` | `<TData extends any[]>(dataList: TData, property?: string[]) => TData` | De-duplicate an array; pass keys for object de-dup. |
| `sendMessageToTelegram` | `({ chatId: string; secret: string; message: string }) => Promise<unknown>` | Send a Markdown message via the Telegram Bot API. |
| `encodeUrlComponent` | `<TData>(data: TData) => string` | `encodeURIComponent`, JSON-stringifying non-strings. |
| `decodeUrlComponent` | `<TType>(data: string) => TType` | Inverse of `encodeUrlComponent`. |
| `xmlToJson` | `<TResponse>(xmlData: string, options: ParserOptions) => Promise<TResponse>` | Parse XML to object (`xml2js`). |
| `jsonToXml` | `<TData>(dataObject: TData, options: BuilderOptions) => Promise<string>` | Build XML from object (`xml2js`). |
| `detectDuplicateProperties` | `<TObject>({ data: TObject; parentKey?: string }) => void` | Throws `CustomException` if a dotted key path repeats. |
| `compileHtmlWithHandlebar` | `<TData>({ data: TData; htmlString: string; compileOptions?: CompileOptions; runtimeOptions?: RuntimeOptions }) => string` | Compile + render a Handlebars template. |
| `printLog` | `(context: string, message: string, data?: any, options?: { prettify?: boolean; ignoreDate?: boolean }) => void` | Formatted `console.log` with optional colour/timestamp. |

### Validation schemas (Zod) — `src/validator/index.ts`

Schema instances (use directly): `UuidValidationSchema`, `EmailValidationSchema`,
`UrlValidationSchema`, `DateTimeValidationSchema` (ISO datetime), `BooleanValidationSchema`.

Factory functions (call to get a schema):

| Symbol | Defaults |
| ------ | -------- |
| `PasswordValidationSchema(min = 6, max = 100)` | length-bounded string |
| `RequiredStringValidationSchema()` | trimmed, min 1 |
| `NameValidationSchema(min = 2, max = 100)` | trimmed |
| `FirstNameValidationSchema`, `LastNameValidationSchema` | aliases of `NameValidationSchema` |
| `UsernameValidationSchema()` | 3–30, `[a-zA-Z0-9_]` |
| `PhoneNumberValidationSchema()` | 7–20 chars |
| `SlugValidationSchema()` | lowercase hyphenated |
| `HexColorValidationSchema()` | `#rgb` / `#rrggbb` |
| `OtpValidationSchema(length = 6)` | digit string of fixed length |
| `TokenValidationSchema()` | non-empty string |
| `DescriptionValidationSchema(max = 1000)` | trimmed, max length |
| `PositiveNumberValidationSchema()` | number > 0 |
| `NonNegativeNumberValidationSchema()` | number ≥ 0 |
| `PageValidationSchema()` | integer ≥ 1 |
| `PageSizeValidationSchema(max = 100)` | integer 1–max |
| `SearchQueryValidationSchema(max = 200)` | trimmed, max length |
| `CountryCodeValidationSchema()` | 2 chars, upper-cased |
| `CurrencyCodeValidationSchema()` | 3 chars, upper-cased |
| `LanguageCodeValidationSchema()` | 2–10 chars |
| `MimeTypeValidationSchema()` | `type/subtype` pattern |
| `FileExtensionValidationSchema()` | alphanumeric |
| `IpAddressValidationSchema()` | IPv4 or IPv6 |
| `LatitudeValidationSchema()` | number −90..90 |
| `LongitudeValidationSchema()` | number −180..180 |

### Validator predicates — `src/validator/index.ts`

Every predicate/sanitiser from [`validator`](https://github.com/validatorjs/validator.js) is
re-exported, including: `isEmail`, `isURL`, `isUUID`, `isEmpty`, `isJWT`, `isJSON`,
`isMongoId`, `isCreditCard`, `isStrongPassword`, `isMobilePhone`, `isPostalCode`, `isSlug`,
`isHexColor`, `isIP`, `isFQDN`, `isISO8601`, `isRFC3339`, `isBase64`, `isDecimal`,
`isNumeric`, `isAlpha`, `isAlphanumeric`, `isLength`, `isStrongPassword`, `contains`,
`equals`, `matches`, `normalizeEmail`, `trim`, `ltrim`, `rtrim`, `escape`, `unescape`,
`blacklist`, `whitelist`, `stripLow`, `toBoolean`, `toDate`, `toFloat`, `toInt`, plus the
ISO-standard checks (`isISO31661Alpha2`, `isISO31661Alpha3`, `isISO4217`, `isISO6391`,
`isISO15924`, `isISO6346`, `isABARouting`, `isIBAN`, `isBIC`, `isVAT`, `isTaxID`,
`isIMEI`, `isEAN`, `isISBN`, `isISIN`, `isISSN`, `isISRC`, `isULID`, `isEthereumAddress`,
`isBtcAddress`, `isDataURI`, `isMagnetURI`, `isMimeType`, `isSemVer`, `isLicensePlate`,
`isLocale`, `isTime`, `isLatLong`, `isPort`, `isMACAddress`, `isMD5`, `isHash`, and more).
The type namespace is re-exported as `ValidatorTypes`.

### Interfaces, enums, and types — `src/interface/index.ts`

| Symbol | Kind | Shape / summary |
| ------ | ---- | --------------- |
| `IBaseId<TType = string>` | interface | `{ id: TType }` |
| `IBaseName` | interface | `{ name: string }` |
| `IBaseEntityName<TEntity>` | interface | `{ entityName: TEntity }` |
| `IBaseIsActive` | interface | `{ isActive: boolean }` |
| `IBaseRoles<TType = string>` | interface | `{ roles: TType[] }` |
| `IBaseTimestamp<TType = string>` | interface | `{ timestamp: TType }` |
| `IBaseRecordProgress<TProgress>` | interface | `{ progress: TProgress[] }` |
| `IBaseStatus<TStatus>` | interface | `{ status: TStatus }` |
| `IBaseAmount<TType = number>` | interface | `{ amount: TType }` |
| `IBaseDescription` | interface | `{ description: string }` |
| `IBasePassword` | interface | `{ password: string }` |
| `IBaseReferenceId<TType = string>` | interface | `{ referenceId: TType }` |
| `IBaseBusiness<TBusiness, TType = string>` | interface | `{ businessId: TType; business?: TBusiness }` |
| `IBaseStore<TStore, TType = string>` | interface | `{ storeId: TType; store?: TStore }` |
| `IBaseCustomer<TCustomer, TType = string>` | interface | `{ customerId: TType; customer?: TCustomer }` |
| `IBaseDelete<TDeleter, TType = string>` | interface | soft-delete metadata: `isDeleted`, `deletedAtDate?`, `deletedByUserId?`, `deletedBy?` |
| `IBaseCreator<TCreator, TType = string>` | interface | creation metadata: `createdAtDate`, `createdByUserId?`, `createdBy?` |
| `IBaseEditor<TModifier, TType = string>` | interface | last-modified metadata: `lastModifiedAtDate?`, `lastModifiedByUserId?`, `lastModifiedBy?` |
| `IBaseEnableDebug` | interface | `{ enableDebug: boolean }` |
| `IBaseErrorResponse` | interface | extends `IBaseTimestamp`; `{ path, method, message, success?, statusCode }` |
| `AppEnvironmentEnum` | enum | `QA`, `TEST`, `LOCAL`, `STAGING`, `PRODUCTION`, `DEVELOPMENT` |
| `AppEnvironmentType` | type | string-literal union of `AppEnvironmentEnum` values |
| `ExtractValueTypes<TEntity>` | type | union of a type's value types |
| `ObjectType<TValue = any, TKey extends string \| number \| symbol = string>` | type | `Record<TKey, TValue>` |
| `SortOrderType` | type | `'ascending' \| 'descending'` |

---

## @incloodsolutions/node-toolkit

Node.js. Entry point: `src/index.ts` → `aws`, `config`, `gcp`, `interface`, `mongo-db`,
`utility`. Depends on `@incloodsolutions/toolkit` plus AWS SDK v3, `bcryptjs`, `bwip-js`,
`class-transformer`, `class-validator`, `crypto-js`, `handlebars`, `morgan`, `uuid`, `zod`.
`express` and `mongoose` are used in types and must be available in the host app.

### Serverless adapters — `src/aws/lambda/index.ts`, `src/gcp/function/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `initLambdaFunctionHandler` | `({ app: Express \| INestAppInstance; event; context: Context; callback?; options? }) => Promise<any>` | Run an Express/NestJS app as an API Gateway v2 (or SNS/SQS/EventBridge) Lambda handler via `@codegenie/serverless-express`. Caches the instance across invocations. |
| `getCurrentLambdaInvocation` | `() => { context: Context; event }` | Current Lambda `context`/`event`; `null` fields outside Lambda. |
| `initGcpFunctionHandler` | `({ app: Express \| INestAppInstance; request: Request; response: Response }) => Promise<unknown>` | Run an Express/NestJS app as a GCP HTTP Function. |

### AWS SDK wrappers — `src/aws/sdk/`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `initS3ClientWrapper` | `({ bucketName: string; config?: S3ClientConfig }) => { uploadFile, getFile, generateSignedUrl, deleteFile }` | S3 helper. `generateSignedUrl({ fileName, commandType: 'read' \| 'create' \| 'delete', expiresIn? })`. |
| `initSesClientWrapper` | `({ sourceEmail: string; config?: SESClientConfig }) => { sendEmail }` | `sendEmail({ subject, message: { content, type?: 'html' \| 'text', charset? }, receivers: string[] })`. |
| `initSnsClientWrapper` | `({ config: SNSClientConfig }) => { sendSnsMessage, sendSms, sendBatchMessage }` | SNS topic publish, SMS, and batch publish. |
| `initDynamoDbClientWrapper` | `<TType, TIndex>(options) => { put, query, getOne, getMany, updateOne, delete }` | DynamoDB DocumentClient CRUD wrapper with auto primary-key generation (`uuid` / `timestampUuid` / `epochTimestamp`), reserved-word handling, projections, `contains` search, and full pagination in `query`/`getMany`. |
| `validateSchema` | `<TData>({ schema: (new () => object) \| ZodObject; data; platform?: 'zod' \| 'class-validator'; enableDebug?; skipMissingProperties?; validationOptions? }) => Promise<TData>` | Validate + transform data with Zod or class-validator; throws `CustomException` with flattened messages. |
| `initEventBridgeClientWrapper` | `() => {}` | **stub** — placeholder, returns `{}`. |
| `uploadToS3ViaCli` | `({}) => void` | **stub** — empty (`src/aws/cli/scripts/index.ts`). |

### Config — `src/config/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `initEnvironmentVariables` | `<TSchema>(schema: { [K in keyof TSchema]: { required?: boolean; defaultValue?: string \| number \| boolean } }, options?: { envPath?: string; includeAllVariables?: boolean; enableDebug?: boolean }) => TSchema & IBaseEnvironmentVariable` | Read + validate `process.env` without `dotenv`. Throws `CustomException` for a missing required var with no default; caches results. |

### MongoDB / Mongoose — `src/mongo-db/`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `initMongooseConnection` | `(params?: { url?: string; options?: { retries?: number; retryDelayMs?: number; enableDebug?: boolean }; connectionOptions?: ConnectOptions }) => Promise<{ connection: Connection; closeConnection: () => Promise<void> }>` | Globally-cached singleton connection tuned for serverless (pool size 1, retries, stale-connection ping). Defaults URL to `process.env.MONGO_DATABASE_URL`. |
| `initMongooseSchema` | `<TModel>(fields: SchemaDefinition<TModel>, options?: SchemaOptions<TModel>) => Schema<TModel>` | `new Schema` with `strict: 'throw'` and virtuals on in `toJSON`/`toObject` by default. |
| `BaseSchemaEntity` | class | **not-exported** — `mongo-db/types` is commented out in `mongo-db/index.ts`. Implements `IBaseCreator & IBaseDelete & IBaseEditor` with class-validator decorators. |

### Utilities — `src/utility/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `sanitizeObject` | `<TData>({ data; keysToRemove? }) => TData` | Same as the core helper (re-implemented here). |
| `encryptData` | `<TData>({ data?; secret; type?: 'hmacSha512' \| 'aes256' \| 'sha512' \| 'sha256'; enableDebug? }) => string` | Encrypt/hash with `crypto-js`. |
| `decryptData` | `<TResponse>({ hashedData; secret; type?: 'aes256'; enableDebug? }) => TResponse` | AES-256 decrypt + JSON parse. |
| `getIpAddress` | `(req: express.Request) => string` | Best client IP from `x-forwarded-for` / socket / `req.ip`. |
| `hashWithBcrypt` | `(data: string, saltRounds?: number) => Promise<string>` | bcrypt hash. |
| `validateHashWithBcrypt` | `(plainData: string, hashedData: string) => Promise<boolean>` | bcrypt compare. |
| `writeFileToLambda` | `({ filePath?: string; file: string \| ArrayBufferView \| File }) => Promise<string>` | Write into Lambda `/tmp`; throws outside Lambda. |
| `readFileFromLambda` | `(fileName: string) => Promise<Buffer>` | Read from Lambda `/tmp`. |
| `isLambdaEnvironment` | `() => boolean` | True when `LAMBDA_TASK_ROOT` + `AWS_LAMBDA_FUNCTION_NAME` are set. |
| `isValidUUID` | `(uuid: string) => boolean` | `uuid` package validation. |
| `generateCustomUUID` | `({ asUpperCase?: boolean; symbol?: string; version?: 4 \| 7 }) => string` | UUID (v7 default); optionally replace `-` and upper-case. |
| `apiResult` | `<TBody>(apiResponse: IBaseApiResult<TBody>) => Readonly<IBaseApiResult>` | Freeze/normalise an API result object. |
| `returnApiResponse` | `<TBody>(res: express.Response, data: IBaseApiResult<TBody>, statusCode = 200) => Response` | Send `{ success, statusCode, ...data.data }`. |
| `returnApiOverview` | `({ name; docsUrl?; primaryColor?; description? }) => string` | HTML "API overview" landing page string. |
| `encodeUrlComponent` / `decodeUrlComponent` | as core | URL component encode/decode. |
| `isValidMongoId` | `(data: string \| object \| ObjectId) => boolean` | Strict Mongo ObjectId check. |
| `initCustomLogger` | `(context?: string) => { log, info, debug, error }` | Timestamped console logger. |
| `printLog` | as core | Formatted logging. |
| `reqResLogger` | `({ formats?: string[]; options?: morgan.Options }) => RequestHandler` | `morgan` middleware with request-id and Lambda invocation-id tokens. |
| `validateDataWithClassValidator` | `<TData, TSchema>(schema: ClassConstructor<TSchema>, data: TData, options: { validatorOptions; transformOptions }) => Promise<TSchema>` | class-transformer + class-validator; throws `CustomException`. |
| `normalizeMongooseData` | `<TData>(data: TData) => TData` | Shallow: ObjectId → string, add `id` from `_id`. |
| `normalizeMongooseData_v2` | `<T>(data: T) => T` | Deep recursive variant (arrays + nested objects). |
| `isNestApplication` | `(instance) => instance is INestAppInstance` | Type guard for a Nest app instance. |
| `generateQrBarcode` | `<TData>(qrData: TData, options?: { type?: 'qrcode' \| 'barcode'; renderOptions: RenderOptions }) => Promise<string>` | `data:image/png;base64,...` QR code or Code128 barcode (`bwip-js`). |

### Interfaces and types — `src/interface/index.ts`

| Symbol | Kind | Summary |
| ------ | ---- | ------- |
| `IBaseEnvironmentVariable` | interface | Common env vars: `MONGO_DATABASE_URL?`, `TELEGRAM_BOT_TOKEN?`, `NODE_ENV`, `LOG_LEVEL?`, `PORT?`. |
| `IBaseApiResult<TData = any>` | interface | `{ data?: TData; message?: string; error?: IBaseErrorResponse }`. |
| `MongoIdType` | type | `ObjectId \| string`. |
| `IBaseMongoDocument<TType = string>` | interface | Mongoose `Document` with typed string `id`. |
| `SortOrderType` | type | `'ascending' \| 'descending'` (also in core). |
| `INestAppInstance` | interface | `{ init(): Promise<void>; getHttpAdapter(): { getInstance(): Express } }`. |

---

## @incloodsolutions/react-toolkit

React 18+. Entry point: `src/index.ts` → `components`, `hooks`, `types`, `utilities`,
`validators`. Peer deps: `react`, `react-dom`, `react-router-dom`. Bundled: `clsx`,
`tailwind-merge`, `react-hook-form`, `@hookform/resolvers`, `joi`, `zod`, `usehooks-ts`,
`react-use`, `localforage`, `radix-ui`.

### Hooks — `src/hooks/`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `useKeyEvent` | `({ combinations: { keys: string[]; matchAll?: boolean }; eventType?: keyof DocumentEventMap; returnedAction: () => void }) => void` | Run an action on a key or key-combination. |
| `usePageMetadata` | `({ title?; description?; backgroundImageUrl?; backgroundStyle?; ogImage?; twitterCardType? }) => void` | Set document title, description, OG/Twitter meta tags, and optional `body` background; reverts on unmount. |
| `useCustomNavigation` | `(onRouteChange?: (info: ICurrentNavigationMetadata) => void, enableDebug?: boolean) => ICurrentNavigationMetadata` | React Router wrapper exposing `path`, `query`, `params`, `hash`, `url`, `fullUrl`, `state`, loader `data`, `matchedData`, `navigationType`, and a `navigate(url, { queries, ...NavigateOptions })` that builds the query string. Fires `onRouteChange` on actual route changes. |
| `useCustomReactHookForm` | `<TSchema>(resolveSchema: TSchema, props?: Omit<UseFormProps<TSchema>, 'resolver'>) => UseFormReturn<TSchema>` | `react-hook-form` `useForm` with `mode: 'all'` and the schema as resolver. **not-exported** — defined in `src/hooks/useHookForm.ts` but `hooks/index.ts` does not re-export it. |

`hooks/index.ts` also re-exports **the entire `usehooks-ts` API**, and a large set of
`react-use` hooks. Names that collide with `usehooks-ts` are re-exported from `react-use`
with a `2` suffix: `useBoolean2`, `useCopyToClipboard2`, `useCounter2`, `useHover2`,
`useInterval2`. Other `react-use` hooks are re-exported under their original names, e.g.
`useAsync`, `useAsyncFn`, `useDebounce`, `useThrottle`, `useLocalStorage`, `useSessionStorage`,
`useCookie`, `useGeolocation`, `useBattery`, `useNetworkState`, `useMedia`, `useMeasure`,
`useClickAway`, `useFullscreen`, `useIdle`, `usePrevious`, `useMountedState`, `createBreakpoint`,
`createGlobalState`, and many more (see the file for the full list).

### Utilities — `src/utilities/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `parseClassnames` | `(...klasses: ClassValue[]) => string` | `twMerge(clsx(...))` — merge class names with Tailwind conflict resolution. |
| `getScreenSize` | `() => 'mobile' \| 'tablet' \| 'desktop'` | Category from `window.innerWidth` (`<768`, `<1024`, else). |

### Form resolvers — `src/validators/index.ts`

| Symbol | Signature | Summary |
| ------ | --------- | ------- |
| `zodCustomResolver` | `<TSchema>(schema: TSchema, _: {}) => Resolver` | Wrap a Zod schema as a `react-hook-form` resolver. |
| `classValidatorCustomResolver` | `<TSchema>(schema: TSchema, _: {}) => Resolver<TSchema>` | Wrap a class-validator DTO as a resolver. |
| `joiCustomResolver` | `<TSchema>(schema: TSchema, _: {}) => Resolver<TSchema>` | Wrap a Joi schema as a resolver. |
| `EmailLoginValidationSchema` | `() => ZodObject` | **broken** — references `EmailValidationSchema`/`PasswordValidationSchema` which are not imported in this file; calling it throws `ReferenceError`. |
| `UsernameLoginValidationSchema` | `() => ZodObject` | **broken** — references `PasswordValidationSchema` which is not imported. |

### Components — `src/components/`

| Symbol | Summary |
| ------ | ------- |
| `FormLayoutComponent` | A `<form>` (radix `Primitive.form`) wired to a `react-hook-form` `formGroup`, with `space-y-6` styling, `aria-busy`, `onSubmit`, `onChange`. **not-exported** — it is a `default` export and `components/index.ts` uses `export * from './FormLayoutComponent'`, which does not forward defaults. Import it from the deep path or change it to a named export to use it. |

### Types — `src/types/index.ts`

| Symbol | Summary |
| ------ | ------- |
| `ViteModeType` | `'development' \| 'qa' \| 'staging' \| 'production'`. |

`src/config/index.ts` (`getViteConfiguration`) is entirely commented out and not exported.
`src/constant/index.ts` is ~15k lines of commented-out emoji data and exports nothing.

---

## @incloodsolutions/devkit

Node.js + AWS CDK v2. Entry point: `src/index.ts` → `aws` → `cdk/constructs` + `types`.
Depends on `aws-cdk-lib`, `constructs`, `esbuild`, `@incloodsolutions/toolkit`.
`src/utility`, `src/lint`, `src/prettier`, and `src/aws/cli` are present but empty.

### CDK constructs — `src/aws/cdk/constructs/`

Every construct extends `constructs.Construct`, takes `(scope, id, props)` where `props`
is based on `IBaseCdkConstructProps`, applies opinionated defaults, and emits a `CfnOutput`.

| Symbol | Source file | Creates |
| ------ | ----------- | ------- |
| `BaseLambdaConstruct` | `lambda-construct.ts` | `aws-lambda.Function`. Defaults: Node.js 24, ARM64, 1024 MB, `Code.fromAsset('dist')`, handler `lambda.handler`, timeout 30 s in production / 15 s otherwise, source maps on, injects `NODE_ENV` from `stage`. Validates env vars for duplicates. Exposes `.function`. |
| `BaseLambdaLayerConstruct` | `lambda-layer-construct.ts` | `aws-lambda.LayerVersion`. |
| `BaseApiGatewayConstruct` | `api-gateway-construct.ts` | REST `aws-apigateway.RestApi` with Lambda integration. |
| `BaseApiGatewayV2Construct` | `api-gateway-v2-construct.ts` | HTTP `aws-apigatewayv2.HttpApi` with Lambda integration and CORS. |
| `BaseApiGatewayWebSocketConstruct` | `api-gateway-websocket-construct.ts` | `aws-apigatewayv2.WebSocketApi` + stage with Lambda route integrations. |
| `BaseLambdaAuthoriserConstruct` | `lambda-authorizer-construct.ts` | `aws-apigateway.TokenAuthorizer` (REST). |
| `BaseLambdaAuthoriserV2Construct` | `lambda-authorizer-v2-construct.ts` | `aws-apigatewayv2-authorizers.HttpLambdaAuthorizer` (HTTP API). |
| `BaseDynamoDBConstruct` | `dynamo-db-construct.ts` | `aws-dynamodb.Table` with GSI/LSI support. |
| `BaseS3Construct` | `s3-construct.ts` | `aws-s3.Bucket`. |
| `BaseS3DeploymentConstruct` | `s3-deployment-construct.ts` | S3 bucket + CloudFront distribution + `BucketDeployment` for a static site. |
| `BaseCloudfrontConstruct` | `cloudfront-construct.ts` | `aws-cloudfront.Distribution`. |
| `BaseCloudwatchLogGroupConstruct` | `cloudwatch-construct.ts` | `aws-logs.LogGroup`. |
| `BaseSnsConstruct` | `sns-construct.ts` | `aws-sns.Topic` with optional Lambda subscription. |
| `BaseSqsConstruct` | `sqs-construct.ts` | `aws-sqs.Queue` with optional Lambda event-source mapping. |
| `BaseEventBridgeConstruct` | `event-bridge-construct.ts` | `aws-events.Rule` with Lambda target. |
| `BaseVpcConstruct` | `vpc-construct.ts` | `aws-ec2.Vpc`. |
| `BaseRolePolicyConstruct` | `role-policy-construct.ts` | `aws-iam.Role` + `PolicyStatement` / `ManagedPolicy`. |

### Types — `src/aws/types/index.ts`

| Symbol | Kind | Summary |
| ------ | ---- | ------- |
| `IBaseConstruct` | interface | extends `IBaseEnableDebug`. |
| `IBaseCdkConstructProps<TOptions = any>` | interface | `{ stage?: AppEnvironmentType; options?: TOptions; stackName?: string; appName?: string; enableDebug?: boolean }` (all readonly). |

---

## @incloodsolutions/angular-toolkit

Angular 21+ (`ng-packagr` workspace at `angular/`, library at
`angular/projects/toolkit/`). Entry point: `src/public-api.ts` → `lib/services`.

| Symbol | Kind | Summary |
| ------ | ---- | ------- |
| `StorageService` | `@Injectable({ providedIn: 'root' })` class | **stub** — currently has no members. |

This package is a published placeholder; there is no usable API yet. The example in its
README (`UntilDestroy`, `untilDestroyed`) is aspirational and not implemented.
