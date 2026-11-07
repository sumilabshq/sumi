import fs from "node:fs";
import path from "node:path";
import type { PlannedFile } from "./add-plan.js";
import type { AddFeatureArgs } from "./scaffold-args.js";
import { CliRefusal, type CliOutput } from "./cli-output.js";
import { checkFileOf, checkTextOf } from "./feature-check-file.js";
import { featureFilesOf, featureNamesOf, requestNamesOf } from "./feature-files.js";
import { pickerWired, placementIn } from "./feature-wiring.js";
import { runGenerate } from "./generate-command.js";
import { pickerPathOf } from "./module-files.js";
import { formatFiles } from "./project-format.js";
import { writeFile } from "./template-files.js";
import { moduleFolderIn, workspaceRootAbove } from "./workspace-root.js";

interface FeatureTarget {
	readonly root: string;
	readonly folder: string;
	readonly moduleFile: PlannedFile;
	readonly args: AddFeatureArgs;
}

const TAKEN_FEATURE = "{folder}/features/{feature} already exists: pick another feature name";
const TAKEN_FILE = "{file} already exists, and add feature never writes over a file: pick another feature name";
const NO_PICKER =
	"{file} is missing: add feature wires the gateway into the module's parts there, as widgetarium add module lays it";
const LOADER_RUN = "node --single-threaded --import ./tools/loader/register.mts";

export async function runAddFeature(args: AddFeatureArgs, output: CliOutput, cwd: string): Promise<number> {
	const root = workspaceRootAbove(cwd);
	const folder = moduleFolderIn(root, args.module);
	const moduleAt = `${folder}/module.ts`;
	const target = {
		root,
		folder,
		args,
		moduleFile: {
			at: moduleAt,
			text: fs.readFileSync(path.join(root, moduleAt), "utf8"),
		},
	};
	const created = createdFilesOf(target);
	refuseTaken(target, created);
	const edited = editedFilesOf(target);
	await writeFeature(root, created, edited);
	output.out(reportOf(args, created, edited));
	return runGenerate({ modules: [folder], check: false }, output, root);
}

function createdFilesOf({ folder, moduleFile, args }: FeatureTarget): PlannedFile[] {
	const check = {
		at: checkFileOf(args.module, args.feature),
		text: checkTextOf({ module: args.module, folder, placement: placementIn(moduleFile), seed: args }),
	};
	return [...featureFilesOf(args).map(({ at, text }) => ({ at: `${folder}/${at}`, text })), check];
}

function editedFilesOf({ root, folder, args }: FeatureTarget): PlannedFile[] {
	const picker = pickerAt(root, `${folder}/${pickerPathOf(args.module)}`);
	return [{ at: picker.at, text: pickerWired({ ...picker, module: args.module }, featureNamesOf(args.feature)) }];
}

function refuseTaken({ root, folder, args }: FeatureTarget, created: readonly PlannedFile[]): void {
	if (fs.existsSync(path.join(root, folder, "features", args.feature))) {
		throw new CliRefusal(TAKEN_FEATURE.replace("{folder}", () => folder).replace("{feature}", () => args.feature));
	}

	const taken = created.find(({ at }) => fs.existsSync(path.join(root, at)));

	if (taken !== undefined) {
		throw new CliRefusal(TAKEN_FILE.replace("{file}", () => taken.at));
	}
}

function pickerAt(root: string, file: string): PlannedFile {
	const at = path.join(root, file);

	if (!fs.existsSync(at)) {
		throw new CliRefusal(NO_PICKER.replace("{file}", () => file));
	}

	return {
		at: file,
		text: fs.readFileSync(at, "utf8"),
	};
}

async function writeFeature(
	root: string,
	created: readonly PlannedFile[],
	edited: readonly PlannedFile[],
): Promise<void> {
	const originals = edited.map(({ at }) => ({ at, text: fs.readFileSync(path.join(root, at), "utf8") }));
	const written = [...created, ...edited];

	try {
		for (const file of written) {
			writeFile(path.join(root, file.at), file.text);
		}

		await formatFiles(
			root,
			written.map(({ at }) => at),
		);
	} catch (error) {
		undoFeature(root, created, originals);
		throw error;
	}
}

function undoFeature(root: string, created: readonly PlannedFile[], originals: readonly PlannedFile[]): void {
	for (const { at } of created) {
		fs.rmSync(path.join(root, at), { force: true });
		removeIfEmpty(path.dirname(path.join(root, at)));
	}

	for (const { at, text } of originals) {
		fs.writeFileSync(path.join(root, at), text);
	}
}

function removeIfEmpty(folder: string): void {
	if (fs.existsSync(folder) && fs.readdirSync(folder).length === 0) {
		fs.rmdirSync(folder);
	}
}

function reportOf(args: AddFeatureArgs, created: readonly PlannedFile[], edited: readonly PlannedFile[]): string {
	return [
		`added feature ${args.feature} to module ${args.module}: ${requestNamesOf(args).join(", ")}`,
		...created.map(({ at }) => `  wrote ${at}`),
		...edited.map(({ at }) => `  edited ${at}`),
		"next:",
		`  ${LOADER_RUN} ${checkFileOf(args.module, args.feature)}`,
		"  replace the example names list with the feature's data, and the memory gateway with real storage per platform",
	].join("\n");
}
