import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const FLUSH_BEFORE_QUIT_EVENT = "studio-flush-before-quit";

const FLUSHED_BEFORE_QUIT = "plugin:studio-core|flushed_before_quit";
const PAGE_HIDDEN = "pagehide";

export interface QuitHearing {
	listen(event: string, heard: () => void): void;
	tellFlushed(): Promise<unknown>;
	readonly page: { addEventListener(event: string, heard: () => void): void };
}

export function savesBeforeQuit(flushAll: () => Promise<void>, hearing: QuitHearing = tauriQuitHearing()): void {
	hearing.listen(FLUSH_BEFORE_QUIT_EVENT, () => void flushAndTell(flushAll, hearing));
	hearing.page.addEventListener(PAGE_HIDDEN, () => void flushAll());
}

async function flushAndTell(flushAll: () => Promise<void>, hearing: QuitHearing): Promise<void> {
	try {
		await flushAll();
		console.info("[ink] quit asked → everything saved");
	} catch (failure: unknown) {
		console.error("[ink] quit asked → saving failed, the app quits anyway", failure);
	}

	await hearing.tellFlushed();
}

function tauriQuitHearing(): QuitHearing {
	return {
		listen: (event, heard) => void getCurrentWebviewWindow().listen(event, heard),
		tellFlushed: () => invoke(FLUSHED_BEFORE_QUIT),
		page: window,
	};
}
