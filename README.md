# IncloodSolutions Toolkits

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?logo=javascript&logoColor=000&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=fff&style=for-the-badge)
![React](https://img.shields.io/badge/ReactJs-61DAFB.svg?logo=react&logoColor=000&style=for-the-badge)
![Angular](https://img.shields.io/badge/Angular-%23DD0031.svg?logo=angular&logoColor=fff&style=for-the-badge)
![NodeJS](https://img.shields.io/badge/Node.js-6DA55F.svg?logo=node.js&logoColor=fff&style=for-the-badge)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF.svg?logo=github-actions&logoColor=fff&style=for-the-badge)
![npm](https://img.shields.io/badge/npm-CB3837.svg?logo=npm&logoColor=fff&style=for-the-badge)

A multi-package repository of open-source toolkits that share a common core and target
different runtimes: framework-agnostic JavaScript/TypeScript, Node.js backends, React apps,
Angular apps, and AWS CDK infrastructure. Every package is published to npm under the
`@incloodsolutions` scope.

Repository: <https://github.com/comlyboy/incloodsolutions-toolkit>

---

## Documentation map

| I want to...                                              | Read                                            |
| -------------------------------------------------------- | ----------------------------------------------- |
| Look up any exported symbol across all packages          | [`docs/AI-INDEX.md`](./docs/AI-INDEX.md)        |
| Use the core utilities, schemas, and types               | [`toolkit/README.md`](./toolkit/README.md)      |
| Build a Node.js / serverless backend                     | [`node/README.md`](./node/README.md)            |
| Build a React app                                        | [`react/README.md`](./react/README.md)          |
| Build an Angular app                                     | [`angular/README.md`](./angular/README.md)      |
| Define AWS infrastructure with CDK                       | [`devkit/README.md`](./devkit/README.md)        |

[`docs/AI-INDEX.md`](./docs/AI-INDEX.md) is a single flat index of **every** public export
(name, kind, signature, one-line description, source path). It is the fastest way for a
person or an AI assistant to answer "does this repo already have a helper for X, and where
does it live?".

---

## Packages

| Package | Directory | npm | Runtime | Status |
| ------- | --------- | --- | ------- | ------ |
| `@incloodsolutions/toolkit` | [`toolkit/`](./toolkit) | [link](https://www.npmjs.com/package/@incloodsolutions/toolkit) | Any JS/TS (Node 18+) | Stable, actively used |
| `@incloodsolutions/node-toolkit` | [`node/`](./node) | [link](https://www.npmjs.com/package/@incloodsolutions/node-toolkit) | Node.js 18+ | Active, some helpers are stubs |
| `@incloodsolutions/react-toolkit` | [`react/`](./react) | [link](https://www.npmjs.com/package/@incloodsolutions/react-toolkit) | React 18+ | Active, small surface |
| `@incloodsolutions/devkit` | [`devkit/`](./devkit) | [link](https://www.npmjs.com/package/@incloodsolutions/devkit) | Node.js + AWS CDK v2 | Active, AWS CDK constructs only |
| `@incloodsolutions/angular-toolkit` | [`angular/`](./angular) | [link](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit) | Angular 21+ | Placeholder, not yet functional |

### `@incloodsolutions/toolkit` — the core

Framework-agnostic building blocks that every other package depends on:

- `CustomException` — HTTP-status-aware error class.
- `ResponseMessageEnum` — standard user-facing response/error message strings.
- ~20 utility functions: text formatting, ID generation, deep clone, object sanitising,
  phone-number parsing, XML/JSON conversion, Handlebars templating, HTTP requests, logging,
  fetching a public Google Sheet as CSV.
- ~25 ready-made [Zod](https://zod.dev) validation schemas plus every predicate from
  [`validator`](https://github.com/validatorjs/validator.js).
- ~20 shared base interfaces (`IBaseId`, `IBaseCreator`, `IBaseDelete`, ...), the
  `AppEnvironmentEnum`, and helper types (`ObjectType`, `SortOrderType`).

### `@incloodsolutions/node-toolkit`

Server-side helpers built on the core:

- AWS SDK v3 wrappers for S3, SES, SNS, and DynamoDB (a document-client CRUD wrapper).
- Serverless adapters: run an Express or NestJS app as an AWS Lambda or GCP Function handler.
- MongoDB/Mongoose: cached connection for serverless, schema factory, ObjectId normalisers.
- Crypto (`crypto-js`, `bcryptjs`), env-var loading without `dotenv`, request logging with
  `morgan`, QR/barcode generation, class-validator/class-transformer helpers, API response
  helpers.

### `@incloodsolutions/react-toolkit`

A small React layer:

- Hooks: `useKeyEvent`, `usePageMetadata`, `useCustomNavigation` (React Router).
- Utilities: `parseClassnames` (clsx + tailwind-merge), `getScreenSize`.
- Form resolver helpers for `react-hook-form` (zod, joi, class-validator).
- Re-exports the entire `usehooks-ts` API and a large slice of `react-use`.

### `@incloodsolutions/devkit`

AWS CDK v2 "Base" constructs with sensible defaults — Lambda, Lambda layer, both REST and
HTTP API Gateway, WebSocket API, DynamoDB, S3, S3 + CloudFront static-site deployment,
CloudFront, CloudWatch log group, SNS, SQS, EventBridge, VPC, IAM role/policy, and two
Lambda authorizer variants.

### `@incloodsolutions/angular-toolkit`

Currently a published placeholder (`StorageService` is an empty injectable). Not ready for
use.

---

## Getting started

Each package is installed independently:

```bash
npm install @incloodsolutions/toolkit
npm install @incloodsolutions/node-toolkit
npm install @incloodsolutions/react-toolkit
npm install @incloodsolutions/devkit
```

## Repository layout

```
incloodsolutions-toolkit/
├── docs/AI-INDEX.md      # flat index of every export in every package
├── toolkit/              # @incloodsolutions/toolkit         (core)
├── node/                 # @incloodsolutions/node-toolkit
├── react/                # @incloodsolutions/react-toolkit
├── devkit/               # @incloodsolutions/devkit
├── angular/              # @incloodsolutions/angular-toolkit  (ng-packagr workspace)
├── shared/               # tsup base config shared by packages
└── .github/workflows/    # publish.yml
```

Each package is a self-contained npm project with its own `package.json`, `tsconfig`, and
build. There is no root workspace; run `npm install` inside the package you are working on.

## Code style

Every package uses [Prettier](https://prettier.io) with a shared configuration —
tab indentation, single quotes, trailing commas (`useTabs: true`, `singleQuote: true`,
`trailingComma: "all"`). `toolkit/`, `node/`, `react/`, and `devkit/` each carry a
`.prettierrc`; `angular/` keeps the Prettier config that its CLI scaffold placed in
`package.json`. Format a package with:

```bash
npm run format   # runs prettier --write over that package's sources
```

Run it before committing. (For `angular/`, run `npm install` first so Prettier is available.)

## Building and publishing

`toolkit/`, `node/`, `devkit/`, and `react/` share one build shape: a single `src/index.ts`
entry and `npm run build` = **`tsup`**. tsup bundles the JavaScript — `dist/index.js` (ESM)
and, for the three non-React packages, `dist/index.cjs` (CommonJS) — and rolls the whole
public type surface into a single bundled `dist/index.d.ts` (`dts: true`). `dist/` holds
just those files plus source maps: no per-folder declaration tree, and the single
`index.d.ts` has no relative re-exports to trip up strict-ESM consumers.

All four are on **TypeScript 6** (`typescript@^6.0.3`) — this is the version tsup's bundled
declaration bundler supports, so nothing extra is needed on top of tsup. Their `tsconfig.json`
uses `moduleResolution: "bundler"` + `customConditions: ["node"]` (so `exports` maps and
`node`-only type entrypoints such as `bwip-js` resolve) and `ignoreDeprecations: "6.0"`.
`react/` is ESM-only by design. `angular/` builds with `ng-packagr`.

`npm run package` in any package runs its build and then `npm pack` to produce a
publishable tarball — use it to verify a package before release.

Releases are automated by [`.github/workflows/publish.yml`](./.github/workflows/publish.yml).
Pushing a branch named `publish-<package-dir>` (for example `publish-toolkit`,
`publish-node`, `publish-react`, `publish-devkit`) triggers a job that installs, refuses to
republish an existing version, runs `npm run build`, and runs `npm publish --access=public`
in that directory. Bump the version in the package's `package.json` before pushing.

## Contributing

Issues and pull requests are welcome. When you add or change an export, update the package
README **and** [`docs/AI-INDEX.md`](./docs/AI-INDEX.md) in the same change so the index
stays authoritative.

## License

MIT for every package in this repository.
