import path from "node:path";
import { defineConfig } from "vite";

const DEV_PORT = 5211;
const SOURCE_CONDITIONS = ["source", "module", "browser", "development|production"];

export default defineConfig({
	base: "./",
	resolve: {
		conditions: SOURCE_CONDITIONS,
		dedupe: ["react", "react-dom", "zod"],
	},
	optimizeDeps: {
		exclude: ["@sumi/contract"],
	},
	ssr: {
		noExternal: ["@sumi/contract", "@widgetarium/core"],
		resolve: {
			conditions: SOURCE_CONDITIONS,
		},
	},
	esbuild: {
		jsx: "transform",
		jsxFactory: "h",
		jsxFragment: "Fragment",
	},
	server: {
		port: DEV_PORT,
		strictPort: true,
		cors: true,
		fs: {
			allow: [path.resolve(import.meta.dirname, "../..")],
		},
	},
});
