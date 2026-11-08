import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type WatchedChange = "add" | "change" | "unlink";

export interface WatchingServer {
	readonly watcher: {
		on(change: WatchedChange, listener: (file: string) => void): unknown;
	};
}

interface GenerateCommand {
	readonly command: string;
	readonly args: readonly string[];
}

interface Regeneration {
	readonly root: string;
	readonly folder: string;
}

const GENERATED_FROM = /(\/requests\.tsx?|\.events\.ts|\/module\.ts|\/plugin\.ts|\/slots\.ts)$/;
const GENERATED_FOLDER = `${path.sep}generated${path.sep}`;
const SETTLE_MS = 150;
const WATCHED_CHANGES: readonly WatchedChange[] = ["add", "change", "unlink"];
const GENERATE_SCRIPT = "widgetarium";
const REGENERATED = "[widgetarium] regenerated {folder} after {file} changed";
const NOT_REGENERATED = "[widgetarium] generate refused {folder} after {file} changed:\n{said}";

export function regenerateOnSave(server: WatchingServer): void {
	const settling = new Map<string, ReturnType<typeof setTimeout>>();
	const regenerateSoon = (file: string): void => {
		const regeneration = regenerationOf(file);

		if (regeneration === null) {
			return;
		}

		const key = path.join(regeneration.root, regeneration.folder);
		clearTimeout(settling.get(key));
		settling.set(
			key,
			setTimeout(() => {
				settling.delete(key);
				regenerate(regeneration, path.relative(regeneration.root, file));
			}, SETTLE_MS),
		);
	};

	for (const change of WATCHED_CHANGES) {
		server.watcher.on(change, regenerateSoon);
	}
}

function regenerationOf(file: string): Regeneration | null {
	if (!GENERATED_FROM.test(file.split(path.sep).join("/")) || file.includes(GENERATED_FOLDER)) {
		return null;
	}

	const folder = folderHolding(path.dirname(file), (manifest) => "name" in manifest);
	const root = folder === null ? null : folderHolding(folder, (manifest) => "workspaces" in manifest);

	if (folder === null || root === null || folder === root) {
		return null;
	}

	return {
		root,
		folder: path.relative(root, folder),
	};
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
	const file = path.join(folder, "package.json");

	if (!fs.existsSync(file)) {
		return null;
	}

	const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
	return typeof parsed === "object" && parsed !== null ? parsed : null;
}

function regenerate({ root, folder }: Regeneration, file: string): void {
	const { command, args } = generateCommandIn(root, folder);
	execFile(command, args, { cwd: root }, (failure, stdout, stderr) => {
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
