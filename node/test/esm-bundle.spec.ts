/**
 * Regression guard for the published bundle's ESM compatibility.
 *
 * `@incloodsolutions/node-toolkit` ships `dist/index.js` as ESM. Two ways it can
 * break a real ESM runtime (Node ESM, NestJS 12, Vite):
 *
 *   1. Named imports from a CJS-only dependency (e.g. `crypto-js`) —
 *      `import { AES } from 'crypto-js'` — throw
 *      `SyntaxError: ... does not provide an export named 'AES'`.
 *   2. A bundled CJS dependency doing `require('fs')` — esbuild turns these into
 *      a `__require(...)` shim that throws
 *      `Dynamic require of "fs" is not supported` under ESM. `mongoose` /
 *      `express` must stay external (they are `peerDependencies`).
 *
 * These tests only run when `dist/` has been built (`npm run build`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const distEsm = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const built = existsSync(distEsm);
const suite = built ? describe : describe.skip;

const CJS_ONLY_DEPS = ['crypto-js'];

suite('published ESM bundle (dist/index.js)', () => {
	const source = () => readFileSync(distEsm, 'utf8');

	it('does not use named imports from CJS-only dependencies', () => {
		for (const dep of CJS_ONLY_DEPS) {
			expect(
				source(),
				`dist/index.js has \`import { ... } from '${dep}'\` — use a default import`,
			).not.toMatch(
				new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${dep}['"]`),
			);
		}
	});

	it('contains no unresolved dynamic requires (mongoose/express stay external)', () => {
		expect(source()).not.toMatch(/__require\(["']/);
	});

	it('loads as ESM', async () => {
		const mod = await import(distEsm);
		expect(typeof mod.encryptData).toBe('function');
		expect(typeof mod.initS3ClientWrapper).toBe('function');
	});
});
