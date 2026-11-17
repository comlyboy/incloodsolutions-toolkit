# @incloodsolutions/angular-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/angular-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/angular-toolkit)

Angular utilities and services that build on [`@incloodsolutions/toolkit`](../toolkit).

> **Status: placeholder.** This package is published so the name is reserved, but it has no
> usable API yet. The only export is an empty `StorageService`. Do not depend on it in
> production. For a current index of what every package exports, see
> [`../docs/AI-INDEX.md`](../docs/AI-INDEX.md).

---

## Layout

This directory is an Angular CLI workspace built with `ng-packagr`.

| Path | Purpose |
| ---- | ------- |
| `angular/` | Angular CLI workspace (`angular.json`, tooling) |
| `angular/projects/toolkit/` | the publishable library (`@incloodsolutions/angular-toolkit`) |
| `angular/projects/toolkit/src/public-api.ts` | public entry point |
| `angular/projects/toolkit/src/lib/services/` | `StorageService` (stub) |

Peer dependencies: `@angular/common` and `@angular/core` `^21`.

## Current exports

| Symbol | Kind | Notes |
| ------ | ---- | ----- |
| `StorageService` | `@Injectable({ providedIn: 'root' })` | No members yet. |

## Building and formatting

```bash
cd angular
npm install
npm run build    # ng build  ->  dist/toolkit
npm run format   # prettier --write over projects/**/*.{ts,html}
```

Prettier config for this workspace lives in the `"prettier"` key of `package.json` (the
Angular CLI scaffold's defaults: 100-char width, single quotes, spaces, plus an `angular`
parser override for `.html`). This differs from the tab-based `.prettierrc` used by the
other packages, and that is intentional — this is a standard Angular workspace.

## Roadmap

Planned: an `UntilDestroy` / `untilDestroyed` decorator pair for RxJS subscription cleanup,
a working storage service, and shared RxJS operators. None of this is implemented yet.

## License

MIT © Inclood Solutions
