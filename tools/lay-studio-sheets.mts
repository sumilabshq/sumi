import { layCanvasSheet } from "../packages/host-obsidian/build.mts";
import { writeBrowserStyles } from "./pack-engine.mts";

export async function layStudioSheets(): Promise<void> {
	await layCanvasSheet();
	writeBrowserStyles();
}

if (import.meta.main) {
	await layStudioSheets();
	console.log("studio sheets laid: packages/host-obsidian/styles.css, apps/studio/dist/studio.css");
}
