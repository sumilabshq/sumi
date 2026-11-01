import path from "node:path";
import { defineConfig } from "vite";
import { writeCoreSheet } from "./scripts/core-sheet.ts";

const NO_TAURI = path.join(import.meta.dirname, "src/no-tauri.ts");
const SHELL = path.resolve(import.meta.dirname, "../..");
const SOURCE_CONDITIONS = ["source", "module", "browser", "development|production"];

export default defineConfig({
	base: "./",
	resolve: {
		conditions: SOURCE_CONDITIONS,
		dedupe: ["react", "react-dom", "zod", "@tanstack/react-query"],
		alias: [
			{
				find: /^@tauri-apps\/api\/(core|event)$/,
				replacement: NO_TAURI,
			},
			{
				find: /^@widgetarium\/core\/styles\.css$/,
				replacement: await writeCoreSheet(SHELL, path.join(import.meta.dirname, "node_modules/.sumi/core-styles.css")),
			},
		],
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
		cors: true,
		fs: {
			allow: [SHELL],
		},
	},
});
