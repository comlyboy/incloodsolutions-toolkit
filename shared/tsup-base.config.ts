export const tsupBaseConfig = {
	entry: ['src/index.ts'],
	format: ["cjs", "esm"],
	platform: 'node',
	target: "es2024",
	// Bundle the whole public type surface into a single `dist/index.d.ts`.
	dts: true,
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