/**
 * Regression guard for the published bundle's ESM compatibility.
 *
 * `@incloodsolutions/toolkit` ships `dist/index.js` as ESM with its runtime
 * dependencies left external. If a CJS-only dependency (e.g. `handlebars`) is
 * imported with named bindings — `import { compile } from 'handlebars'` — the
 * bundle loads fine under CJS `require()` but throws
 * `SyntaxError: ... does not provide an export named 'compile'` in a real ESM
 * runtime (Node ESM, NestJS 12, Vite).
 *
 * These tests only run when `dist/` has been built (`npm run build`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const distEsm = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const built = existsSync(distEsm);
const suite = built ? describe : describe.skip;

/** Runtime deps that are CJS-only and must be default-imported, not named. */
const CJS_ONLY_DEPS = ['handlebars'];

suite('published ESM bundle (dist/index.js)', () => {
	it('does not use named imports from CJS-only dependencies', () => {
		const source = readFileSync(distEsm, 'utf8');
		for (const dep of CJS_ONLY_DEPS) {
			expect(
				source,
				`dist/index.js has \`import { ... } from '${dep}'\` — use a default import`,
			).not.toMatch(
				new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${dep}['"]`),
			);
		}
	});

	it('loads as ESM and its handlebars-backed helper works', async () => {
		const mod = await import(distEsm);
		expect(typeof mod.compileHtmlWithHandlebar).toBe('function');
		expect(
			mod.compileHtmlWithHandlebar({
				data: { name: 'Ada' },
				htmlString: 'Hi {{name}}',
			}),
		).toBe('Hi Ada');
	});
});
