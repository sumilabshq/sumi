import { COLUMN_OPENED_ON } from "../../shared/lib/tabs-column/column-look.js";
import type { StudioView } from "../../shared/schema/studio-view.schema.js";
import { MemoryEssentialsGateway } from "../essentials/memory.gateway.js";
import { NoPaneFlashGateway } from "../pane-flash/none.gateway.js";
import { MemoryShownViewGateway } from "../shown-view/memory.gateway.js";
import { MemoryStudioWindowGateway } from "../studio-window/memory.gateway.js";
import { MemoryTabsColumnGateway } from "../tabs-column/memory.gateway.js";
import type { AppHostParts } from "./app-host-parts.gateway.js";

export const STUDIO_OPENED_ON: StudioView = "canvas";

export function memoryAppHostParts(): AppHostParts {
	return {
		studioWindow: new MemoryStudioWindowGateway(),
		essentials: new MemoryEssentialsGateway(null),
		tabsColumn: new MemoryTabsColumnGateway(COLUMN_OPENED_ON),
		shownView: new MemoryShownViewGateway(STUDIO_OPENED_ON),
		paneFlash: new NoPaneFlashGateway(),
	};
}
