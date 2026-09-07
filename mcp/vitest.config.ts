import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Tests live in test/ and exercise the public surface from src/.
		include: ['test/**/*.spec.ts'],
		environment: 'node',
		clearMocks: true,
	},
});
