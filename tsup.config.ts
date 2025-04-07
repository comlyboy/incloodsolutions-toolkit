import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/**/*.ts'],
	platform: 'node',
	splitting: false,
	sourcemap: true,
	clean: true,
	format: 'esm',
	bundle: false,
	tsconfig: './tsconfig.json'
});