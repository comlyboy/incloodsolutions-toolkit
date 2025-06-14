import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/**/*.ts'],
	target: ['es2024'],
	platform: 'node',
	splitting: false,
	sourcemap: true,
	clean: true,
	format: ['esm', 'cjs'],
	bundle: false,
	tsconfig: './tsconfig.json'
});