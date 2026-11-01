import path from "node:path";
import { defineConfig } from "vite";
import { writeCoreSheet } from "./scripts/core-sheet.ts";

const DEV_PORT = 5212;
const SHELL = path.resolve(import.meta.dirname, "../..");
const SOURCE_CONDITIONS = ["source", "module", "browser", "development|production"];

export default defineConfig({
	base: "./",
	resolve: {
		alias: [
			{
				find: /^@widgetarium\/core\/styles\.css$/,
				replacement: await writeCoreSheet(SHELL, path.join(import.meta.dirname, "node_modules/.sumi/core-styles.css")),
			},
		],
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
			allow: [SHELL],
		},
	},
});
