/**
 * @packageDocumentation
 *
 * `@incloodsolutions/toolkit` — framework-agnostic core used by every other
 * IncloodSolutions toolkit.
 *
 * Modules (all re-exported from the package root):
 * - `constant`  — {@link ResponseMessageEnum}, standard user-facing response/error messages.
 * - `error`     — {@link CustomException}, an HTTP-status-aware `Error` subclass.
 * - `utility`   — ~20 helpers: text formatting, ID/date generation, deep clone,
 *                 object sanitising, phone parsing, XML/JSON, Handlebars, HTTP, logging,
 *                 fetching a public Google Sheet as CSV.
 * - `validator` — ready-made Zod schemas plus every predicate from the `validator` package.
 * - `interface` — shared base interfaces (`IBaseId`, `IBaseCreator`, ...), `AppEnvironmentEnum`,
 *                 and helper types (`ObjectType`, `SortOrderType`).
 *
 * See `README.md` and `../docs/AI-INDEX.md` for the full catalogue.
 */

export * from './constant';
export * from './error';
export * from './utility';
export * from './validator';
export * from './interface';
