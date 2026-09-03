/**
 * @packageDocumentation
 *
 * `@incloodsolutions/react-toolkit` — a thin React layer over
 * `@incloodsolutions/toolkit`.
 *
 * Modules (all re-exported from the package root):
 * - `hooks`     — {@link useKeyEvent}, {@link usePageMetadata}, {@link useCustomNavigation},
 *                 **plus all of `usehooks-ts`** and a curated slice of `react-use`
 *                 (colliding names get a `2` suffix).
 * - `utilities` — {@link parseClassnames} (clsx + tailwind-merge), {@link getScreenSize}.
 * - `validators`— `react-hook-form` resolver wrappers for Zod / Joi / class-validator.
 * - `types`     — {@link ViteModeType}.
 * - `components`— {@link FormLayoutComponent}, a `react-hook-form`-bound `<form>` wrapper.
 *
 * See `README.md` and `../docs/AI-INDEX.md` for the full catalogue and known gaps.
 */

export * from './components';
export * from './hooks';
export * from './types';
export * from './utilities';
export * from './validators';
