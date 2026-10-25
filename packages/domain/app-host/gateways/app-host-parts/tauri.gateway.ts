import { invoke } from "@tauri-apps/api/core";
import { studioWindowOf, viewFileOf } from "@widgetarium/behaviors";
import { GLOBAL_ROOT, HeldDoc, StoreClient, workspaceRootOf } from "@widgetarium/behaviors/tauri-store";
import type { DocKind } from "@widgetarium/behaviors/tauri-store";
import { COLUMN_OPENED_ON } from "../../shared/lib/tabs-column/column-look.js";
import { EssentialsDocSchema, TauriEssentialsGateway } from "../essentials/tauri.gateway.js";
import type { EssentialsDoc } from "../essentials/tauri.gateway.js";
import { KeptTabsDocSchema, TauriHostTabsGateway, WindowViewDocSchema } from "../host-tabs/tauri.gateway.js";
import type { KeptTabsDoc, WindowViewDoc } from "../host-tabs/tauri.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryShownViewGateway } from "../shown-view/memory.gateway.js";
import { KeptColumnDocSchema, TauriTabsColumnGateway } from "../tabs-column/tauri.gateway.js";
import type { KeptColumnDoc } from "../tabs-column/tauri.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";
import { STUDIO_OPENED_ON } from "./memory.gateway.js";

const SESSION_FILE = "session.json";

const TABS: DocKind<KeptTabsDoc> = {
	file: SESSION_FILE,
	v: 1,
	schema: KeptTabsDocSchema,
};

const ESSENTIALS: DocKind<EssentialsDoc> = {
	file: "essentials.json",
	v: 1,
	schema: EssentialsDocSchema,
};

// TRADE-OFF: a static import puts the Tauri invoke into the browser bundle too; export conditions would need a condition the test loader and the Vite configs do not set
export function tauriAppHostParts(workspaceId: string): AppHostParts {
	const store = new StoreClient(tauriInvoke);
	const root = workspaceRootOf(workspaceId);
	const studioWindow = studioWindowOf(location.search);
	const windowView = studioWindow.isMain
		? null
		: HeldDoc.read({ store, root, kind: windowViewOf(viewFileOf(studioWindow)), empty: WindowViewDocSchema.parse({}) });
	return {
		hostTabs: new TauriHostTabsGateway(
			HeldDoc.read({ store, root, kind: TABS, empty: KeptTabsDocSchema.parse({}) }),
			windowView,
		),
		essentials: new TauriEssentialsGateway(
			HeldDoc.read({ store, root: GLOBAL_ROOT, kind: ESSENTIALS, empty: EssentialsDocSchema.parse({}) }),
		),
		tabsColumn: new TauriTabsColumnGateway(
			HeldDoc.reading({ store, root, kind: columnOf(viewFileOf(studioWindow)), empty: KeptColumnDocSchema.parse({}) }),
			COLUMN_OPENED_ON,
		),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new DocumentPaneFlashGateway(),
	};
}

function columnOf(file: string): DocKind<KeptColumnDoc> {
	return {
		file,
		v: 1,
		schema: KeptColumnDocSchema,
	};
}

function windowViewOf(file: string): DocKind<WindowViewDoc> {
	return {
		file,
		v: 1,
		schema: WindowViewDocSchema,
	};
}

function tauriInvoke(command: string, args: Readonly<Record<string, unknown>>): Promise<unknown> {
	return invoke(command, args);
}
