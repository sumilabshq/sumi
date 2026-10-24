import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_FOLDERS: readonly string[] = [
	"apps",
	"packages/domain",
	"packages/state",
	"packages/shared",
	"packages/shared/packs",
];
const SOURCE = /\.(ts|tsx|mts|js|jsx|mjs)$/;

export function packagesWithCodeOutsideSrc(cwd: string): string[] {
	return PACKAGE_FOLDERS.flatMap((folder) => packagesIn(cwd, folder)).filter((root) => hasCodeOutsideSrc(cwd, root));
}

function packagesIn(cwd: string, folder: string): string[] {
	const absolute = join(cwd, folder);
	if (!existsSync(absolute)) return [];
	return readdirSync(absolute, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(absolute, entry.name, "package.json")))
		.map((entry) => `${folder}/${entry.name}`);
}

function hasCodeOutsideSrc(cwd: string, root: string): boolean {
	const absolute = join(cwd, root);
	if (!existsSync(join(absolute, "src"))) return true;
	return readdirSync(absolute).some((name) => SOURCE.test(name));
}
