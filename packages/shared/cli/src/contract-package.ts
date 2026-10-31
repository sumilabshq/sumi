import fs from "node:fs";
import path from "node:path";
import { jsonAt } from "@widgetarium/eslint-plugin/workspace";
import { moduleOfDomain } from "@widgetarium/eslint-plugin/domain-file";
import { z } from "zod";
import { CliRefusal } from "./cli-output.js";
import { moduleContractsOf } from "./module-contract.js";
import { moduleFolderIn, workspaceRootAbove } from "./workspace-root.js";

export interface ContractPackageFile {
	readonly entry: string;
	readonly text: string;
}

export const CONTRACT_LIST_FILE = "sumi-contract.json";

const ROOT_ENTRY = "index.ts";
const SCRIPT = /\.ts$/;
const NOT_LISTED = '{package}/{file} lists no modules; write it as { "modules": ["<module>"] }';
const NOT_A_REQUESTS_MODULE =
	"{module} has no generated contract to bundle: only a module(...) whose contract generate writes can be listed in {file}";

const ContractListSchema = z.object({
	modules: z.array(z.string().min(1)).min(1),
});

export function contractPackageFilesOf(folder: string, header: string): ContractPackageFile[] {
	const root = workspaceRootAbove(folder);
	const bundled = listedModulesOf(folder).map((module) => ({
		entry: `generated/${module}.ts`,
		text: header + contractTextOf(path.join(root, moduleFolderIn(root, module)), module),
	}));
	const reExported = [...bundled.map(({ entry }) => entry), ...ownFilesOf(folder)];
	return [
		...bundled,
		{
			entry: ROOT_ENTRY,
			text: header + reExported.map((entry) => `export * from "./${entry.replace(SCRIPT, ".js")}";\n`).join(""),
		},
	];
}

function listedModulesOf(folder: string): readonly string[] {
	const listed = ContractListSchema.safeParse(jsonAt(path.join(folder, CONTRACT_LIST_FILE)));

	if (!listed.success) {
		throw new CliRefusal(
			NOT_LISTED.replace("{package}", () => path.basename(folder)).replace("{file}", CONTRACT_LIST_FILE),
		);
	}

	return listed.data.modules;
}

function contractTextOf(moduleFolder: string, module: string): string {
	const declared = moduleOfDomain(moduleFolder);

	if (declared === null || declared.runs !== "anywhere") {
		throw new CliRefusal(NOT_A_REQUESTS_MODULE.replace("{module}", () => module).replace("{file}", CONTRACT_LIST_FILE));
	}

	return moduleContractsOf(moduleFolder, declared.name).contract;
}

function ownFilesOf(folder: string): string[] {
	return fs
		.readdirSync(folder)
		.filter((name) => SCRIPT.test(name) && name !== ROOT_ENTRY && !name.endsWith(".d.ts"))
		.sort();
}
