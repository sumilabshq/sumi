import { spawn } from "node:child_process";
import path from "node:path";
import { canvasSheetSources } from "../../tools/canvas-sheet.mts";
import { REPO, SHEETS_LAYING } from "./project-vite.mts";

interface SheetWatcher {
	add(paths: readonly string[]): unknown;
	on(event: "change" | "add" | "unlink", heard: (file: string) => void): unknown;
}

const SYSTEMS_FOLDER = path.join(REPO, "design-systems") + path.sep;
const HOST_SHEET = path.join(REPO, "packages/shared/core/browser-host.css");
const SHEET = ".css";
const SETTLE_MS = 150;

export const relaysStudioSheets = {
	name: "relays-studio-sheets",
	apply: "serve" as const,
	configureServer({ watcher }: { watcher: SheetWatcher }): void {
		const sources = new Set([...canvasSheetSources(REPO), HOST_SHEET]);
		const relay = settledRelay();
		watcher.add([...sources, SYSTEMS_FOLDER]);
		const heard = (file: string): void => {
			if (sources.has(file) || (file.startsWith(SYSTEMS_FOLDER) && file.endsWith(SHEET))) {
				relay();
			}
		};
		watcher.on("change", heard);
		watcher.on("add", heard);
		watcher.on("unlink", heard);
	},
};

function settledRelay(): () => void {
	let settling: ReturnType<typeof setTimeout> | undefined;
	let isLaying = false;
	let isStale = false;
	const lay = (): void => {
		if (isLaying) {
			isStale = true;
			return;
		}

		isLaying = true;
		isStale = false;
		const settled = (failure: string | null): void => {
			isLaying = false;

			if (failure !== null) {
				console.error(`studio sheets not laid: ${failure}`);
			}

			if (isStale) {
				lay();
			}
		};
		spawn(process.execPath, SHEETS_LAYING, {
			cwd: REPO,
			stdio: "inherit",
		})
			.on("error", (failure) => settled(failure.message))
			.on("exit", (code) => settled(code === 0 ? null : `exit ${code}`));
	};
	return () => {
		clearTimeout(settling);
		settling = setTimeout(lay, SETTLE_MS);
	};
}
