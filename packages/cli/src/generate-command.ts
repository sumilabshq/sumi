import fs from "node:fs";
import path from "node:path";
import type { GenerateArgs } from "./cli-args.js";
import type { CliOutput } from "./cli-output.js";
import { generatedPackagesIn } from "@widgetarium/eslint-plugin/workspace";
import { generatedPackageOf } from "./module-entry.js";

interface ModuleEntry {
	readonly module: string;
	readonly entry: string;
	readonly file: string;
	readonly text: string | null;
}

const STALE = "{module}/{entry} is not what widgetarium generate writes; run it, never edit the file by hand";
const STRAY = "{module}/{entry} is a file generate no longer writes; run it to remove the file";
const NO_MODULES = 'no module found: name a module folder, or mark one with widgetarium.level "domain" or "client"';

export function runGenerate({ modules, check }: GenerateArgs, output: CliOutput, cwd: string): number {
	const named = modules.length > 0 ? modules : generatedPackagesIn(cwd);
	if (named.length === 0) {
		output.out(NO_MODULES);
		return 0;
	}
	const drifted = named.flatMap((module) => entriesOf(cwd, module)).filter(isDrifted);
	if (check) return staleReported(drifted, output);
	for (const entry of drifted) writeEntry(entry, output);
	return 0;
}

function entriesOf(cwd: string, module: string): ModuleEntry[] {
	const folder = path.resolve(cwd, module);
	const { files, strays } = generatedPackageOf(folder, module);
	return [
		...files.map(({ entry, text }) => ({ module, entry, file: path.join(folder, entry), text })),
		...strays.map((entry) => ({ module, entry, file: path.join(folder, entry), text: null })),
	];
}

function isDrifted({ file, text }: ModuleEntry): boolean {
	if (text === null) {
		return true;
	}

	return !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text;
}

function staleReported(drifted: readonly ModuleEntry[], output: CliOutput): number {
	for (const { module, entry, text } of drifted) {
		output.err((text === null ? STRAY : STALE).replace("{module}", module).replace("{entry}", entry));
	}

	return drifted.length === 0 ? 0 : 1;
}

function writeEntry({ module, entry, file, text }: ModuleEntry, output: CliOutput): void {
	if (text === null) {
		fs.rmSync(file);
		output.out(`removed ${module}/${entry}`);
		return;
	}

	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, text);
	output.out(`wrote ${module}/${entry}`);
}
