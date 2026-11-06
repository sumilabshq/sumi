import fs from "node:fs";
import path from "node:path";
import { TAILWIND_BANNER } from "./canvas-sheet.mts";
import { studioSplitOf } from "./studio-sheet.mts";
import { BROWSER_SHEET_SOURCES } from "./sheet-paths.mts";

export interface BrowserSheets {
	readonly app: string;
	readonly studio: string;
}

export function browserSheetsOf(root: string): BrowserSheets {
	const [host = "", board = ""] = BROWSER_SHEET_SOURCES.map((at) => fs.readFileSync(path.join(root, at), "utf8"));
	const [authored = "", canvas = ""] = board.split(TAILWIND_BANNER);
	const { app, studio } = studioSplitOf(`${host}\n${authored}`);
	return {
		app,
		studio: canvas === "" ? studio : `${studio}\n${TAILWIND_BANNER}${canvas}`,
	};
}
