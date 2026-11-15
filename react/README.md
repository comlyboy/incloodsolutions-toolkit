# @incloodsolutions/react-toolkit

[![npm version](https://img.shields.io/npm/v/@incloodsolutions/react-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/react-toolkit)
[![npm downloads](https://img.shields.io/npm/dm/@incloodsolutions/react-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/react-toolkit)
[![license](https://img.shields.io/npm/l/@incloodsolutions/react-toolkit.svg?style=for-the-badge)](https://www.npmjs.com/package/@incloodsolutions/react-toolkit)

A thin React layer over [`@incloodsolutions/toolkit`](../toolkit): a few purpose-built
hooks and utilities, `react-hook-form` resolver helpers, and convenient re-exports of the
full [`usehooks-ts`](https://usehooks-ts.com) API plus a large slice of
[`react-use`](https://github.com/streamich/react-use).

> For a one-line index of every export in this package (and the other toolkits), see
> [`../docs/AI-INDEX.md`](../docs/AI-INDEX.md). Every exported hook, utility, and type also
> carries an inline TSDoc comment with parameter descriptions, default values, and examples.

---

## Installation

```bash
npm install @incloodsolutions/react-toolkit
```

Peer dependencies: `react`, `react-dom`. Bundled: `clsx`, `tailwind-merge`,
`react-hook-form`, `@hookform/resolvers`, `zod`, `usehooks-ts`, `react-use`
(`localforage` and `radix-ui` are also listed as dependencies but are currently unused —
leftover from the removed `components`/`config`/`constant` modules).

## Own API

### Hooks

#### `useKeyEvent`

Run an action when a key or key-combination is pressed.

```typescript
import { useKeyEvent } from '@incloodsolutions/react-toolkit/hooks';

useKeyEvent({
  combinations: { keys: ['Control', 's'], matchAll: true },
  eventType: 'keydown',
  returnedAction: () => save(),
});
```

#### `usePageMetadata`

Set the document title, `description`, Open Graph / Twitter card meta tags, and an optional
`document.body` background. Everything is reverted on unmount.

```typescript
usePageMetadata({
  title: 'Dashboard',
  description: 'Your account overview',
  ogImage: '/og.png',
  twitterCardType: 'summary_large_image',
});
```

#### `useCustomReactHookForm`

`react-hook-form`'s `useForm`, but `resolver` is a required first argument and `mode` defaults
to `'all'` (validate on blur, change, and submit) unless overridden.

```typescript
import { useCustomReactHookForm } from '@incloodsolutions/react-toolkit/hooks';
import { zodCustomResolver } from '@incloodsolutions/react-toolkit/validators';

const form = useCustomReactHookForm(zodCustomResolver(MySchema, {}), {
  defaultValues: { name: '' },
});
```

### Utilities

```typescript
import { parseClassnames, getScreenSize } from '@incloodsolutions/react-toolkit/utilities';

parseClassnames('px-2 py-1', condition && 'bg-red-500', { hidden: !open });
// clsx + tailwind-merge: later Tailwind classes win

getScreenSize(); // 'mobile' (<768) | 'tablet' (<1024) | 'desktop'
```

### `react-hook-form` resolver helpers

```typescript
import { zodCustomResolver, classValidatorCustomResolver } from '@incloodsolutions/react-toolkit/validators';
import { useForm } from 'react-hook-form';

const form = useForm({ resolver: zodCustomResolver(MySchema, {}) });
```

## Re-exported hook libraries

`import ... from '@incloodsolutions/react-toolkit/hooks'` also gives you:

- **All of `usehooks-ts`** — `useDebounceValue`, `useLocalStorage`, `useMediaQuery`,
  `useOnClickOutside`, `useEventListener`, `useIntersectionObserver`, `useCopyToClipboard`,
  and the rest.
- **Much of `react-use`** — `useAsync`, `useAsyncFn`, `useDebounce`, `useThrottle`,
  `useGeolocation`, `useBattery`, `useNetworkState`, `useMedia`, `useMeasure`,
  `useClickAway`, `useFullscreen`, `useIdle`, `usePrevious`, `createBreakpoint`,
  `createGlobalState`, and more.

Where names collide with `usehooks-ts`, the `react-use` version is exported with a `2`
suffix: `useBoolean2`, `useCounter2`, `useHover2`, `useInterval2`, `useCopyToClipboard2`.

## Known limitations in the current release

- **`components` (`FormLayoutComponent`) has been removed** — `src/components/` no longer
  exists, and `src/index.ts` still has a dangling `// export * from './components'` comment.
  The `useCustomNavigation` hook and the `src/config` (`getViteConfiguration`) and
  `src/constant` (emoji dataset) modules have likewise been deleted from the package.

## Development

```bash
npm install
npm run build    # tsup: one ESM bundle + .d.ts per subpath
npm run format   # prettier --write over src/**/*.{ts,tsx} (tabs, single quotes)
npm run lint     # eslint --fix
npm test         # jest
npm run package  # build, then npm pack a tarball
```

## Modular imports (tree-shaking)

There is **no package-root export**: `import ... from '@incloodsolutions/react-toolkit'` does
not resolve. Import the module you need, so you never pull all of `usehooks-ts` and
`react-use` by accident. The build emits one ESM bundle (and `.d.ts`) per module, with every
dependency left external. `tsup.config.ts` `entry` lines up with `exports` + `typesVersions` in
`package.json`.

| Subpath | Contents |
| ------- | -------- |
| `.../hooks` | `useKeyEvent`, `usePageMetadata`, `useCustomReactHookForm`, all of `usehooks-ts`, and a slice of `react-use` |
| `.../utilities` | `parseClassnames`, `getScreenSize` |
| `.../validators` | `zodCustomResolver`, `classValidatorCustomResolver`, the login schemas |
| `.../types` | `ViteModeType` |

## License

MIT © Inclood Solutions
