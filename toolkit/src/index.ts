/**
 * @packageDocumentation
 *
 * `@incloodsolutions/toolkit` — framework-agnostic core used by every other
 * IncloodSolutions toolkit.
 *
 * This barrel is **not** published — there is no package-root export. Import
 * each module from its own subpath instead:
 * - `@incloodsolutions/toolkit/constant`  — {@link ResponseMessageEnum}, standard user-facing response/error messages.
 * - `@incloodsolutions/toolkit/error`     — {@link CustomException}, an HTTP-status-aware `Error` subclass.
 * - `@incloodsolutions/toolkit/utility`   — ~20 helpers: text formatting, ID/date generation, deep clone,
 *                 object sanitising, phone parsing, XML/JSON, Handlebars, HTTP, logging,
 *                 fetching a public Google Sheet as CSV.
 * - `@incloodsolutions/toolkit/validator` — ready-made Zod schemas plus every predicate from the `validator` package.
 * - `@incloodsolutions/toolkit/interface` — shared base interfaces (`IBaseId`, `IBaseCreator`, ...), `AppEnvironmentEnum`,
 *                 and helper types (`ObjectType`, `SortOrderType`).
 *
 * This file is kept only as the internal barrel used by this package's own
 * tests. See `README.md` and `../docs/AI-INDEX.md` for the full catalogue.
 */

export * from './constant';
export * from './error';
export * from './utility';
export * from './validator';
export * from './interface';
