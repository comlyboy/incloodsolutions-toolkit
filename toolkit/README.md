# @incloodsolutions/toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/toolkit)
[![npm downloads](https://img.shields.io/npm/dm/@incloodsolutions/toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/toolkit)
[![total downloads](https://img.shields.io/npm/dt/@incloodsolutions/toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/toolkit)

A lightweight, framework-agnostic utility library providing the shared functions, validation
schemas, error primitives, and TypeScript types used across every IncloodSolutions toolkit.
It is modular, dependency-light, and ships both ESM and CommonJS builds with full type
declarations.

> Every exported function, type, interface, and schema carries a TSDoc comment with
> parameter descriptions, **default values**, and usage examples, so your editor shows the
> full contract on hover. This README and [`../docs/AI-INDEX.md`](../docs/AI-INDEX.md)
> mirror the same information for quick scanning.

---

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Requirements and module formats](#requirements-and-module-formats)
- [API reference](#api-reference)
  - [Errors](#errors)
  - [Utilities](#utilities)
  - [Validation schemas (Zod)](#validation-schemas-zod)
  - [Validator predicates](#validator-predicates)
  - [Interfaces and types](#interfaces-and-types)
- [Development](#development)
- [Publishing](#publishing)
- [License](#license)

---

## Installation

```bash
npm install @incloodsolutions/toolkit
# or
yarn add @incloodsolutions/toolkit
# or
pnpm add @incloodsolutions/toolkit
```

The following libraries are bundled as runtime dependencies and installed automatically:
`axios`, `handlebars`, `libphonenumber-js`, `nanoid`, `validator`, `xml2js`, and `zod`.

## Quick start

```typescript
import {
  cloneDeep,
  transformText,
  CustomException,
  EmailValidationSchema,
  isUUID,
} from '@incloodsolutions/toolkit';

// Deep clone any structured value
const copy = cloneDeep({ company: 'Inclood', tags: ['a', 'b'] });

// Reformat text
transformText({ text: 'hello world', format: 'capitalize' }); // "Hello World"

// Validate with a ready-made Zod schema
EmailValidationSchema.parse('dev@inclood.io');

// Use a re-exported validator predicate
isUUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'); // true

// Throw a status-aware application error
throw new CustomException('User not found', 404);
```

## Requirements and module formats

| Item              | Value                                              |
| ----------------- | ------------------------------------------------- |
| Node.js           | 18 or newer (uses `structuredClone`, `Array.at`) |
| Module formats    | ESM (`dist/index.js`) and CommonJS (`dist/index.cjs`) |
| Type declarations | `dist/index.d.ts` (ESM) and `dist/index.d.cts` (CJS) |
| Side effects      | None (`"sideEffects": false`, tree-shakeable)    |

```typescript
// ESM
import { generateNanoid } from '@incloodsolutions/toolkit';

// CommonJS
const { generateNanoid } = require('@incloodsolutions/toolkit');
```

---

## API reference

Everything is exported from the package root. The sections below group exports by source
module.

### Errors

#### `CustomException`

An `Error` subclass that carries an HTTP status code, for use in APIs and backend services.
It normalizes whatever it is given (a string, a native `Error`, another `CustomException`,
or an error-like object) into a consistent shape, preserves the original stack trace when an
`Error` is wrapped, and exposes the code as both `status` and `statusCode` for compatibility
with different frameworks.

```typescript
import { CustomException } from '@incloodsolutions/toolkit';

throw new CustomException('Unauthorized access', 401);

try {
  await doWork();
} catch (error) {
  // Wrap an unknown error; status falls back to 400 when none is present
  throw new CustomException(error);
}
```

| Member       | Type     | Notes                                              |
| ------------ | -------- | ------------------------------------------------- |
| `message`    | `string` | Inherited from `Error`                            |
| `name`       | `string` | Always `"CustomException"`                        |
| `status`     | `number` | HTTP status code (default `400`)                  |
| `statusCode` | `number` | Alias of `status`                                 |
| `cause`      | `Error?` | The wrapped error, when one was supplied          |

Constructor: `new CustomException(error, statusCode?, options?)` where `error` is
`string | Error | CustomException | unknown` and `options` is the native `ErrorOptions`.

### Utilities

| Function | Signature | Description |
| -------- | --------- | ----------- |
| `isIsoDate` | `(date: string) => boolean` | Tests whether a string is an ISO 8601 date or date-time. |
| `generateISODate` | `(date?: string \| number \| Date) => string` | Returns the given date (or now) as an ISO string. |
| `generateRandomId` | `({ length?: number; variant?: 'alphabet' \| 'numeric' \| 'alphanumeric' }) => string` | Builds a random ID. Defaults to length `6`, `numeric`. `alphanumeric` alternates letters and digits. |
| `generateNanoid` | `(size?: number) => string` | Wraps `nanoid`. Default length `10`. |
| `transformText` | `({ text: string; trim?: boolean; format?: 'uppercase' \| 'lowercase' \| 'titlecase' \| 'capitalize' \| 'kebab' }) => string` | Reformats a string. `capitalize` upper-cases every word; `titlecase` upper-cases only the first letter; `kebab` replaces whitespace with hyphens. |
| `containsUUID` | `(input: string) => boolean` | Returns `true` when the string contains a v1–v5 UUID. |
| `sendHttpRequest` | `<TResponse, TBody>(options: AxiosRequestConfig<TBody>) => Promise<TResponse>` | Thin Axios wrapper that resolves to `response.data` and rethrows a normalized `{ ...errorBody, message }`. |
| `parsePhonenumber` | `(phoneNumber: string, options?: { throwUnfound?: boolean; defaultCountry?: CountryCode; defaultCallingCode?: string; extract?: boolean }) => PhoneNumber \| undefined` | Parses via `libphonenumber-js`, prefixing `+` when missing. Returns `undefined` on failure unless `throwUnfound` is set. |
| `sanitizeObject` | `<TData>({ data: TData; keysToRemove?: (keyof TData)[] }) => TData` | Recursively strips properties whose value is `undefined`, `null`, `''`, or the string `'undefined'`. |
| `generateDateInNumber` | `({ date?: string \| number \| Date; withSeparation?: boolean }) => string` | Compact numeric timestamp, e.g. `20240412010255666` or `20240412-010255666`. |
| `cloneDeep` | `<TData>(data: TData) => TData` | Deep clone via `structuredClone`; returns primitives unchanged. |
| `removeDuplicates` | `<TData extends any[]>(dataList: TData, property?: string[]) => TData` | De-duplicates an array; pass `property` keys to de-duplicate objects. |
| `sendMessageToTelegram` | `({ chatId: string; secret: string; message: string }) => Promise<unknown>` | Sends a Markdown message through the Telegram Bot API. |
| `encodeUrlComponent` | `<TData>(data: TData) => string` | `encodeURIComponent`, JSON-stringifying non-string input. |
| `decodeUrlComponent` | `<TType>(data: string) => TType` | Inverse of `encodeUrlComponent`; JSON-parses the result. |
| `xmlToJson` | `<TResponse>(xmlData: string, options: ParserOptions) => Promise<TResponse>` | Parses XML to an object with `xml2js`. |
| `jsonToXml` | `<TData>(dataObject: TData, options: BuilderOptions) => Promise<string>` | Builds an XML string from an object with `xml2js`. |
| `detectDuplicateProperties` | `<TObject>({ data: TObject; parentKey?: string }) => void` | Walks an object and throws a `CustomException` if the same dotted key path appears twice. |
| `compileHtmlWithHandlebar` | `<TData>({ data: TData; htmlString: string; compileOptions?: CompileOptions; runtimeOptions?: RuntimeOptions }) => string` | Compiles and renders a Handlebars template. |
| `printLog` | `(context: string, message: string, data?: any, options?: { prettify?: boolean; ignoreDate?: boolean }) => void` | Formatted `console.log` with optional ANSI colour and timestamp. |

```typescript
import { sanitizeObject, transformText, generateRandomId } from '@incloodsolutions/toolkit';

sanitizeObject({ data: { name: 'Ada', middleName: '', age: null } });
// => { name: 'Ada' }

transformText({ text: '  Scalable Systems  ', format: 'kebab', trim: true });
// => "Scalable-Systems"

generateRandomId({ length: 8, variant: 'alphanumeric' });
// => e.g. "a1b2c3d4"
```

### Validation schemas (Zod)

Ready-made [Zod](https://zod.dev) schemas for common fields. Some are exported as schema
instances; the configurable ones are exported as factory functions.

**Schema instances** — use directly:

`UuidValidationSchema`, `EmailValidationSchema`, `UrlValidationSchema`,
`DateTimeValidationSchema` (ISO datetime), `BooleanValidationSchema`.

**Factory functions** — call to get a schema:

| Factory | Defaults / notes |
| ------- | ---------------- |
| `PasswordValidationSchema(min = 6, max = 100)` | length-bounded string |
| `RequiredStringValidationSchema()` | trimmed, min length 1 |
| `NameValidationSchema(min = 2, max = 100)` | trimmed name |
| `FirstNameValidationSchema`, `LastNameValidationSchema` | aliases of `NameValidationSchema` |
| `UsernameValidationSchema()` | 3–30 chars, `[a-zA-Z0-9_]` |
| `PhoneNumberValidationSchema()` | 7–20 chars |
| `SlugValidationSchema()` | lowercase hyphenated slug |
| `HexColorValidationSchema()` | `#rgb` or `#rrggbb` |
| `OtpValidationSchema(length = 6)` | fixed-length digit string |
| `TokenValidationSchema()` | non-empty string |
| `DescriptionValidationSchema(max = 1000)` | trimmed, max length |
| `PositiveNumberValidationSchema()`, `NonNegativeNumberValidationSchema()` | number constraints |
| `PageValidationSchema()` | integer ≥ 1 |
| `PageSizeValidationSchema(max = 100)` | integer 1–max |
| `SearchQueryValidationSchema(max = 200)` | trimmed, max length |
| `CountryCodeValidationSchema()` | 2 chars, upper-cased (e.g. `NG`, `US`) |
| `CurrencyCodeValidationSchema()` | 3 chars, upper-cased (e.g. `NGN`, `USD`) |
| `LanguageCodeValidationSchema()` | 2–10 chars (e.g. `en`, `fr`) |
| `MimeTypeValidationSchema()` | e.g. `image/png` |
| `FileExtensionValidationSchema()` | e.g. `png`, `pdf` |
| `IpAddressValidationSchema()` | IPv4 or IPv6 |
| `LatitudeValidationSchema()` | number, −90 to 90 |
| `LongitudeValidationSchema()` | number, −180 to 180 |

```typescript
import { z } from 'zod';
import {
  EmailValidationSchema,
  PasswordValidationSchema,
  PageSizeValidationSchema,
} from '@incloodsolutions/toolkit';

const SignInSchema = z.object({
  email: EmailValidationSchema,
  password: PasswordValidationSchema(8, 64),
});

PageSizeValidationSchema(50).parse(200); // throws: greater than 50
```

### Validator predicates

Every predicate and sanitizer from the [`validator`](https://github.com/validatorjs/validator.js)
package is re-exported for convenience, including `isEmail`, `isURL`, `isUUID`, `isEmpty`,
`isJWT`, `isStrongPassword`, `isCreditCard`, `isMobilePhone`, `isMongoId`, `isSlug`,
`isHexColor`, `isIP`, `isISO8601`, `normalizeEmail`, `trim`, `escape`, `toDate`, and the
ISO-standard checks (`isISO31661Alpha2`, `isISO4217`, `isISO6391`, and so on). The
`validator` type namespace is re-exported as `ValidatorTypes`.

```typescript
import { isStrongPassword, normalizeEmail } from '@incloodsolutions/toolkit';

isStrongPassword('Sup3r$ecret'); // true
normalizeEmail('Dev@Inclood.IO'); // "dev@inclood.io"
```

### Interfaces and types

Reusable building blocks for domain models and API contracts.

**Base interfaces**

`IBaseId<TType>`, `IBaseName`, `IBaseEntityName<TEntity>`, `IBaseIsActive`,
`IBaseRoles<TType>`, `IBaseTimestamp<TType>`, `IBaseRecordProgress<TProgress>`,
`IBaseStatus<TStatus>`, `IBaseAmount<TType>`, `IBaseDescription`, `IBasePassword`,
`IBaseReferenceId<TType>`, `IBaseBusiness<TBusiness, TType>`, `IBaseStore<TStore, TType>`,
`IBaseCustomer<TCustomer, TType>`, `IBaseDelete<TDeleter, TType>` (soft-delete metadata),
`IBaseCreator<TCreator, TType>` (creation metadata), `IBaseEditor<TModifier, TType>`
(last-modified metadata), `IBaseEnableDebug`, `IBaseErrorResponse` (standard HTTP error body).

**Enums and types**

| Name | Description |
| ---- | ----------- |
| `AppEnvironmentEnum` | `QA`, `TEST`, `LOCAL`, `STAGING`, `PRODUCTION`, `DEVELOPMENT` |
| `AppEnvironmentType` | String-literal union of `AppEnvironmentEnum` values |
| `ObjectType<TValue, TKey>` | `Record<TKey, TValue>` with permissive defaults |
| `ExtractValueTypes<TEntity>` | Union of a type's value types |
| `SortOrderType` | `'ascending' \| 'descending'` |

```typescript
import type { IBaseId, IBaseCreator } from '@incloodsolutions/toolkit';
import { AppEnvironmentEnum } from '@incloodsolutions/toolkit';

interface User extends IBaseId, IBaseCreator {
  email: string;
}

const env = AppEnvironmentEnum.PRODUCTION;
```

---

## Development

```bash
npm install        # install dependencies
npm run build      # bundle ESM + CJS + types with tsup
npm run lint       # eslint --fix
npm run format     # prettier --write
npm test           # jest
npm run package    # build, then npm pack a tarball
```

Source layout:

| Path                  | Contents                                      |
| --------------------- | -------------------------------------------- |
| `src/error/`          | `CustomException`                            |
| `src/utility/`        | General-purpose helper functions            |
| `src/validator/`      | Zod schemas and re-exported `validator` API |
| `src/interface/`      | Shared interfaces, enums, and types         |
| `src/index.ts`        | Barrel file re-exporting every module       |

## Publishing

Releases are automated by the monorepo's `.github/workflows/publish.yml` workflow. Pushing
to the `publish-toolkit` branch bumps through the pipeline, which refuses to republish an
existing version, runs `npm run build`, and publishes with `--access=public`. Bump the
version locally first:

```bash
npm run version:patch   # npm version patch, no git tag
```

## License

[MIT](https://www.npmjs.com/package/@incloodsolutions/toolkit) © Inclood Solutions
