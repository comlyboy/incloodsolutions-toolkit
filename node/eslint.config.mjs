import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		languageOptions: {
			parserOptions: {
				// `src/**` is type-aware via `tsconfig.json`; `test/**` (not in that
				// tsconfig's `include`) falls back to an untyped default program
				// instead of erroring.
				projectService: {
					allowDefaultProject: ['test/**/*.ts'],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
);
