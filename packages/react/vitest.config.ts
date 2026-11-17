import { defineConfig } from 'vitest/config';

// Explicit config so vitest does not pick up `vite.config.ts` (the library
// build config, which pulls in vite-plugin-dts and other build-only plugins).
export default defineConfig({
	test: {
		// Tests live in test/ and exercise the public surface from src/.
		include: ['test/**/*.spec.{ts,tsx}'],
		environment: 'jsdom',
		clearMocks: true,
	},
});
