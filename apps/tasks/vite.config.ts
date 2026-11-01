import path from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { writeCoreSheet } from "./scripts/core-sheet.ts";

const LINKED_SHELL = path.resolve(import.meta.dirname, "../..");
const SHELL_PACKAGE = "@widgetarium/";
const SOURCE_CONDITIONS = ["source", "module", "browser", "development|production"];

// TRADE-OFF: SUMI_SHELL builds against another shell checkout by resolving @widgetarium/* from it; gone once the domain moves here
function shellFrom(root: string): Plugin {
	return {
		name: "sumi-shell",
		enforce: "pre",
		resolveId(source, _importer, options) {
			if (!source.startsWith(SHELL_PACKAGE)) {
				return null;
			}

			return this.resolve(source, path.join(root, "package.json"), {
				...options,
				skipSelf: true,
			});
		},
	};
}

const shellRoot = process.env["SUMI_SHELL"];
const shell = shellRoot === undefined ? LINKED_SHELL : path.resolve(shellRoot);

export default defineConfig({
	base: "./",
	plugins: shellRoot === undefined ? [] : [shellFrom(shell)],
	resolve: {
		alias: [
			{
				find: /^@widgetarium\/core\/styles\.css$/,
				replacement: await writeCoreSheet(shell, path.join(import.meta.dirname, "node_modules/.sumi/core-styles.css")),
			},
		],
		conditions: SOURCE_CONDITIONS,
		dedupe: ["react", "react-dom", "zod", "@tanstack/react-query"],
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
			allow: [shell],
		},
	},
});
