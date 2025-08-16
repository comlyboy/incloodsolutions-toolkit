
// // import { defineConfig, UserConfig } from 'vite';
// // import react from '@vitejs/plugin-react-swc';
// // import { ManifestOptions, VitePWA, VitePWAOptions } from 'vite-plugin-pwa';

// import { ViteModeType } from '../types';

// export function getViteConfiguration({ viteOptions, pwaOptions, appOptions, options }: {
// 	viteOptions?: UserConfig;
// 	// viteOptions: Omit<UserConfig, 'build'> & {
// 	// build?: Omit<BuildEnvironmentOptions, 'rollupOptions'> & {
// 	// rollupOptions?: Omit<BuildEnvironmentOptions['rollupOptions'], 'output'>;
// 	// }
// 	// };
// 	pwaOptions?: Partial<Omit<VitePWAOptions, 'manifest'>> & { manifest?: Partial<ManifestOptions>; };
// 	appOptions?: {
// 		name?: string;
// 		environment?: {
// 			variableName?: string;
// 			variableValues?: { mode: ViteModeType; value: string; }[];
// 		};
// 	};
// 	options?: {
// 		reactSwc?: Record<string, any>;
// 		enableDebug?: boolean;
// 	}

// } = {}) {

// 	// return defineConfig(configuration => {
// 	// 	let config: UserConfig = {};
// 	// 	const timestamp = Date.now();
// 	// 	const configMode = configuration.mode as ViteModeType || 'development';
// 	// 	let envVariableName = appOptions?.environment?.variableName
// 	// 	const envVariableValues = appOptions?.environment?.variableValues || [];

// 	// 	if (envVariableName && envVariableValues.some(e => e.mode === configMode)) {
// 	// 		config.define = {
// 	// 			[envVariableName]: JSON.stringify(envVariableValues.find(e => e.mode === configMode)?.value)
// 	// 		};
// 	// 	}

// 	// 	const reactPlugin = react({ ...options?.reactSwc, tsDecorators: true });

// 	// 	const pwaPlugin = VitePWA({
// 	// 		...pwaOptions,
// 	// 		injectRegister: pwaOptions?.injectRegister || 'auto',
// 	// 		registerType: pwaOptions?.registerType || 'autoUpdate',
// 	// 		srcDir: pwaOptions?.srcDir || 'src',
// 	// 		mode: configMode === 'production' ? 'production' : 'development',
// 	// 		manifest: {
// 	// 			...pwaOptions?.manifest,
// 	// 			name: pwaOptions?.manifest?.name || appOptions?.name,
// 	// 			short_name: pwaOptions?.manifest?.short_name || appOptions?.name,
// 	// 			start_url: pwaOptions?.manifest?.start_url || '/',
// 	// 			display_override: pwaOptions?.manifest?.display_override || ['browser', 'standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']
// 	// 		},
// 	// 		workbox: { ...pwaOptions?.workbox, cleanupOutdatedCaches: true }
// 	// 	});

// 	// 	console.log('starting...');

// 	// 	// const entryFileNames = viteOptions?.build?.rollupOptions?.output && !Array.isArray(viteOptions?.build?.rollupOptions?.output) ? [viteOptions?.build?.rollupOptions?.output] : viteOptions?.build?.rollupOptions?.output! as any[];

// 	// 	try {
// 	// 		console.log('start setting config');

// 	// 		config = {
// 	// 			...config,
// 	// 			...viteOptions,
// 	// 			plugins: [...(viteOptions?.plugins || []), reactPlugin, pwaPlugin],
// 	// 			build: {
// 	// 				...viteOptions?.build,
// 	// 				sourcemap: true,
// 	// 				rollupOptions: {
// 	// 					...viteOptions?.build?.rollupOptions,
// 	// 					treeshake: viteOptions?.build?.rollupOptions?.treeshake || 'smallest',
// 	// 					output: {
// 	// 						...viteOptions?.build?.rollupOptions?.output,
// 	// 						entryFileNames: (viteOptions?.build?.rollupOptions?.output as any)?.entryFileNames || `assets/[name]-${timestamp}-[hash].js`,
// 	// 						chunkFileNames: (viteOptions?.build?.rollupOptions?.output as any)?.chunkFileNames || `assets/[name]-${timestamp}-[hash].js`,
// 	// 						assetFileNames: (viteOptions?.build?.rollupOptions?.output as any)?.assetFileNames || `assets/[name]-${timestamp}-[hash].[ext]`,
// 	// 						manualChunks: (moduleId) => {
// 	// 							// if (moduleId.includes('node_modules')) {
// 	// 							// 	const match = moduleId.match(/node_modules\/((@[^/]+\/)?[^/]+)/)
// 	// 							// 	if (!match) return
// 	// 							// 	const packageName = match[1].replace('/', '-').replace('@', '-');
// 	// 							// 	usageMap.set(packageName, (usageMap.get(packageName) || 0) + 1)
// 	// 							// 	const count = usageMap.get(packageName)!
// 	// 							// 	return count >= 2 ? `chunk-${packageName}` : 'chunk-common';
// 	// 							// }
// 	// 							if (moduleId.includes('node_modules')) {
// 	// 								const parts = moduleId.toString().split('node_modules/')[1].split('/');
// 	// 								const packageName = parts[0].startsWith('@') ? `${parts[0]}-${parts[1]}` : parts[0];
// 	// 								return `chunk-${packageName}`.replace('@', '-');
// 	// 							}
// 	// 						}
// 	// 					}
// 	// 				}
// 	// 			}
// 	// 		};
// 	// 		console.log('ended setting config');
// 	// 	} catch (error) {
// 	// 		console.log('error', error);
// 	// 	}
// 	// 	console.log('config', config);
// 	// 	return config;
// 	// });
// }
