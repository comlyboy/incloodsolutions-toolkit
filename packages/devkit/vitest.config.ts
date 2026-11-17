import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.spec.ts'],
		environment: 'node',
		clearMocks: true,
		// CDK synthesis is slower than a unit test; give it room.
		testTimeout: 20_000,
		// `@incloodsolutions/toolkit` ships an unbundled ESM entry importing
		// CJS-only `handlebars` — inline it so Vitest's transform handles interop.
		server: {
			deps: {
				inline: ['@incloodsolutions/toolkit', 'handlebars', 'xml2js'],
			},
		},
	},
});
