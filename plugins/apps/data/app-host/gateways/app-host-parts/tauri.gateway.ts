import { studioWindowOf } from "@widgetarium/behaviors";
import { GLOBAL_ROOT, HeldDoc } from "@widgetarium/behaviors/tauri-store";
import type { DocKind, StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { CoreChanges } from "../../shared/host/app-host.host.js";
import { LentCoreChangesGateway } from "../core-changes/lent.gateway.js";
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

export function tauriAppHostParts(store: StoreClient, coreChanges: CoreChanges): AppHostParts {
	const studioWindow = studioWindowOf(location.search);
	return {
		studioWindow: new TauriStudioWindowGateway(studioWindow),
		essentials: new TauriEssentialsGateway(
			HeldDoc.read({ store, root: GLOBAL_ROOT, kind: ESSENTIALS, empty: EssentialsDocSchema.parse({}) }),
		),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new DocumentPaneFlashGateway(),
		coreChanges: new LentCoreChangesGateway(coreChanges),
	};
}
