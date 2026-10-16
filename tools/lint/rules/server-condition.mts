import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { findingOnLine, type Finding } from "../finding.mts";
import type { FileReport } from "../report.mts";

export const id = "server-condition";

const SERVER_CONDITION = "server";
const SERVER_APP = "apps/server/";
const TSCONFIG_FILE = /^tsconfig(\.[\w-]+)?\.json$/;
const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "generated"]);

const CONDITION_OUTSIDE_SERVER =
	"only apps/server resolves the server condition; a tsconfig elsewhere that sets it lets client code reach a server module";

export function check(): Finding[] {
	return [];
}

export function checkConfigs(roots: readonly string[], cwd: string): FileReport[] {
	return roots
		.flatMap((root) => tsconfigsUnder(join(cwd, root)))
		.map((file) => relative(cwd, file).split(sep).join("/"))
		.filter((path) => !path.startsWith(SERVER_APP) && setsServerCondition(join(cwd, path)))
		.map((path) => ({ path, findings: [findingOnLine(id, "error", 1, CONDITION_OUTSIDE_SERVER)] }));
}

function setsServerCondition(file: string): boolean {
	const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
	const options: unknown = Reflect.get(Object(parsed), "compilerOptions");
	const conditions: unknown = Reflect.get(Object(options), "customConditions");
	return Array.isArray(conditions) && conditions.includes(SERVER_CONDITION);
}

function tsconfigsUnder(folder: string): string[] {
	if (!existsSync(folder)) return [];
	if (!statSync(folder).isDirectory()) return TSCONFIG_FILE.test(basename(folder)) ? [folder] : [];
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name.startsWith(".") || SKIPPED_FOLDERS.has(entry.name)) return [];
		const path = join(folder, entry.name);
		if (entry.isDirectory()) return tsconfigsUnder(path);
		return TSCONFIG_FILE.test(entry.name) ? [path] : [];
	});
}
