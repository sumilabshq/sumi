import { layCanvasSheet } from "../apps/host-obsidian/build.mts";
import { writeBrowserStyles } from "./pack-engine.mts";

export async function layStudioSheets(): Promise<void> {
	await layCanvasSheet();
	writeBrowserStyles();
}

if (import.meta.main) {
	await layStudioSheets();
	console.log("studio sheets laid: apps/host-obsidian/styles.css, apps/studio/dist/studio.css");
}
