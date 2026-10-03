/**
 * Regression guard for the published bundles' ESM compatibility.
 *
 * `@incloodsolutions/toolkit` has NO package-root export — it publishes one
 * bundle per module, each its own subpath entry, with every runtime dependency
 * left external. If a CJS-only dependency (e.g. `handlebars`) is imported with
 * named bindings — `import { compile } from 'handlebars'` — the bundle loads
 * fine under CJS `require()` but throws
 * `SyntaxError: ... does not provide an export named 'compile'` in a real ESM
 * runtime (Node ESM, NestJS 12, Vite).
 *
 * These tests only run when `dist/` has been built (`npm run build`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** subpath -> a function it must export. */
const SUBPATH_ENTRIES: Record<string, string> = {
	constant: 'ResponseMessageEnum',
	error: 'CustomException',
	utility: 'compileHtmlWithHandlebar',
	validator: 'UuidValidationSchema',
	interface: '',
};

/** Runtime deps that are CJS-only and must be default-imported, not named. */
const CJS_ONLY_DEPS = ['handlebars'];

const dist = (name: string) =>
	fileURLToPath(new URL(`../dist/${name}.js`, import.meta.url));

const built = existsSync(dist('utility'));
const suite = built ? describe : describe.skip;

suite('published subpath entries', () => {
	it('package.json does not export the package root', () => {
		const pkg = JSON.parse(
			readFileSync(
				fileURLToPath(new URL('../package.json', import.meta.url)),
				'utf8',
			),
		);
		expect(pkg.exports['.']).toBeUndefined();
		expect(pkg.main).toBeUndefined();
		expect(pkg.module).toBeUndefined();
		expect(pkg.types).toBeUndefined();
	});

	for (const [name, expectedExport] of Object.entries(SUBPATH_ENTRIES)) {
		const file = dist(name);

		it(`${name}: built`, () => {
			expect(
				existsSync(file),
				`dist/${name}.js is missing — run npm run build`,
			).toBe(true);
		});

		it(`${name}: no unresolved dynamic requires, no named CJS-only imports`, () => {
			const src = readFileSync(file, 'utf8');
			expect(src).not.toMatch(/__require\(["']/);
			for (const dep of CJS_ONLY_DEPS) {
				expect(
					src,
					`dist/${name}.js has \`import { ... } from '${dep}'\` — use a default import`,
				).not.toMatch(
					new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${dep}['"]`),
				);
			}
		});

		it(`${name}: loads as ESM`, async () => {
			const mod = await import(file);
			if (expectedExport) {
				expect(typeof mod[expectedExport]).toBeDefined();
			} else {
				expect(mod).toBeTypeOf('object');
			}
		});
	}

	it('utility entry works end-to-end (handlebars-backed helper)', async () => {
		const mod = await import(dist('utility'));
		expect(
			mod.compileHtmlWithHandlebar({
				data: { name: 'Ada' },
				htmlString: 'Hi {{name}}',
			}),
		).toBe('Hi Ada');
	});

	it('constant entry does not pull in any runtime dependency', () => {
		const src = readFileSync(dist('constant'), 'utf8');
		expect(src).not.toMatch(/from ['"][a-z]/);
	});

	it('validator entry does not bundle axios, handlebars, or xml2js', () => {
		const src = readFileSync(dist('validator'), 'utf8');
		expect(src).not.toMatch(/from ['"]axios['"]/);
		expect(src).not.toMatch(/from ['"]handlebars['"]/);
		expect(src).not.toMatch(/from ['"]xml2js['"]/);
	});
});
