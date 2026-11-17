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
| Use the core utilities, schemas, and types               | [`packages/toolkit/README.md`](./packages/toolkit/README.md)      |
| Build a Node.js / serverless backend                     | [`packages/node/README.md`](./packages/node/README.md)            |
| Build a React app                                        | [`packages/react/README.md`](./packages/react/README.md)          |
| Build an Angular app                                     | [`packages/angular/README.md`](./packages/angular/README.md)      |
| Define AWS infrastructure with CDK                       | [`packages/devkit/README.md`](./packages/devkit/README.md)        |
| Check the (unimplemented) MCP package's intended API      | [`packages/mcp/README.md`](./packages/mcp/README.md)              |

[`docs/AI-INDEX.md`](./docs/AI-INDEX.md) is a single flat index of **every** public export
(name, kind, signature, one-line description, source path). It is the fastest way for a
person or an AI assistant to answer "does this repo already have a helper for X, and where
does it live?".

---

## Packages

| Package | Directory | npm | Runtime | Status |
| ------- | --------- | --- | ------- | ------ |
| `@incloodsolutions/toolkit` | [`toolkit/`](./packages/toolkit) | [link](https://www.npmjs.com/package/@incloodsolutions/toolkit) | Any JS/TS (Node 18+) | Stable, actively used |
| `@incloodsolutions/node-toolkit` | [`node/`](./packages/node) | [link](https://www.npmjs.com/package/@incloodsolutions/node-toolkit) | Node.js 18+ | Active, some helpers are stubs |
| `@incloodsolutions/react-toolkit` | [`react/`](./packages/react) | [link](https://www.npmjs.com/package/@incloodsolutions/react-toolkit) | React 18+ | Active, small surface |
| `@incloodsolutions/devkit` | [`devkit/`](./packages/devkit) | [link](https://www.npmjs.com/package/@incloodsolutions/devkit) | Node.js + AWS CDK v2 | Active, AWS CDK constructs only |
| `@incloodsolutions/angular-toolkit` | [`angular/`](./packages/angular) | [link](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit) | Angular 21+ | Placeholder, not yet functional |
| `@incloodsolutions/mcp` | [`mcp/`](./packages/mcp) | [link](https://www.npmjs.com/package/@incloodsolutions/mcp) | Any JS/TS (Node 18+) | Placeholder — `src/index.ts` is empty, builds export nothing |

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

- AWS SDK v3 wrappers for S3, SES, SNS, SSM Parameter Store, and DynamoDB (a document-client
  CRUD wrapper with Zod schema validation).
- Serverless adapters: run an Express or NestJS app as an AWS Lambda or GCP Function handler.
- MongoDB/Mongoose: cached connection for serverless, schema factory, ObjectId normalisers.
- Crypto (`crypto-js`, `bcryptjs`), env-var loading without `dotenv`, request logging with
  `morgan`, QR/barcode generation, class-validator/class-transformer helpers, API response
  helpers.

### `@incloodsolutions/react-toolkit`

A small React layer:

- Hooks: `useKeyEvent`, `usePageMetadata`.
- Utilities: `parseClassnames` (clsx + tailwind-merge), `getScreenSize`.
- Form resolver helpers for `react-hook-form` (zod, class-validator).
- Re-exports the entire `usehooks-ts` API and a large slice of `react-use`.

### `@incloodsolutions/devkit`

AWS CDK v2 "Base" constructs with sensible defaults — Lambda, Lambda layer, both REST and
HTTP API Gateway, WebSocket API, DynamoDB, S3, S3 + CloudFront static-site deployment,
CloudFront, CloudWatch log group, SNS, SQS, EventBridge, VPC, IAM role/policy, and two
Lambda authorizer variants.

### `@incloodsolutions/angular-toolkit`

Currently a published placeholder (`StorageService` is an empty injectable). Not ready for
use.

### `@incloodsolutions/mcp`

Currently a published placeholder — `src/index.ts` is empty, so a build exports nothing.
The README documents an intended API (mirroring `toolkit/`'s) that is not yet implemented.

---

## Getting started

Each package is installed independently by consumers:

```bash
npm install @incloodsolutions/toolkit
npm install @incloodsolutions/node-toolkit
npm install @incloodsolutions/react-toolkit
npm install @incloodsolutions/devkit
```

## Repository layout

This is a [Turborepo](https://turborepo.com) monorepo on npm workspaces.

```
incloodsolutions-toolkit/
├── package.json          # workspace root (private): `workspaces: ["packages/*"]`, turbo scripts
├── package-lock.json     # the single lockfile for every package
├── turbo.json            # task graph: build, test, lint, format, ...
├── packages/
│   ├── toolkit/          # @incloodsolutions/toolkit         (core)
│   ├── node/             # @incloodsolutions/node-toolkit
│   ├── react/            # @incloodsolutions/react-toolkit
│   ├── devkit/           # @incloodsolutions/devkit
│   ├── angular/          # angular-toolkit (ng-packagr workspace; publishes @incloodsolutions/angular-toolkit)
│   └── mcp/              # @incloodsolutions/mcp              (placeholder, empty entry point)
├── shared/               # tsup base config shared by packages
├── docs/AI-INDEX.md      # flat index of every export in every package
└── .github/workflows/    # publish.yml
```

Package names and folder names are unchanged from before the move; they now live under
`packages/`. `@incloodsolutions/toolkit` is a dependency of `node`, `devkit`, `react` and
`mcp`: while the version in `packages/toolkit` satisfies their range, npm links the local
copy instead of downloading it, and Turborepo builds `toolkit` first.

## Working in the monorepo

Install once, at the repo root (never inside a package):

```bash
npm install
```

Then run tasks across everything, or one package, with Turborepo:

```bash
npm run build                                  # turbo run build (dependencies first, cached)
npm test                                       # turbo run test (builds first where needed)
npx turbo run build --filter=@incloodsolutions/node-toolkit   # one package and what it needs
npx turbo run test --filter=./packages/react
```

Each package still has its own `build`, `test`, `lint`, `format` and `clean` scripts, so you can
also `cd packages/<name>` and run `npm run <script>`.

## Code style

Every package uses [Prettier](https://prettier.io) with a shared configuration —
tab indentation, single quotes, trailing commas (`useTabs: true`, `singleQuote: true`,
`trailingComma: "all"`). `toolkit/`, `node/`, `react/`, and `devkit/` each carry a
`.prettierrc`; `angular/` keeps the Prettier config that its CLI scaffold placed in
`package.json`. Format everything, or one package, with:

```bash
npm run format                           # turbo run format, every package
cd packages/node && npm run format       # just one
```

Run it before committing.

## Building and publishing

`toolkit/`, `node/`, `devkit/`, and `react/` share one build tool: `npm run build` =
**`tsup`**, emitting ESM (`.js`) and — for the three non-React packages — CommonJS
(`.cjs`) plus bundled declarations (`.d.ts`, `dts: true`), with source maps.

`toolkit/`, `node/`, and `devkit/` build **one bundle per module (and sub-module /
construct)** and have **no package-root export** — consumers import a subpath
(`@incloodsolutions/toolkit/utility`, `@incloodsolutions/node-toolkit/mongo`,
`@incloodsolutions/devkit/aws-cdk/lambda`) so nothing pulls the whole package by accident;
`import from '@incloodsolutions/toolkit'` (or `node-toolkit`/`devkit`) itself does not
resolve. `react/` works the same way (`@incloodsolutions/react-toolkit/hooks`, `/utilities`,
`/validators`, `/types`), but is ESM-only. Each `tsup.config.ts` `entry` map lines up with the
`exports` + `typesVersions` in its `package.json`.

All four are on **TypeScript 6** (`typescript@^6.0.3`) — this is the version tsup's bundled
declaration bundler supports, so nothing extra is needed on top of tsup. Their `tsconfig.json`
uses `moduleResolution: "bundler"` + `customConditions: ["node"]` (so `exports` maps and
`node`-only type entrypoints such as `bwip-js` resolve) and `ignoreDeprecations: "6.0"`.
`react/` is ESM-only by design. `angular/` builds with `ng-packagr`.

`npm run package` in any package runs its build and then `npm pack` to produce a
publishable tarball — use it to verify a package before release.

Releases are automated by [`.github/workflows/publish.yml`](./.github/workflows/publish.yml).
Pushing a branch named `publish-<package-dir>` (for example `publish-toolkit`,
`publish-node`, `publish-react`, `publish-devkit`) triggers a job that refuses to republish
an existing version, runs `npm ci` at the repo root, builds that package with
`turbo run build --filter=./packages/<package-dir>` (its workspace dependencies are built
first), and runs `npm publish --access=public` in `packages/<package-dir>`. Bump the version
in the package's `package.json` before pushing. When a release needs a new version of
`@incloodsolutions/toolkit`, publish `toolkit` first: the other packages depend on it by
version range.

## Contributing

Issues and pull requests are welcome. When you add or change an export, update the package
README **and** [`docs/AI-INDEX.md`](./docs/AI-INDEX.md) in the same change so the index
stays authoritative.

## License

MIT for every package in this repository.
