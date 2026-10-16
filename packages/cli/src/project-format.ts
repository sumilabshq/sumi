import fs from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import { filesUnder } from "./template-files.js";

const PRETTIER_IGNORE = ".prettierignore";

export async function formatProject(target: string): Promise<void> {
	const ignorePath = path.join(target, PRETTIER_IGNORE);
	for (const relative of filesUnder(target, () => true)) await formatFile(path.join(target, relative), ignorePath);
}

async function formatFile(file: string, ignorePath: string): Promise<void> {
	const info = await prettier.getFileInfo(file, { ignorePath });
	if (info.ignored || info.inferredParser === null) return;
	const options = await prettier.resolveConfig(file);
	const text = fs.readFileSync(file, "utf8");
	const formatted = await prettier.format(text, { ...options, filepath: file });
	if (formatted !== text) fs.writeFileSync(file, formatted);
}
