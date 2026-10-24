import fs from "node:fs";
import path from "node:path";
import { jsonAt } from "@widgetarium/eslint-plugin/workspace";
import { z } from "zod";
import type { PlannedFile } from "./add-plan.js";
import type { AddModuleArgs } from "./scaffold-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { runGenerate } from "./generate-command.js";
import { moduleFilesOf, type ModuleLicense, type PackageVersions } from "./module-files.js";
import { formatFiles } from "./project-format.js";
import { writeFile } from "./template-files.js";
import { LAYER_FOLDERS, packageFolderNamed, rootManifestWith, workspaceRootAbove } from "./workspace-root.js";

const CORE_MANIFEST = "packages/shared/core/package.json";
const LICENSE_FILE = "LICENSE";
const TAKEN_FOLDER =
	"{folder} already exists: pick another module name, or add a feature to it: widgetarium add feature {name}/<feature>";
const TAKEN_PACKAGE = "{package} already names {folder}: pick another module name";
const NO_CORE = "no {file} with a version and a zod dependency: add module runs inside the widgetarium repository";

const CoreManifestSchema = z.object({
	version: z.string(),
	dependencies: z.object({ zod: z.string() }),
});

const LicensedManifestSchema = z.object({ license: z.string() });

export async function runAddModule(args: AddModuleArgs, output: CliOutput, cwd: string): Promise<number> {
	const root = workspaceRootAbove(cwd);
	const folder = `${LAYER_FOLDERS[args.layer]}/${args.name}`;
	refuseTaken(root, folder, args.name);
	const files = moduleFilesOf({
		name: args.name,
		placement: args.on,
		versions: versionsIn(root),
		license: siblingLicenseIn(root),
	});
	await writeModule(
		root,
		folder,
		files.map(({ at, text }) => ({ at: `${folder}/${at}`, text })),
	);
	const manifest = rootManifestWith(root, folder);
	fs.writeFileSync(path.join(root, "package.json"), manifest.text);
	await formatFiles(root, ["package.json"]);
	output.out(reportOf(folder, args, [...files.map(({ at }) => `  wrote ${folder}/${at}`), ...manifest.said]));
	return runGenerate({ modules: [folder], check: false }, output, root);
}

function refuseTaken(root: string, folder: string, name: string): void {
	if (fs.existsSync(path.join(root, folder))) {
		throw new CliRefusal(TAKEN_FOLDER.replace("{folder}", () => folder).replace("{name}", () => name));
	}

	const packageName = `@widgetarium/${name}`;
	const holder = packageFolderNamed(root, packageName);

	if (holder !== null) {
		throw new CliRefusal(TAKEN_PACKAGE.replace("{package}", () => packageName).replace("{folder}", () => holder));
	}
}

function versionsIn(root: string): PackageVersions {
	const manifest = CoreManifestSchema.safeParse(jsonAt(path.join(root, CORE_MANIFEST)));

	if (!manifest.success) {
		throw new CliRefusal(NO_CORE.replace("{file}", () => CORE_MANIFEST));
	}

	return {
		core: manifest.data.version,
		zod: manifest.data.dependencies.zod,
	};
}

function siblingLicenseIn(root: string): ModuleLicense | null {
	const licensed = Object.values(LAYER_FOLDERS)
		.flatMap((layer) => foldersIn(path.join(root, layer)))
		.flatMap((folder) => {
			const manifest = LicensedManifestSchema.safeParse(jsonAt(path.join(folder, "package.json")));
			return manifest.success ? [{ folder, id: manifest.data.license }] : [];
		})
		.find(({ folder }) => fs.existsSync(path.join(folder, LICENSE_FILE)));

	if (licensed === undefined) {
		return null;
	}

	return {
		id: licensed.id,
		text: fs.readFileSync(path.join(licensed.folder, LICENSE_FILE), "utf8"),
	};
}

function foldersIn(parent: string): string[] {
	if (!fs.existsSync(parent)) {
		return [];
	}

	return fs
		.readdirSync(parent, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(parent, entry.name))
		.sort();
}

async function writeModule(root: string, folder: string, files: readonly PlannedFile[]): Promise<void> {
	try {
		for (const file of files) {
			writeFile(path.join(root, file.at), file.text);
		}

		await formatFiles(
			root,
			files.map(({ at }) => at),
		);
	} catch (error) {
		fs.rmSync(path.join(root, folder), { recursive: true, force: true });
		throw error;
	}
}

function reportOf(folder: string, { name, on }: AddModuleArgs, lines: readonly string[]): string {
	return [
		`created ${folder}: module ${name}, on ${on}`,
		...lines,
		"next:",
		`  npm install, so @widgetarium/${name} resolves`,
		`  widgetarium add feature ${name}/<feature> [--query <Name>] [--command <Name>]`,
	].join("\n");
}
