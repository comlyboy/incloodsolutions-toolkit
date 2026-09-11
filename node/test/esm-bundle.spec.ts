/**
 * Regression guard for the published bundles' ESM compatibility.
 *
 * `@incloodsolutions/node-toolkit` has NO package-root export — it publishes one
 * bundle per module and per sub-module, each its own subpath entry. Every
 * dependency is kept EXTERNAL, so each `dist/*.js` keeps the source's `import`
 * statements verbatim. Ways that can break a real ESM runtime (Node ESM, NestJS,
 * Vite):
 *
 *   1. Named imports from a CJS-only dependency (e.g. `crypto-js`) —
 *      `import { AES } from 'crypto-js'` — throw at load.
 *   2. A bundled CJS dependency doing `require(...)` — esbuild turns these into a
 *      `__require(...)` shim that throws under ESM.
 *   3. A static `import` of a package that is not a dependency (`express`) — Node
 *      ESM resolves every static import eagerly. `express` must be type-only.
 *
 * These tests only run when `dist/` has been built (`npm run build`).
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * subpath -> a function it must export (empty string = types-only, just assert it
 * loads). No `index`/`.` entry: the package root is intentionally not exported.
 */
const SUBPATH_ENTRIES: Record<string, string> = {
	aws: 'initS3ClientWrapper',
	gcp: 'initGcpFunctionHandler',
	mongo: 'initMongooseSchema',
	utility: 'encryptData',
	config: 'initEnvironmentVariables',
	interface: '',

	'aws-lambda': 'initLambdaFunctionHandler',
	'aws-cli': 'uploadToS3ViaCli',
	'aws-sdk': 'initS3ClientWrapper',
	'aws-sdk/s3': 'initS3ClientWrapper',
	'aws-sdk/ses': 'initSesClientWrapper',
	'aws-sdk/sns': 'initSnsClientWrapper',
	'aws-sdk/dynamo-db': 'initDynamoDbClientWrapper',
	'aws-sdk/event-bridge': 'initEventBridgeClientWrapper',
};

const dist = (name: string) =>
	fileURLToPath(new URL(`../dist/${name}.js`, import.meta.url));

const built = existsSync(dist('utility'));
const suite = built ? describe : describe.skip;

const CJS_ONLY_DEPS = ['crypto-js'];

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

		it(`${name}: no unresolved dynamic requires, no eager express, no named CJS-only imports`, () => {
			const src = readFileSync(file, 'utf8');
			expect(src).not.toMatch(/__require\(["']/);
			expect(src).not.toMatch(/from ['"]express['"]/);
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
				expect(typeof mod[expectedExport]).toBe('function');
			} else {
				expect(mod).toBeTypeOf('object');
			}
		});
	}

	it('aws entry does not bundle mongoose or bwip-js', () => {
		const src = readFileSync(dist('aws'), 'utf8');
		expect(src).not.toMatch(/from ['"]mongoose['"]/);
		expect(src).not.toMatch(/from ['"]bwip-js['"]/);
	});

	it('aws-sdk/s3 entry pulls only the S3 client — not DynamoDB, Zod, or class-validator', () => {
		const src = readFileSync(dist('aws-sdk/s3'), 'utf8');
		expect(src).toMatch(/from ['"]@aws-sdk\/client-s3['"]/);
		expect(src).not.toMatch(/@aws-sdk\/client-dynamodb/);
		expect(src).not.toMatch(/from ['"]zod['"]/);
		expect(src).not.toMatch(/from ['"]class-validator['"]/);
	});
});
