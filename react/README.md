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

Peer dependencies: `react`, `react-dom`, `react-router-dom`. Bundled: `clsx`,
`tailwind-merge`, `react-hook-form`, `@hookform/resolvers`, `joi`, `zod`, `usehooks-ts`,
`react-use`.

## Own API

### Hooks

#### `useKeyEvent`

Run an action when a key or key-combination is pressed.

```typescript
import { useKeyEvent } from '@incloodsolutions/react-toolkit';

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

#### `useCustomNavigation`

A React Router wrapper that returns a single metadata object and a query-aware `navigate`.

```typescript
const nav = useCustomNavigation((info) => console.log('route changed', info.path), false);

nav.navigate('/users', { queries: { page: 2, tags: ['a', 'b'] }, replace: true });
// nav.path, nav.query, nav.params, nav.hash, nav.url, nav.fullUrl,
// nav.state, nav.data (loader), nav.matchedData, nav.navigationType
```

`onRouteChange` fires only on real route changes (it diffs a function-stripped snapshot).

### Utilities

```typescript
import { parseClassnames, getScreenSize } from '@incloodsolutions/react-toolkit';

parseClassnames('px-2 py-1', condition && 'bg-red-500', { hidden: !open });
// clsx + tailwind-merge: later Tailwind classes win

getScreenSize(); // 'mobile' (<768) | 'tablet' (<1024) | 'desktop'
```

### `react-hook-form` resolver helpers

```typescript
import { zodCustomResolver, joiCustomResolver, classValidatorCustomResolver } from '@incloodsolutions/react-toolkit';
import { useForm } from 'react-hook-form';

const form = useForm({ resolver: zodCustomResolver(MySchema, {}) });
```

## Re-exported hook libraries

`import ... from '@incloodsolutions/react-toolkit'` also gives you:

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

- **`useCustomReactHookForm` is not exported** — it exists in `src/hooks/useHookForm.ts`
  but is not re-exported by `src/hooks/index.ts`.
- `getViteConfiguration` (in `src/config`) and the emoji dataset (in `src/constant`) are
  commented out and export nothing.

## Development

```bash
npm install
npm run build    # tsup: bundles ESM + a single dist/index.d.ts
npm run format   # prettier --write over src/**/*.{ts,tsx} (tabs, single quotes)
npm run lint     # eslint --fix
npm test         # jest
npm run package  # build, then npm pack a tarball
```

The build has a single `src/index.ts` entry: `dist/` contains just `index.js` (ESM) and a
bundled `index.d.ts`, matching the other packages. Deep imports (`.../dist/hooks/...`) are
no longer emitted — everything is reachable from the package root.

## License

MIT © Inclood Solutions
