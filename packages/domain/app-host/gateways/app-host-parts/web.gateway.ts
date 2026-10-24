import { COLUMN_OPENED_ON } from "../../shared/lib/tabs-column/column-look.js";
import { LocalStorageEssentialsGateway } from "../essentials/local-storage.gateway.js";
import { MemoryHostTabsGateway } from "../host-tabs/memory.gateway.js";
import { DocumentPaneFlashGateway } from "../pane-flash/document.gateway.js";
import { MemoryShownViewGateway } from "../shown-view/memory.gateway.js";
import { LocalStorageTabsColumnGateway } from "../tabs-column/local-storage.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";
import { STUDIO_OPENED_ON } from "./memory.gateway.js";

export function webAppHostParts(workspaceId: string): AppHostParts {
	return {
		hostTabs: new MemoryHostTabsGateway(null),
		essentials: new LocalStorageEssentialsGateway(),
		tabsColumn: new LocalStorageTabsColumnGateway(workspaceId, COLUMN_OPENED_ON),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new DocumentPaneFlashGateway(),
	};
}
