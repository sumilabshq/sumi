import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { format, resolveConfig } from "prettier";
import { canvasSheet, withCanvasSheet } from "./canvas-sheet.mts";
import { studioSystemLayerOf, systemTokensOf, withStudioSystem, withSystemTokens } from "./system-sheet.mts";
import { REPO, writeBrowserStyles } from "./pack-engine.mts";
import { BOARD_SHEET } from "./sheet-paths.mts";

const BOARD_SHEET_FILE = path.join(REPO, BOARD_SHEET);

export async function layStudioSheets(): Promise<void> {
	await layBoardSheet();
	writeBrowserStyles();
}

async function layBoardSheet(): Promise<void> {
	const authored = readFileSync(BOARD_SHEET_FILE, "utf8");
	const withTokens = withSystemTokens(withStudioSystem(authored, studioSystemLayerOf(REPO)), systemTokensOf(REPO));
	const laid = await formatWithRepoConfig(withCanvasSheet(withTokens, await canvasSheet(REPO)), BOARD_SHEET_FILE);

	if (laid !== authored) {
		writeFileSync(BOARD_SHEET_FILE, laid);
	}
}

async function formatWithRepoConfig(text: string, filepath: string): Promise<string> {
	const config = await resolveConfig(filepath);
	return format(text, {
		...config,
		filepath,
	});
}

if (import.meta.main) {
	await layStudioSheets();
	console.log(`studio sheets laid: ${BOARD_SHEET}, apps/studio/dist/studio.css`);
}
