import { invoke } from "@tauri-apps/api/core";
import { studioWindowOf } from "@widgetarium/behaviors";
import { GLOBAL_ROOT, HeldDoc, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import { EssentialsDocSchema, TauriEssentialsGateway } from "../essentials/tauri.gateway.js";
import type { EssentialsDoc } from "../essentials/tauri.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryShownViewGateway } from "../shown-view/memory.gateway.js";
import { TauriStudioWindowGateway } from "../studio-window/tauri.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";
import { STUDIO_OPENED_ON } from "./memory.gateway.js";

const ESSENTIALS: DocKind<EssentialsDoc> = {
	file: "essentials.json",
	v: 1,
	schema: EssentialsDocSchema,
};

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too; export conditions would need a condition the test loader and the Vite configs do not set
export function tauriAppHostParts(): AppHostParts {
	const store = new StoreClient(tauriInvoke);
	const studioWindow = studioWindowOf(location.search);
	return {
		studioWindow: new TauriStudioWindowGateway(studioWindow),
		essentials: new TauriEssentialsGateway(
			HeldDoc.read({ store, root: GLOBAL_ROOT, kind: ESSENTIALS, empty: EssentialsDocSchema.parse({}) }),
		),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new DocumentPaneFlashGateway(),
	};
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
