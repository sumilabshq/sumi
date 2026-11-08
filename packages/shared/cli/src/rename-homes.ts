import fs from "node:fs";
import path from "node:path";
import { exportedConstsOf, rootCallOf } from "@widgetarium/eslint-plugin/babel-chain";
import { parsedSourceOf } from "@widgetarium/eslint-plugin/files";
import { jsonAt, workspacePackagesIn } from "@widgetarium/eslint-plugin/workspace";
import { z } from "zod";
import { SEGMENT_NAME } from "./scaffold-names.js";

export type IdentityMethod = "module" | "plugin";

export interface Home {
	readonly method: IdentityMethod;
	readonly folder: string;
	readonly file: string;
	readonly constant: string;
	readonly id: string;
}

export interface ContractList {
	readonly folder: string;
	readonly file: string;
	readonly modules: readonly string[];
}

const MODULE_FILE = "module.ts";
const PLUGIN_FILE = "src/plugin.ts";
const PLUGIN_LEVEL = "plugin";
const CONTRACT_LEVEL = "contract";
const CONTRACT_LIST_FILE = "sumi-contract.json";
const MODULE_SOURCES: readonly string[] = [
	MODULE_FILE,
	"generated/contract.ts",
	"generated/module.ts",
	"generated/server.ts",
	"server.ts",
];

const ContractListSchema = z.object({ modules: z.array(z.string()) });

export function homesIn(root: string): Home[] {
	return workspacePackagesIn(root).flatMap(({ folder, level }) => {
		const absolute = path.join(root, folder);
		const isPlugin = level === PLUGIN_LEVEL;
		const home = homeOf(absolute, isPlugin ? "plugin" : "module");
		return home === null ? [] : [home];
	});
}

export function contractListsIn(root: string): ContractList[] {
	return workspacePackagesIn(root)
		.filter(({ level }) => level === CONTRACT_LEVEL)
		.flatMap(({ folder }) => {
			const file = path.join(root, folder, CONTRACT_LIST_FILE);
			const parsed = ContractListSchema.safeParse(jsonAt(file));
			return parsed.success ? [{ folder: path.join(root, folder), file, modules: parsed.data.modules }] : [];
		});
}

export function sourcesOf(home: Home, lists: readonly ContractList[]): Set<string> {
	const listing = lists.filter(({ modules }) => modules.includes(home.id));
	return new Set([
		...MODULE_SOURCES.map((relative) => path.join(home.folder, relative)),
		...listing.flatMap(({ folder }) => [
			path.join(folder, "index.ts"),
			path.join(folder, "generated", `${home.id}.ts`),
		]),
	]);
}

function homeOf(folder: string, method: IdentityMethod): Home | null {
	const file = path.join(folder, method === "plugin" ? PLUGIN_FILE : MODULE_FILE);

	if (!fs.existsSync(file)) {
		return null;
	}

	const declared = exportedConstsOf(parsedSourceOf(file).body).flatMap(({ name, init }) => {
		const step = rootCallOf(init);
		const [id] = step?.call.arguments ?? [];
		const isIdentity = step?.method === method && id?.type === "StringLiteral" && SEGMENT_NAME.test(id.value);
		return isIdentity ? [{ constant: name, id: id.value }] : [];
	});
	const [only] = declared;

	if (only === undefined || declared.length > 1) {
		return null;
	}

	return {
		method,
		folder,
		file,
		...only,
	};
}
