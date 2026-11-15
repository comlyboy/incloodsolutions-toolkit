/**
 * @packageDocumentation
 *
 * `@incloodsolutions/react-toolkit` — a thin React layer over
 * `@incloodsolutions/toolkit`.
 *
 * This barrel is **not** published: there is no package-root export. Import each module from its
 * own subpath instead (`@incloodsolutions/react-toolkit/hooks`, `.../utilities`, `.../validators`,
 * `.../types`).
 *
 * Modules:
 * - `hooks`     — {@link useKeyEvent}, {@link usePageMetadata},
 *                 **plus all of `usehooks-ts`** and a curated slice of `react-use`
 *                 (colliding names get a `2` suffix).
 * - `utilities` — {@link parseClassnames} (clsx + tailwind-merge), {@link getScreenSize}.
 * - `validators`— `react-hook-form` resolver wrappers for Zod / Joi / class-validator.
 * - `types`     — {@link ViteModeType}.
 *
 * `components` (`FormLayoutComponent`) has been removed; the line below is a dangling
 * reference to a deleted directory — see `README.md` and `../docs/AI-INDEX.md` for the
 * full catalogue and known gaps.
 */

// export * from './components';
export * from './hooks';
export * from './types';
export * from './utilities';
export * from './validators';
