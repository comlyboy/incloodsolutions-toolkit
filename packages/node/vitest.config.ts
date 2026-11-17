import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// `class-validator` / `class-transformer` use legacy decorators + metadata,
	// which esbuild (Vitest's default transform) cannot emit. SWC handles both.
	plugins: [
		swc.vite({
			jsc: {
				target: 'es2022',
				parser: { syntax: 'typescript', decorators: true },
				transform: { legacyDecorator: true, decoratorMetadata: true },
			},
		}),
	],
	test: {
		include: ['test/**/*.spec.ts'],
		environment: 'node',
		clearMocks: true,
		// `@incloodsolutions/toolkit` ships an unbundled ESM entry that does
		// `import { compile } from 'handlebars'` (a CJS-only module). Inlining it
		// (and the CJS deps it pulls) routes it through Vitest's transform so the
		// named CJS imports resolve.
		server: {
			deps: {
				inline: ['@incloodsolutions/toolkit', 'handlebars', 'xml2js'],
			},
		},
	},
});
