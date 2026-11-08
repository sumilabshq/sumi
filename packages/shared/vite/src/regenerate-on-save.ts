import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type WatchedChange = "add" | "change" | "unlink";

export interface WatchingServer {
	readonly watcher: {
		on(change: WatchedChange, listener: (file: string) => void): unknown;
	};
}

export interface Regeneration {
	readonly root: string;
	readonly folder: string;
	readonly file: string;
}

export type GenerateRun = (regeneration: Regeneration, finished: () => void) => void;

interface GenerateCommand {
	readonly command: string;
	readonly args: readonly string[];
}

const GENERATED_FROM =
	/(\/requests\.tsx?|\.events\.ts|\/module\.ts|\/plugin\.ts|\/slots\.ts|\/shared\/schema\/[^/]+\.schema\.ts)$/;
const GENERATED_FOLDER = `${path.sep}generated${path.sep}`;
const GENERATED_FOLDERS: readonly string[] = ["generated", path.join("src", "generated")];
const CONTRACT_LIST_FILE = "sumi-contract.json";
const SETTLE_MS = 150;
const WATCHED_CHANGES: readonly WatchedChange[] = ["add", "change", "unlink"];
const GENERATE_SCRIPT = "widgetarium";
const REGENERATED = "[widgetarium] regenerated {folder} after {file} changed";
const NOT_REGENERATED = "[widgetarium] generate refused {folder} after {file} changed:\n{said}";
const NOT_JSON = "[widgetarium] {file} is not JSON, so regenerate on save skips it: {reason}";

export class GenerateRuns {
	private readonly running = new Map<string, Regeneration | null>();

	constructor(private readonly run: GenerateRun) {}

	request(regeneration: Regeneration): void {
		const key = keyOf(regeneration);

		if (this.running.has(key)) {
			this.running.set(key, regeneration);
			return;
		}

		this.start(regeneration);
	}

	private start(regeneration: Regeneration): void {
		const key = keyOf(regeneration);
		this.running.set(key, null);
		this.run(regeneration, () => this.finish(key));
	}

	private finish(key: string): void {
		const queued = this.running.get(key) ?? null;
		this.running.delete(key);

		if (queued !== null) {
			this.start(queued);
		}
	}
}

export function regenerateOnSave(server: WatchingServer): void {
	const runs = new GenerateRuns(regenerate);
	const settling = new Map<string, ReturnType<typeof setTimeout>>();
	const regenerateSoon = (regeneration: Regeneration): void => {
		const key = keyOf(regeneration);
		clearTimeout(settling.get(key));
		settling.set(
			key,
			setTimeout(() => {
				settling.delete(key);
				runs.request(regeneration);
			}, SETTLE_MS),
		);
	};

	for (const change of WATCHED_CHANGES) {
		server.watcher.on(change, (file) => regenerationsOf(file).forEach(regenerateSoon));
	}
}

export function regenerationsOf(file: string): readonly Regeneration[] {
	if (!GENERATED_FROM.test(file.split(path.sep).join("/")) || file.includes(GENERATED_FOLDER)) {
		return [];
	}

	const folder = folderHolding(path.dirname(file), (manifest) => "name" in manifest);
	const root = folder === null ? null : folderHolding(folder, (manifest) => "workspaces" in manifest);

	if (folder === null || root === null || folder === root || !isGenerated(folder)) {
		return [];
	}

	return [folder, ...contractPackagesListing(root, path.basename(folder))].map((target) => ({
		root,
		folder: path.relative(root, target),
		file: path.relative(root, file),
	}));
}

function keyOf({ root, folder }: Regeneration): string {
	return path.join(root, folder);
}

function isGenerated(folder: string): boolean {
	return GENERATED_FOLDERS.some((generated) => fs.existsSync(path.join(folder, generated)));
}

function contractPackagesListing(root: string, module: string): readonly string[] {
	return workspacesOf(root)
		.flatMap((pattern) => fs.globSync(path.join(pattern, CONTRACT_LIST_FILE), { cwd: root }))
		.filter((listFile) => listedModulesIn(path.join(root, listFile)).includes(module))
		.map((listFile) => path.join(root, path.dirname(listFile)));
}

function workspacesOf(root: string): readonly string[] {
	const manifest = manifestIn(root);
	const workspaces = manifest !== null && "workspaces" in manifest ? manifest.workspaces : null;
	return Array.isArray(workspaces) ? workspaces.filter((pattern) => typeof pattern === "string") : [];
}

function listedModulesIn(listFile: string): readonly unknown[] {
	const listed = jsonIn(listFile);
	const modules = listed !== null && "modules" in listed ? listed.modules : null;
	return Array.isArray(modules) ? modules : [];
}

function folderHolding(from: string, isWanted: (manifest: object) => boolean): string | null {
	const manifest = manifestIn(from);

	if (manifest !== null && isWanted(manifest)) {
		return from;
	}

	const parent = path.dirname(from);
	return parent === from ? null : folderHolding(parent, isWanted);
}

function manifestIn(folder: string): object | null {
	return jsonIn(path.join(folder, "package.json"));
}

function jsonIn(file: string): object | null {
	if (!fs.existsSync(file)) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch (failure) {
		console.warn(fill(NOT_JSON, { file, reason: failure instanceof Error ? failure.message : String(failure) }));
		return null;
	}
}

function regenerate(regeneration: Regeneration, finished: () => void): void {
	const { root, folder, file } = regeneration;
	const { command, args } = generateCommandIn(root, folder);
	execFile(command, args, { cwd: root }, (failure, stdout, stderr) => {
		finished();
		const said = { folder, file };

		if (failure === null) {
			console.info(fill(REGENERATED, said));
			return;
		}

		console.error(fill(NOT_REGENERATED, { ...said, said: `${stdout}${stderr}`.trim() }));
	});
}

function generateCommandIn(root: string, folder: string): GenerateCommand {
	const manifest = manifestIn(root);
	const scripts = manifest !== null && "scripts" in manifest ? manifest.scripts : null;

	if (typeof scripts === "object" && scripts !== null && GENERATE_SCRIPT in scripts) {
		return {
			command: "npm",
			args: ["run", "-s", GENERATE_SCRIPT, "--", "generate", folder],
		};
	}

	return {
		command: "npx",
		args: ["--no-install", "widgetarium", "generate", folder],
	};
}

function fill(template: string, values: Readonly<Record<string, string>>): string {
	return Object.entries(values).reduce((said, [key, value]) => said.replaceAll(`{${key}}`, value), template);
}
