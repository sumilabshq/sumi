import fs from "node:fs";
import path from "node:path";

export function writeFile(at: string, text: string): void {
	fs.mkdirSync(path.dirname(at), { recursive: true });
	fs.writeFileSync(at, text);
}

export function filesUnder(folder: string, isWanted: (relative: string) => boolean): string[] {
	return fs
		.readdirSync(folder, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(folder, path.join(entry.parentPath, entry.name)))
		.filter(isWanted)
		.sort();
}
