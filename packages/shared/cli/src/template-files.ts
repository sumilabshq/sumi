import fs from "node:fs";
import path from "node:path";

const SKIPPED_FOLDER = "node_modules";

export function writeFile(at: string, text: string): void {
	fs.mkdirSync(path.dirname(at), { recursive: true });
	fs.writeFileSync(at, text);
}

export function filesUnder(folder: string, isWanted: (relative: string) => boolean): string[] {
	return relativeFilesUnder(folder, "").filter(isWanted).sort();
}

function relativeFilesUnder(folder: string, inside: string): string[] {
	return fs.readdirSync(path.join(folder, inside), { withFileTypes: true }).flatMap((entry) => {
		const relative = inside === "" ? entry.name : `${inside}/${entry.name}`;

		if (entry.isDirectory()) {
			return entry.name === SKIPPED_FOLDER ? [] : relativeFilesUnder(folder, relative);
		}

		return entry.isFile() ? [relative] : [];
	});
}
