import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export const FLUSH_BEFORE_QUIT_EVENT = "studio-flush-before-quit";
export const QUIT_SAVE_MS = 2500;

const QUIT_LISTENING = "plugin:studio-core|quit_listening";
const FLUSHED_BEFORE_QUIT = "plugin:studio-core|flushed_before_quit";
const PAGE_HIDDEN = "pagehide";

export type SaveForQuit = (untilMs: number) => Promise<readonly string[]>;

export interface QuitHearing {
	listen(event: string, heard: () => void): Promise<unknown>;
	tellListening(): Promise<unknown>;
	tellFlushed(isSaved: boolean): Promise<unknown>;
	readonly page: { addEventListener(event: string, heard: () => void): void };
	readonly now: () => number;
}

export async function savesBeforeQuit(
	saveForQuit: SaveForQuit,
	hearing: QuitHearing = tauriQuitHearing(),
): Promise<void> {
	await hearing.listen(FLUSH_BEFORE_QUIT_EVENT, () => void saveAndTell(saveForQuit, hearing));
	hearing.page.addEventListener(PAGE_HIDDEN, () => void saveForQuit(hearing.now() + QUIT_SAVE_MS));
	await hearing.tellListening();
	console.info("[ink] quit handshake none → listening");
}

async function saveAndTell(saveForQuit: SaveForQuit, hearing: QuitHearing): Promise<void> {
	const unsaved = await saveForQuit(hearing.now() + QUIT_SAVE_MS).catch((failure: unknown) => {
		console.error("[ink] quit asked → saving threw", failure);
		return ["everything: saving threw"];
	});

	if (unsaved.length > 0) {
		console.error(`[ink] quit asked → NOT saved before quitting: ${unsaved.join(", ")}`);
	} else {
		console.info("[ink] quit asked → everything saved");
	}

	await hearing.tellFlushed(unsaved.length === 0);
}

function tauriQuitHearing(): QuitHearing {
	return {
		listen: (event, heard) => getCurrentWebviewWindow().listen(event, heard),
		tellListening: () => invoke(QUIT_LISTENING),
		tellFlushed: (isSaved) => invoke(FLUSHED_BEFORE_QUIT, { isSaved }),
		page: window,
		now: Date.now,
	};
}
