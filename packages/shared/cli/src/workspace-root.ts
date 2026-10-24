import fs from "node:fs";
import path from "node:path";
import { jsonAt, workspacePackagesIn } from "@widgetarium/eslint-plugin/workspace";
import { z } from "zod";
import { CliRefusal } from "./cli-output.js";

export type ModuleLayer = "domain" | "state";

export interface RootManifestChange {
	readonly text: string;
	readonly said: readonly string[];
}

const MANIFEST = "package.json";
const ANY_FOLDER = "/*";
const TYPES_SCRIPT = "test:types";
const TYPES_BUILD = "tsc -b ";
const NO_WORKSPACE =
	"no package.json with workspaces in {start} or above it; run widgetarium add inside the repository that holds packages/";
const NO_MODULE =
	"no module {module} in packages/domain or packages/state; create it first: widgetarium add module {module} --on Device";

export const LAYER_FOLDERS: Readonly<Record<ModuleLayer, string>> = {
	domain: "packages/domain",
	state: "packages/state",
};

const RootManifestSchema = z.looseObject({
	workspaces: z.array(z.string()),
	scripts: z.record(z.string(), z.string()).optional(),
});

type RootManifest = z.infer<typeof RootManifestSchema>;

export function workspaceRootAbove(start: string): string {
	if (RootManifestSchema.safeParse(jsonAt(path.join(start, MANIFEST))).success) {
		return start;
	}

	const parent = path.dirname(start);

	if (parent === start) {
		throw new CliRefusal(NO_WORKSPACE.replace("{start}", () => start));
	}

	return workspaceRootAbove(parent);
}

export function moduleFolderIn(root: string, module: string): string {
	const found = Object.values(LAYER_FOLDERS)
		.map((layer) => `${layer}/${module}`)
		.find((folder) => fs.existsSync(path.join(root, folder, "module.ts")));

	if (found === undefined) {
		throw new CliRefusal(NO_MODULE.replaceAll("{module}", () => module));
	}

	return found;
}

export function packageFolderNamed(root: string, name: string): string | null {
	return workspacePackagesIn(root).find((held) => held.name === name)?.folder ?? null;
}

export function rootManifestWith(root: string, folder: string): RootManifestChange {
	const manifest = RootManifestSchema.parse(jsonAt(path.join(root, MANIFEST)));
	const workspaces = isGlobbed(manifest.workspaces, folder) ? manifest.workspaces : [...manifest.workspaces, folder];
	const scripts = scriptsTypeChecking(manifest, folder);
	const said = [
		workspaces === manifest.workspaces ? null : `workspaces: added ${folder}`,
		scripts === manifest.scripts ? null : `${TYPES_SCRIPT}: added ${folder}`,
	].filter((line): line is string => line !== null);
	return {
		text: `${JSON.stringify({ ...manifest, workspaces, ...(scripts === undefined ? {} : { scripts }) }, null, "\t")}\n`,
		said,
	};
}

function isGlobbed(workspaces: readonly string[], folder: string): boolean {
	return workspaces.some(
		(pattern) =>
			pattern === folder ||
			(pattern.endsWith(ANY_FOLDER) && pattern.slice(0, -ANY_FOLDER.length) === path.posix.dirname(folder)),
	);
}

function scriptsTypeChecking(manifest: RootManifest, folder: string): RootManifest["scripts"] {
	const typesScript = manifest.scripts?.[TYPES_SCRIPT];

	if (typesScript === undefined || !typesScript.includes(TYPES_BUILD) || typesScript.split(/\s+/).includes(folder)) {
		return manifest.scripts;
	}

	return {
		...manifest.scripts,
		[TYPES_SCRIPT]: typesScript.replace(TYPES_BUILD, () => `${TYPES_BUILD}${folder} `),
	};
}
