
import { defineConfig, UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { ManifestOptions, VitePWA, VitePWAOptions } from 'vite-plugin-pwa';

export type ViteModeType = 'development' | 'staging' | 'production';

export function getViteConfiguration({ viteOptions, pwaOptions, appOptions, options }: {
	viteOptions: UserConfig;
	// viteOptions: Omit<UserConfig, 'build'> & {
	// build?: Omit<BuildEnvironmentOptions, 'rollupOptions'> & {
	// rollupOptions?: Omit<BuildEnvironmentOptions['rollupOptions'], 'output'>;
	// }
	// };
	pwaOptions?: Partial<Omit<VitePWAOptions, 'manifest'>> & { manifest?: Partial<ManifestOptions>; };
	appOptions?: {
		name?: string;
		environment?: {
			variableName?: string;
			variableValues?: { mode: ViteModeType; value: string; }[];
		};
	};
	options?: {
		reactSwc?: Record<string, any>;
	}
}) {

	return defineConfig(configuration => {
		const timestamp = Date.now();
		const configMode = configuration.mode as ViteModeType || 'development';
		appOptions!.environment!.variableValues = appOptions?.environment?.variableValues || [];

		const define = viteOptions.define!;
		if (appOptions?.environment?.variableName && appOptions.environment.variableValues.some(e => e.mode === configMode)) {
			define[appOptions.environment.variableName] = JSON.stringify(appOptions?.environment?.variableValues.find(e => e.mode === configMode)?.value);
		}

		// const entryFileNames = viteOptions?.build?.rollupOptions?.output && !Array.isArray(viteOptions?.build?.rollupOptions?.output) ? [viteOptions?.build?.rollupOptions?.output] : viteOptions?.build?.rollupOptions?.output! as any[];

		return {
			...viteOptions,
			define,
			plugins: [
				...viteOptions.plugins!,
				react({ ...options?.reactSwc, tsDecorators: true }),
				VitePWA({
					...pwaOptions,
					injectRegister: pwaOptions?.injectRegister || 'auto',
					registerType: pwaOptions?.registerType || 'autoUpdate',
					srcDir: pwaOptions?.srcDir || 'src',
					mode: configMode === 'production' ? 'production' : 'development',
					manifest: {
						...pwaOptions?.manifest,
						name: pwaOptions?.manifest?.name || appOptions?.name,
						short_name: pwaOptions?.manifest?.short_name || appOptions?.name,
						start_url: pwaOptions?.manifest?.start_url || '/',
						display_override: pwaOptions?.manifest?.display_override || ['browser', 'standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
					},
					workbox: { ...pwaOptions?.workbox, cleanupOutdatedCaches: true }
				})
			],
			build: {
				...viteOptions?.build,
				sourcemap: true,
				rollupOptions: {
					...viteOptions?.build?.rollupOptions,
					treeshake: viteOptions?.build?.rollupOptions?.treeshake || 'smallest',
					output: {
						...viteOptions?.build?.rollupOptions?.output,
						entryFileNames: (viteOptions?.build?.rollupOptions?.output as any).entryFileNames || `assets/[name]-${timestamp}-[hash].js`,
						chunkFileNames: (viteOptions?.build?.rollupOptions?.output as any).chunkFileNames || `assets/[name]-${timestamp}-[hash].js`,
						assetFileNames: (viteOptions?.build?.rollupOptions?.output as any).assetFileNames || `assets/[name]-${timestamp}-[hash].[ext]`,
						manualChunks: (moduleId) => {
							if (moduleId.includes('node_modules')) {
								const parts = moduleId.toString().split('node_modules/')[1].split('/');
								const packageName = parts[0].startsWith('@') ? `${parts[0]}-${parts[1]}` : parts[0];
								return `chunk-${packageName}`.replace('@', '-');
							}
						}
					}
				}
			}
		};
	});
}
