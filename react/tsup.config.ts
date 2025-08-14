import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"], // Main entry for your library
	format: ["esm", "cjs"], // Output both module types
	dts: true, // Generate .d.ts files
	sourcemap: true, // Source maps for debugging
	clean: true, // Remove dist before building
	minify: false, // Keep unminified for readability (set true for production)
	treeshake: true, // Remove unused code
	splitting: false, // Avoid code splitting for libraries
	external: ["react", "react-dom", "react-router-dom"] // Don't bundle peer deps
});
