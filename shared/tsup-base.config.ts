export const tsupBaseConfig = {
	entry: ['src/index.ts'],
	format: ["cjs", "esm"],
	platform: 'node',
	target: "es2022",
	// `.d.ts` files are emitted by `tsc --emitDeclarationOnly` in each package's
	// build script, not by tsup. tsup's bundled rollup-plugin-dts does not work
	// with TypeScript 7.
	dts: false,
	clean: true,
	bundle: true,
	minify: false,
	sourcemap: true,
	keepNames: true,
	treeshake: true,
	splitting: false,
	external: ["tslib"],
	esbuildOptions(options: any) {
		options.keepNames = true;
		options.logLevel = 'error';
	}
} as const;